import { AppError, ErrorCodes } from "@/lib/errors";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  REQUEST_STATUS,
  ALTERNATIVE_REASONS,
  APPROVAL_ACTION,
  type AlternativeReason,
} from "@/lib/constants";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { assertTransition } from "../requests/request.service";

export const assignSchema = z.object({
  vehicleId: z.string().min(1),
  driverId: z.string().min(1),
  alternativeReason: z.string().optional().nullable(),
  alternativeExplanation: z.string().optional().nullable(),
});

export const rescheduleSchema = z.object({
  startDateTime: z.coerce.date(),
  endDateTime: z.coerce.date(),
});

function validateAlternative(
  requestedTypeId: string,
  actualTypeId: string,
  reason: string | null | undefined,
  explanation: string | null | undefined,
) {
  if (requestedTypeId === actualTypeId) return;
  if (!reason || !Object.values(ALTERNATIVE_REASONS).includes(reason as AlternativeReason)) {
    throw new AppError("An alternative vehicle assignment reason is required when the vehicle type differs", 400, ErrorCodes.VALIDATION);
  }
  if (reason === ALTERNATIVE_REASONS.OTHER && (!explanation || !explanation.trim())) {
    throw new AppError("An explanation is required when the alternative reason is OTHER", 400, ErrorCodes.VALIDATION);
  }
}

export async function approveAndAssign(
  id: string,
  data: z.infer<typeof assignSchema>,
  actor: { id: string; name: string },
) {
  const parsed = assignSchema.parse(data);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.transportRequest.findUnique({ where: { id } });
    if (!existing) throw new AppError("Request not found", 404, ErrorCodes.NOT_FOUND);
    if (existing.requesterId === actor.id) {
      throw new AppError("You cannot approve your own request", 403, ErrorCodes.FORBIDDEN);
    }
    assertTransition(existing.status, REQUEST_STATUS.APPROVED);

    // 1) Record approval first (atomic with assignment, spec §11).
    await tx.transportRequest.update({
      where: { id },
      data: {
        status: REQUEST_STATUS.APPROVED,
        approvedBy: actor.id,
        approvedAt: new Date(),
      },
    });
    await tx.requestApproval.create({
      data: { requestId: id, action: APPROVAL_ACTION.APPROVED, actorId: actor.id, reason: "Approved via Approve & Assign" },
    });

    // 2) Assign.
    return assignInternal(tx, id, existing, parsed, actor, true);
  });

  return finalizeAssignment(result, actor);
}

export async function assignVehicleAndDriver(
  id: string,
  data: z.infer<typeof assignSchema>,
  actor: { id: string; name: string },
) {
  const parsed = assignSchema.parse(data);
  const payload = await prisma.$transaction(async (tx) => {
    const existing = await tx.transportRequest.findUnique({ where: { id } });
    if (!existing) throw new AppError("Request not found", 404, ErrorCodes.NOT_FOUND);
    assertTransition(existing.status, REQUEST_STATUS.ASSIGNED);
    return assignInternal(tx, id, existing, parsed, actor, false);
  });
  return finalizeAssignment(payload, actor);
}

