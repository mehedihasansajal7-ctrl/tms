import { prisma } from "@/lib/prisma";
import { AppError, ErrorCodes } from "@/lib/errors";
import { REQUEST_STATUS, DRIVER_OPERATIONAL_STATUS } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";
import { notify, notifyAdmins } from "@/lib/notify";
import { setOperationalStatus } from "../drivers/driver.service";

// Start a trip (driver). Moves ASSIGNED → ON_TRIP (spec §33).
export async function startTrip(requestId: string, driverId: string) {
  const request = await prisma.transportRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError("Request not found", 404, ErrorCodes.NOT_FOUND);

  const assignment = await prisma.driverAssignment.findFirst({
    where: { requestId, driverId, status: "ACTIVE" },
  });
  if (!assignment) throw new AppError("You are not assigned to this trip", 403, ErrorCodes.FORBIDDEN);
  if (request.status !== REQUEST_STATUS.ASSIGNED) {
    throw new AppError(`Cannot start a trip in ${request.status} status`, 400, ErrorCodes.INVALID_TRANSITION);
  }

  const updated = await prisma.transportRequest.update({
    where: { id: requestId },
    data: { status: REQUEST_STATUS.ON_TRIP },
  });
  await prisma.driverAssignment.update({ where: { id: assignment.id }, data: { startedAt: new Date() } });

  await writeAudit({
    actorId: driverId,
    actorKind: "DRIVER",
    action: "TRIP_STARTED",
    entityType: "TransportRequest",
    entityId: requestId,
    previousData: { status: REQUEST_STATUS.ASSIGNED },
    newData: { status: REQUEST_STATUS.ON_TRIP },
  });
  await notify({
    userId: request.requesterId,
    type: "TRIP_STARTED",
    title: "Your trip has started",
    message: `Trip ${request.requestNumber} is now in progress.`,
    refType: "REQUEST",
    refId: requestId,
  });

  return updated;
}

// Complete a trip (driver). Moves ON_TRIP → COMPLETED and sets the driver to
// AWAITING_CONFIRMATION (spec §27 — never auto-AVAILABLE).
export async function completeTrip(requestId: string, driverId: string) {
  const request = await prisma.transportRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError("Request not found", 404, ErrorCodes.NOT_FOUND);

  const assignment = await prisma.driverAssignment.findFirst({
    where: { requestId, driverId, status: "ACTIVE" },
  });
  if (!assignment) throw new AppError("You are not assigned to this trip", 403, ErrorCodes.FORBIDDEN);
  if (request.status !== REQUEST_STATUS.ON_TRIP) {
    throw new AppError(`Cannot complete a trip in ${request.status} status`, 400, ErrorCodes.INVALID_TRANSITION);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.transportRequest.update({
      where: { id: requestId },
      data: { status: REQUEST_STATUS.COMPLETED },
    });
    await tx.driverAssignment.update({ where: { id: assignment.id }, data: { status: "COMPLETED", completedAt: new Date() } });
    await tx.vehicleBooking.updateMany({ where: { requestId, status: "ACTIVE" }, data: { status: "COMPLETED" } });
    return r;
  });

  // Driver must confirm availability before further work (spec §27, §90).
  await setOperationalStatus(driverId, DRIVER_OPERATIONAL_STATUS.AWAITING_CONFIRMATION, {
    actorId: driverId,
    actorKind: "DRIVER",
    reason: "Trip completed — awaiting availability confirmation",
  });

  await writeAudit({
    actorId: driverId,
    actorKind: "DRIVER",
    action: "TRIP_COMPLETED",
    entityType: "TransportRequest",
    entityId: requestId,
    previousData: { status: REQUEST_STATUS.ON_TRIP },
    newData: { status: REQUEST_STATUS.COMPLETED },
  });
  await notify({
    userId: request.requesterId,
    type: "TRIP_COMPLETED",
    title: "Trip completed",
    message: `Trip ${request.requestNumber} has been completed.`,
    refType: "REQUEST",
    refId: requestId,
  });
  await notifyAdmins({
    type: "DRIVER_AWAITING_CONFIRMATION",
    title: "Driver awaiting availability confirmation",
    message: `Driver ${driverId} completed a trip and is awaiting availability confirmation.`,
    refType: "DRIVER",
    refId: driverId,
  });

  return updated;
}

// Emergency abort of an active/started trip (spec §39). Admin-only, full audit.
export async function adminAbortTrip(
  requestId: string,
  reason: string,
  actor: { id: string; name: string },
) {
  if (!reason || !reason.trim()) throw new AppError("Reason is required", 400, ErrorCodes.VALIDATION);
  const request = await prisma.transportRequest.findUnique({
    where: { id: requestId },
    include: {
      vehicleBookings: { where: { status: "ACTIVE" } },
      driverAssignments: { where: { status: "ACTIVE" }, include: { driver: { select: { id: true, name: true } } } },
    },
  });
  if (!request) throw new AppError("Request not found", 404, ErrorCodes.NOT_FOUND);
  if (request.status !== REQUEST_STATUS.ON_TRIP && request.status !== REQUEST_STATUS.ASSIGNED) {
    throw new AppError(`Abort is only available for active trips (current: ${request.status})`, 400, ErrorCodes.INVALID_TRANSITION);
  }

  await prisma.transportRequest.update({
    where: { id: requestId },
    data: {
      status: REQUEST_STATUS.CANCELLED,
      cancelledBy: actor.id,
      cancelledAt: new Date(),
      cancellationReason: reason,
      cancellationActorRole: "ADMIN",
      cancellationNotes: "Emergency abort / trip issue",
    },
  });
  await prisma.vehicleBooking.updateMany({ where: { requestId, status: "ACTIVE" }, data: { status: "CANCELLED" } });
  await prisma.driverAssignment.updateMany({ where: { requestId, status: "ACTIVE" }, data: { status: "CANCELLED" } });

  await writeAudit({
    actorId: actor.id,
    actorKind: "USER",
    actorName: actor.name,
    action: "TRIP_ABORTED",
    entityType: "TransportRequest",
    entityId: requestId,
    previousData: { status: request.status },
    newData: { status: REQUEST_STATUS.CANCELLED },
    reason,
  });
  await notify({
    userId: request.requesterId,
    type: "TRIP_ABORTED",
    title: "Trip aborted",
    message: `Trip ${request.requestNumber} was aborted. Reason: ${reason}`,
    refType: "REQUEST",
    refId: requestId,
  });
  for (const a of request.driverAssignments) {
    await notify({
      driverId: a.driverId,
      type: "TRIP_ABORTED",
      title: "Trip aborted",
      message: `Trip ${request.requestNumber} was aborted. Reason: ${reason}`,
      refType: "REQUEST",
      refId: requestId,
    });
  }

  return { requestId };
}

// Admin manually confirms a driver's availability (spec §28).
export async function adminConfirmAvailability(driverId: string, available: boolean, actor: { id: string; name: string }) {
  return setOperationalStatus(driverId, available ? DRIVER_OPERATIONAL_STATUS.AVAILABLE : DRIVER_OPERATIONAL_STATUS.UNAVAILABLE, {
    actorId: actor.id,
    actorKind: "USER",
    actorName: actor.name,
    reason: available ? "Admin confirmed availability" : "Admin confirmed unavailability",
  });
}
