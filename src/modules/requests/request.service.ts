import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AppError, ErrorCodes } from "@/lib/errors";
import { REQUEST_STATUS, canTransition, type RequestStatus } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";
import { notify, notifyAdmins } from "@/lib/notify";

// Fields whose change after approval requires re-approval (spec §13).
export const MATERIAL_FIELDS = [
  "startDateTime",
  "endDateTime",
  "passengerCount",
  "destination",
  "requestedVehicleTypeId",
  "purpose",
] as const;

export const passengerSchema = z.object({
  name: z.string().min(1, "Passenger name is required"),
  pickupLocation: z.string().min(1, "Pickup location is required"),
  destination: z.string().optional().nullable(),
  specialInstructions: z.string().optional().nullable(),
});

export const createRequestSchema = z.object({
  purpose: z.string().min(1, "Purpose is required"),
  startDateTime: z.coerce.date(),
  endDateTime: z.coerce.date(),
  requestedVehicleTypeId: z.string().min(1),
  destination: z.string().min(1, "Destination is required"),
  specialInstructions: z.string().optional().nullable(),
  passengers: z.array(passengerSchema).min(1, "At least one passenger is required"),
});

const requestInclude = {
  requester: { select: { id: true, name: true, email: true, phone: true, employeeId: true, department: true, designation: true } },
  requestedType: true,
  assignedType: true,
  passengers: { orderBy: { sortOrder: "asc" as const } },
  approvals: { orderBy: { createdAt: "asc" as const }, include: { actor: { select: { id: true, name: true } } } },
  vehicleBookings: { include: { vehicle: true }, orderBy: { createdAt: "desc" as const } },
  driverAssignments: { include: { driver: { select: { id: true, name: true, phone: true } } }, orderBy: { createdAt: "desc" as const } },
} as const;

export async function createRequest(data: z.infer<typeof createRequestSchema>, requester: { id: string; name: string }) {
  const parsed = createRequestSchema.parse(data);

  if (parsed.endDateTime <= parsed.startDateTime) {
    throw new AppError("End time must be after start time", 400, ErrorCodes.VALIDATION);
  }

  const type = await prisma.vehicleType.findUnique({ where: { id: parsed.requestedVehicleTypeId } });
  if (!type || !type.active) throw new AppError("Requested vehicle type not found", 404, ErrorCodes.NOT_FOUND);

  const passengerCount = parsed.passengers.length;
  if (passengerCount > type.capacity) {
    throw new AppError(
      `Passenger count (${passengerCount}) exceeds ${type.name} capacity (${type.capacity}). Choose a larger vehicle type.`,
      400,
      ErrorCodes.CAPACITY_EXCEEDED,
    );
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const key = `TR-${year}`;

  const request = await prisma.$transaction(async (tx) => {
    const seq = await tx.sequence.upsert({
      where: { key },
      create: { key, value: 1 },
      update: { value: { increment: 1 } },
    });
    const requestNumber = `TR-${year}-${String(seq.value).padStart(5, "0")}`;

    return tx.transportRequest.create({
      data: {
        requestNumber,
        requesterId: requester.id,
        purpose: parsed.purpose,
        startDateTime: parsed.startDateTime,
        endDateTime: parsed.endDateTime,
        requestedVehicleTypeId: parsed.requestedVehicleTypeId,
        passengerCount,
        destination: parsed.destination,
        specialInstructions: parsed.specialInstructions ?? null,
        status: REQUEST_STATUS.PENDING,
        passengers: {
          create: parsed.passengers.map((p, i) => ({
            name: p.name,
            pickupLocation: p.pickupLocation,
            destination: p.destination ?? null,
            specialInstructions: p.specialInstructions ?? null,
            sortOrder: i,
          })),
        },
      },
      include: requestInclude,
    });
  });

  await writeAudit({
    actorId: requester.id,
    actorKind: "USER",
    actorName: requester.name,
    action: "REQUEST_CREATED",
    entityType: "TransportRequest",
    entityId: request.id,
    newData: { requestNumber: request.requestNumber, purpose: request.purpose },
  });
  await notify({ userId: requester.id, type: "REQUEST_CREATED", title: "Request submitted", message: `Your request ${request.requestNumber} was submitted and is pending approval.`, refType: "REQUEST", refId: request.id });
  await notifyAdmins({ type: "REQUEST_PENDING", title: "New request awaiting approval", message: `Request ${request.requestNumber} from ${requester.name} is pending approval.`, refType: "REQUEST", refId: request.id });

  return request;
}

export async function getRequest(id: string) {
  const request = await prisma.transportRequest.findUnique({ where: { id }, include: requestInclude });
  if (!request) throw new AppError("Request not found", 404, ErrorCodes.NOT_FOUND);
  return request;
}

export async function listRequests(filters: {
  requesterId?: string;
  status?: string;
  q?: string;
  vehicleTypeId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters.requesterId) where.requesterId = filters.requesterId;
  if (filters.status) where.status = filters.status;
  if (filters.vehicleTypeId) where.requestedVehicleTypeId = filters.vehicleTypeId;
  if (filters.q) where.requestNumber = { contains: filters.q };
  if (filters.from || filters.to) {
    where.startDateTime = {};
    if (filters.from) (where.startDateTime as Record<string, unknown>).gte = filters.from;
    if (filters.to) (where.startDateTime as Record<string, unknown>).lte = filters.to;
  }

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const [total, items] = await Promise.all([
    prisma.transportRequest.count({ where }),
    prisma.transportRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        requester: { select: { id: true, name: true, email: true, department: true } },
        requestedType: true,
        assignedType: true,
        vehicleBookings: { where: { status: "ACTIVE" }, include: { vehicle: true } },
        driverAssignments: { where: { status: "ACTIVE" }, include: { driver: { select: { id: true, name: true } } } },
      },
    }),
  ]);
  return { total, page, pageSize, items };
}