// Core assignment logic. Runs inside a transaction so concurrent admins cannot
// double-book the same vehicle/driver (spec §22, §76).
async function assignInternal(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  id: string,
  existing: { requestNumber: string; requesterId: string; startDateTime: Date; endDateTime: Date; passengerCount: number; requestedVehicleTypeId: string },
  parsed: z.infer<typeof assignSchema>,
  actor: { id: string; name: string },
  alreadyApproved: boolean,
) {
  const { startDateTime, endDateTime, passengerCount } = existing;

  // Vehicle validation (re-checked inside the transaction).
  const vehicle = await tx.vehicle.findUnique({ where: { id: parsed.vehicleId }, include: { vehicleType: true } });
  if (!vehicle) throw new AppError("Vehicle not found", 404, ErrorCodes.NOT_FOUND);
  if (vehicle.status !== "AVAILABLE") {
    throw new AppError(`Vehicle ${vehicle.registrationNumber} is ${vehicle.status.toLowerCase()}`, 400, ErrorCodes.VEHICLE_UNAVAILABLE);
  }
  const vehicleConflicts = await tx.vehicleBooking.findMany({
    where: { vehicleId: vehicle.id, status: "ACTIVE", startDateTime: { lt: endDateTime }, endDateTime: { gt: startDateTime } },
  });
  if (vehicleConflicts.length > 0) {
    throw new AppError(`Vehicle ${vehicle.registrationNumber} has an overlapping booking`, 409, ErrorCodes.VEHICLE_CONFLICT);
  }
  if (vehicle.vehicleType.capacity < passengerCount) {
    throw new AppError(`Vehicle capacity (${vehicle.vehicleType.capacity}) is less than passenger count (${passengerCount})`, 400, ErrorCodes.CAPACITY_EXCEEDED);
  }
  if (vehicle.vehicleType.capacity < 0) {
    throw new AppError("Vehicle type is not configured", 400, ErrorCodes.VALIDATION);
  }

  // No smaller alternative vehicle than requested (spec §19).
  const requestedType = await tx.vehicleType.findUnique({ where: { id: existing.requestedVehicleTypeId } });
  if (requestedType && vehicle.vehicleType.capacity < requestedType.capacity) {
    throw new AppError(`Cannot assign a smaller vehicle than requested (${requestedType.name})`, 400, ErrorCodes.VALIDATION);
  }
  validateAlternative(existing.requestedVehicleTypeId, vehicle.vehicleTypeId, parsed.alternativeReason, parsed.alternativeExplanation);

  // Driver validation (re-checked inside the transaction).
  const driver = await tx.driver.findUnique({ where: { id: parsed.driverId } });
  if (!driver) throw new AppError("Driver not found", 404, ErrorCodes.NOT_FOUND);
  if (driver.status !== "ACTIVE") throw new AppError("Driver is inactive", 400, ErrorCodes.DRIVER_UNAVAILABLE);
  if (driver.operationalStatus === "UNAVAILABLE") throw new AppError("Driver is operationally unavailable", 400, ErrorCodes.DRIVER_UNAVAILABLE);
  if (driver.operationalStatus === "AWAITING_CONFIRMATION") {
    throw new AppError("Driver is awaiting availability confirmation", 400, ErrorCodes.DRIVER_UNAVAILABLE);
  }
  const driverConflicts = await tx.driverAssignment.findMany({
    where: { driverId: driver.id, status: "ACTIVE", startDateTime: { lt: endDateTime }, endDateTime: { gt: startDateTime } },
  });
  if (driverConflicts.length > 0) {
    throw new AppError(`Driver ${driver.name} has an overlapping assignment`, 409, ErrorCodes.DRIVER_CONFLICT);
  }

  // Persist booking + assignment.
  await tx.vehicleBooking.create({
    data: { requestId: id, vehicleId: vehicle.id, startDateTime, endDateTime, status: "ACTIVE", assignedBy: actor.id },
  });
  await tx.driverAssignment.create({
    data: { requestId: id, driverId: driver.id, startDateTime, endDateTime, status: "ACTIVE", assignedBy: actor.id },
  });

  const request = await tx.transportRequest.update({
    where: { id },
    data: {
      status: REQUEST_STATUS.ASSIGNED,
      assignedVehicleTypeId: vehicle.vehicleTypeId,
      alternativeReason: vehicle.vehicleTypeId === existing.requestedVehicleTypeId ? null : parsed.alternativeReason ?? null,
      alternativeExplanation: vehicle.vehicleTypeId === existing.requestedVehicleTypeId ? null : parsed.alternativeExplanation ?? null,
    },
  });

  // Passenger details for the driver notification (no passenger phones — spec §31).
  const passengers = await tx.passenger.findMany({ where: { requestId: id }, orderBy: { sortOrder: "asc" } });
  const passengerList = passengers.map((p) => `${p.name} (pickup: ${p.pickupLocation})`).join(", ");

  // Side effects (audit + notifications) happen OUTSIDE the transaction so the
  // write lock is not held across extra connections.
  return {
    requestId: id,
    requestNumber: existing.requestNumber,
    requesterId: existing.requesterId,
    vehicleId: vehicle.id,
    driverId: driver.id,
    registrationNumber: vehicle.registrationNumber,
    driverName: driver.name,
    destination: request.destination,
    passengerList,
    alternativeReason: request.alternativeReason,
    alternativeExplanation: request.alternativeExplanation,
    alreadyApproved,
  };
}

async function finalizeAssignment(
  payload: {
    requestId: string;
    requestNumber: string;
    requesterId: string;
    vehicleId: string;
    driverId: string;
    registrationNumber: string;
    driverName: string;
    passengerList: string;
    destination: string;
    alternativeReason: string | null;
    alternativeExplanation: string | null;
    alreadyApproved: boolean;
  },
  actor: { id: string; name: string },
) {
  await writeAudit({
    actorId: actor.id,
    actorKind: "USER",
    actorName: actor.name,
    action: payload.alreadyApproved ? "REQUEST_APPROVED_AND_ASSIGNED" : "REQUEST_ASSIGNED",
    entityType: "TransportRequest",
    entityId: payload.requestId,
    previousData: { status: payload.alreadyApproved ? "PENDING" : "APPROVED" },
    newData: { status: REQUEST_STATUS.ASSIGNED, vehicleId: payload.vehicleId, driverId: payload.driverId },
    metadata: {
      alternativeReason: payload.alternativeReason,
      alternativeExplanation: payload.alternativeExplanation,
    },
  });

  await notify({
    driverId: payload.driverId,
    type: "TRIP_ASSIGNED",
    title: "New trip assigned",
    message: `You have a new trip ${payload.requestNumber} (${payload.registrationNumber}). Passengers: ${payload.passengerList}. Destination: ${payload.destination}.`,
    refType: "REQUEST",
    refId: payload.requestId,
  });
  await notify({
    userId: payload.requesterId,
    type: "TRIP_ASSIGNED",
    title: "Vehicle and driver assigned",
    message: `Your request ${payload.requestNumber} was assigned vehicle ${payload.registrationNumber} and driver ${payload.driverName}.`,
    refType: "REQUEST",
    refId: payload.requestId,
  });

  return {
    requestId: payload.requestId,
    requestNumber: payload.requestNumber,
    vehicleId: payload.vehicleId,
    driverId: payload.driverId,
  };
}

