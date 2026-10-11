import { AppError, ErrorCodes } from "@/lib/errors";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { REQUEST_STATUS } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";
import { notify, notifyAdmins } from "@/lib/notify";
import { assertTransition } from "../requests/request.service";
import { releaseAssignments } from "../assignments/assignment.service";

export const cancelSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required"),
  notes: z.string().optional().nullable(),
});

export interface CancellationActor {
  id: string;
  name: string;
  role: string; // ADMIN | USER
}

// Controlled cancellation workflow (spec §35–45).
export async function cancelRequest(
  id: string,
  data: z.infer<typeof cancelSchema>,
  actor: CancellationActor,
) {
  const parsed = cancelSchema.parse(data);
  const existing = await prisma.transportRequest.findUnique({
    where: { id },
    include: {
      vehicleBookings: { where: { status: "ACTIVE" }, include: { vehicle: true } },
      driverAssignments: { where: { status: "ACTIVE" }, include: { driver: { select: { id: true, name: true } } } },
    },
  });
  if (!existing) throw new AppError("Request not found", 404, ErrorCodes.NOT_FOUND);

  const isAdmin = actor.role === "ADMIN";
  const isRequester = actor.id === existing.requesterId;

  // Permissions (spec §36, §37).
  if (!isAdmin && !isRequester) {
    throw new AppError("Not authorized to cancel this request", 403, ErrorCodes.FORBIDDEN);
  }

  const status = existing.status as (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

  // Terminal / blocked states (spec §40).
  if (status === REQUEST_STATUS.ON_TRIP) {
    throw new AppError(
      "This trip has already started. Normal cancellation is not available. Use the trip issue/abort workflow for operational exceptions.",
      400,
      ErrorCodes.CANCELLATION_NOT_ALLOWED,
    );
  }
  if (status === REQUEST_STATUS.COMPLETED) {
    throw new AppError("A completed request cannot be cancelled", 400, ErrorCodes.CANCELLATION_NOT_ALLOWED);
  }
  if (status === REQUEST_STATUS.REJECTED) {
    throw new AppError("A rejected request cannot be cancelled", 400, ErrorCodes.CANCELLATION_NOT_ALLOWED);
  }
  if (status === REQUEST_STATUS.CANCELLED) {
    throw new AppError("This request is already cancelled", 400, ErrorCodes.CANCELLATION_NOT_ALLOWED);
  }

  // Users can only cancel PENDING or APPROVED (spec §36).
  if (!isAdmin && status === REQUEST_STATUS.ASSIGNED) {
    throw new AppError("You cannot cancel an assigned request. Contact the transport administrator.", 403, ErrorCodes.FORBIDDEN);
  }
  if (!isAdmin && !isRequester) {
    throw new AppError("You can only cancel your own requests", 403, ErrorCodes.FORBIDDEN);
  }

  // Admin cancelling an assigned trip must be before trip start (spec §38).
  if (status === REQUEST_STATUS.ASSIGNED) {
    const now = new Date();
    if (now.getTime() >= existing.startDateTime.getTime()) {
      throw new AppError(
        "This trip has already reached its scheduled start time. Normal cancellation is no longer available. Use the trip issue/abort workflow if an operational exception is required.",
        400,
        ErrorCodes.CANCELLATION_NOT_ALLOWED,
      );
    }
  }

  assertTransition(status, REQUEST_STATUS.CANCELLED);

  // Release resources if assigned (spec §37, §43).
  let released = { releasedBookings: 0, releasedAssignments: 0 };
  if (status === REQUEST_STATUS.ASSIGNED) {
    released = await releaseAssignments(id);
  }

  const request = await prisma.transportRequest.update({
    where: { id },
    data: {
      status: REQUEST_STATUS.CANCELLED,
      cancelledBy: actor.id,
      cancelledAt: new Date(),
      cancellationReason: parsed.reason,
      cancellationActorRole: isAdmin ? "ADMIN" : "USER",
      cancellationNotes: parsed.notes ?? null,
    },
  });

  await writeAudit({
    actorId: actor.id,
    actorKind: "USER",
    actorName: actor.name,
    action: "REQUEST_CANCELLED",
    entityType: "TransportRequest",
    entityId: id,
    previousData: { status },
    newData: { status: REQUEST_STATUS.CANCELLED },
    reason: parsed.reason,
    metadata: { actorRole: isAdmin ? "ADMIN" : "USER", ...released },
  });

  // Notifications (spec §44).
  if (isAdmin) {
    await notify({
      userId: existing.requesterId,
      type: "REQUEST_CANCELLED",
      title: "Request cancelled by administrator",
      message: `Your request ${existing.requestNumber} was cancelled. Reason: ${parsed.reason}`,
      refType: "REQUEST",
      refId: id,
    });
  } else {
    await notifyAdmins({
      type: "REQUEST_CANCELLED_BY_USER",
      title: "Request cancelled by requester",
      message: `Request ${existing.requestNumber} was cancelled by ${actor.name}. Reason: ${parsed.reason}`,
      refType: "REQUEST",
      refId: id,
    });
  }
  for (const a of existing.driverAssignments) {
    await notify({
      driverId: a.driverId,
      type: "TRIP_CANCELLED",
      title: "Assigned trip cancelled",
      message: `Your assigned trip ${existing.requestNumber} was cancelled.`,
      refType: "REQUEST",
      refId: id,
    });
  }

  return request;
}