export interface RequestEdit {
  purpose?: string;
  startDateTime?: Date;
  endDateTime?: Date;
  requestedVehicleTypeId?: string;
  destination?: string;
  specialInstructions?: string | null;
  passengers?: z.infer<typeof passengerSchema>[];
}

// Edit a request. Material changes to an approved/assigned request trigger
// re-approval (spec §13). Non-material edits are allowed freely on PENDING.
export async function editRequest(
  id: string,
  data: RequestEdit,
  actor: { id: string; name: string; role: string },
) {
  const existing = await prisma.transportRequest.findUnique({ where: { id } });
  if (!existing) throw new AppError("Request not found", 404, ErrorCodes.NOT_FOUND);

  const isRequester = existing.requesterId === actor.id;
  const isAdmin = actor.role === "ADMIN";
  if (!isRequester && !isAdmin) throw new AppError("Not authorized", 403, ErrorCodes.FORBIDDEN);

  const editable: RequestStatus[] = [REQUEST_STATUS.PENDING, REQUEST_STATUS.APPROVED, REQUEST_STATUS.ASSIGNED];
  if (!editable.includes(existing.status as RequestStatus)) {
    throw new AppError(`Cannot edit a request in ${existing.status} status`, 400, ErrorCodes.INVALID_TRANSITION);
  }

  // Detect material changes.
  const materialChanged =
    (data.startDateTime && data.startDateTime.getTime() !== existing.startDateTime.getTime()) ||
    (data.endDateTime && data.endDateTime.getTime() !== existing.endDateTime.getTime()) ||
    (data.destination && data.destination !== existing.destination) ||
    (data.requestedVehicleTypeId && data.requestedVehicleTypeId !== existing.requestedVehicleTypeId) ||
    (data.purpose && data.purpose !== existing.purpose) ||
    (data.passengers !== undefined && data.passengers.length !== existing.passengerCount);

  const requiresReapproval = materialChanged && existing.status !== REQUEST_STATUS.PENDING;

  const passengers = data.passengers;
  if (passengers) {
    const type = await prisma.vehicleType.findUnique({
      where: { id: data.requestedVehicleTypeId ?? existing.requestedVehicleTypeId },
    });
    if (type && passengers.length > type.capacity) {
      throw new AppError(`Passenger count exceeds ${type.name} capacity (${type.capacity})`, 400, ErrorCodes.CAPACITY_EXCEEDED);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (requiresReapproval) {
      // Release any active assignment (spec §13).
      await tx.vehicleBooking.updateMany({
        where: { requestId: id, status: "ACTIVE" },
        data: { status: "RELEASED" },
      });
      await tx.driverAssignment.updateMany({
        where: { requestId: id, status: "ACTIVE" },
        data: { status: "RELEASED" },
      });
    }

    const request = await tx.transportRequest.update({
      where: { id },
      data: {
        purpose: data.purpose,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        requestedVehicleTypeId: data.requestedVehicleTypeId,
        destination: data.destination,
        specialInstructions: data.specialInstructions,
        passengerCount: passengers ? passengers.length : undefined,
        ...(requiresReapproval
          ? {
              status: REQUEST_STATUS.PENDING,
              approvedBy: null,
              approvedAt: null,
              approvalComment: null,
              assignedVehicleTypeId: null,
              alternativeReason: null,
              alternativeExplanation: null,
            }
          : {}),
      },
      include: requestInclude,
    });

    if (passengers) {
      await tx.passenger.deleteMany({ where: { requestId: id } });
      await tx.passenger.createMany({
        data: passengers.map((p, i) => ({
          requestId: id,
          name: p.name,
          pickupLocation: p.pickupLocation,
          destination: p.destination ?? null,
          specialInstructions: p.specialInstructions ?? null,
          sortOrder: i,
        })),
      });
    }

    return request;
  });

  await writeAudit({
    actorId: actor.id,
    actorKind: "USER",
    actorName: actor.name,
    action: requiresReapproval ? "REQUEST_MATERIAL_CHANGE" : "REQUEST_EDITED",
    entityType: "TransportRequest",
    entityId: id,
    previousData: { status: existing.status },
    newData: { status: updated.status, startDateTime: updated.startDateTime, endDateTime: updated.endDateTime },
  });

  if (requiresReapproval) {
    await notifyAdmins({
      type: "REQUEST_REAPPROVAL",
      title: "Request changed — re-approval required",
      message: `Request ${updated.requestNumber} was materially changed and now needs re-approval.`,
      refType: "REQUEST",
      refId: id,
    });
    await notify({
      userId: existing.requesterId,
      type: "REQUEST_REAPPROVAL",
      title: "Request sent for re-approval",
      message: `Your request ${updated.requestNumber} was updated and is pending approval again.`,
      refType: "REQUEST",
      refId: id,
    });
  }

  return updated;
}

// Internal helper shared by approval/cancellation/assignment services.
export function assertTransition(from: string, to: RequestStatus) {
  if (!canTransition(from as RequestStatus, to)) {
    throw new AppError(
      `Invalid status transition: ${from} → ${to}`,
      400,
      ErrorCodes.INVALID_TRANSITION,
    );
  }
}