// Release the active booking + assignment for a request (used on cancel /
// material change). Does not delete history (spec §43).
export async function releaseAssignments(requestId: string) {
  const booking = await prisma.vehicleBooking.updateMany({
    where: { requestId, status: "ACTIVE" },
    data: { status: "RELEASED" },
  });
  const assignment = await prisma.driverAssignment.updateMany({
    where: { requestId, status: "ACTIVE" },
    data: { status: "RELEASED" },
  });
  return { releasedBookings: booking.count, releasedAssignments: assignment.count };
}

// Reschedule an assigned trip (spec §34). Re-validates vehicle + driver.
export async function reschedule(
  id: string,
  data: z.infer<typeof rescheduleSchema>,
  actor: { id: string; name: string },
) {
  const parsed = rescheduleSchema.parse(data);
  if (parsed.endDateTime <= parsed.startDateTime) {
    throw new AppError("End time must be after start time", 400, ErrorCodes.VALIDATION);
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.transportRequest.findUnique({
      where: { id },
      include: {
        vehicleBookings: { where: { status: "ACTIVE" } },
        driverAssignments: { where: { status: "ACTIVE" } },
      },
    });
    if (!existing) throw new AppError("Request not found", 404, ErrorCodes.NOT_FOUND);
    if (existing.status !== REQUEST_STATUS.ASSIGNED) {
      throw new AppError(`Cannot reschedule a request in ${existing.status} status`, 400, ErrorCodes.INVALID_TRANSITION);
    }

    const booking = existing.vehicleBookings[0];
    const assignment = existing.driverAssignments[0];
    if (!booking || !assignment) throw new AppError("Request has no active assignment", 400, ErrorCodes.VALIDATION);

    // Re-check conflicts excluding our own booking/assignment.
    const vConflicts = await tx.vehicleBooking.findMany({
      where: { vehicleId: booking.vehicleId, status: "ACTIVE", id: { not: booking.id }, startDateTime: { lt: parsed.endDateTime }, endDateTime: { gt: parsed.startDateTime } },
    });
    const dConflicts = await tx.driverAssignment.findMany({
      where: { driverId: assignment.driverId, status: "ACTIVE", id: { not: assignment.id }, startDateTime: { lt: parsed.endDateTime }, endDateTime: { gt: parsed.startDateTime } },
    });
    if (vConflicts.length > 0 || dConflicts.length > 0) {
      throw new AppError(
        "New time conflicts with an existing vehicle or driver booking. Reassign the request instead.",
        409,
        ErrorCodes.CONFLICT,
      );
    }

    await tx.transportRequest.update({
      where: { id },
      data: { startDateTime: parsed.startDateTime, endDateTime: parsed.endDateTime },
    });
    await tx.vehicleBooking.update({ where: { id: booking.id }, data: { startDateTime: parsed.startDateTime, endDateTime: parsed.endDateTime } });
    await tx.driverAssignment.update({ where: { id: assignment.id }, data: { startDateTime: parsed.startDateTime, endDateTime: parsed.endDateTime } });

    await writeAudit({
      actorId: actor.id,
      actorKind: "USER",
      actorName: actor.name,
      action: "TRIP_RESCHEDULED",
      entityType: "TransportRequest",
      entityId: id,
      previousData: { startDateTime: existing.startDateTime, endDateTime: existing.endDateTime },
      newData: { startDateTime: parsed.startDateTime, endDateTime: parsed.endDateTime },
    });
    await notify({
      userId: existing.requesterId,
      type: "TRIP_RESCHEDULED",
      title: "Trip rescheduled",
      message: `Your trip ${existing.requestNumber} was rescheduled.`,
      refType: "REQUEST",
      refId: id,
    });
    await notify({
      driverId: assignment.driverId,
      type: "TRIP_RESCHEDULED",
      title: "Trip rescheduled",
      message: `Your trip ${existing.requestNumber} was rescheduled.`,
      refType: "REQUEST",
      refId: id,
    });

    return { requestId: id };
  });
}
