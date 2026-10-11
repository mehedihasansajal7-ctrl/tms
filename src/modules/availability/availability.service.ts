import { prisma } from "@/lib/prisma";
import { VEHICLE_STATUS, DRIVER_OPERATIONAL_STATUS, ALTERNATIVE_REASONS } from "@/lib/constants";
import { rangesOverlap } from "@/lib/overlap";

export interface Conflict {
  id: string;
  startDateTime: Date;
  endDateTime: Date;
  requestNumber: string;
}

// --- Vehicles --------------------------------------------------------------

export async function getVehicleConflicts(
  vehicleId: string,
  start: Date,
  end: Date,
  excludeBookingId?: string,
): Promise<Conflict[]> {
  const bookings = await prisma.vehicleBooking.findMany({
    where: {
      vehicleId,
      status: "ACTIVE",
      startDateTime: { lt: end },
      endDateTime: { gt: start },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    include: { request: { select: { requestNumber: true } } },
  });
  return bookings.map((b) => ({
    id: b.id,
    startDateTime: b.startDateTime,
    endDateTime: b.endDateTime,
    requestNumber: b.request.requestNumber,
  }));
}

export async function checkVehicleAvailable(
  vehicleId: string,
  start: Date,
  end: Date,
  excludeBookingId?: string,
): Promise<{ available: boolean; reason?: string; conflicts: Conflict[] }> {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, include: { vehicleType: true } });
  if (!vehicle) return { available: false, reason: "Vehicle not found", conflicts: [] };
  if (vehicle.status !== VEHICLE_STATUS.AVAILABLE) {
    return { available: false, reason: `Vehicle is ${vehicle.status.toLowerCase()}`, conflicts: [] };
  }
  const conflicts = await getVehicleConflicts(vehicleId, start, end, excludeBookingId);
  if (conflicts.length > 0) {
    return { available: false, reason: "Vehicle has an overlapping booking", conflicts };
  }
  return { available: true, conflicts: [] };
}

export async function availableVehicles(start: Date, end: Date, vehicleTypeId?: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: VEHICLE_STATUS.AVAILABLE, ...(vehicleTypeId ? { vehicleTypeId } : {}) },
    include: { vehicleType: true, bookings: { where: { status: "ACTIVE" }, select: { startDateTime: true, endDateTime: true } } },
  });
  return vehicles
    .filter((v) => !v.bookings.some((b) => rangesOverlap(b.startDateTime, b.endDateTime, start, end)))
    .sort((a, b) => a.vehicleType.capacity - b.vehicleType.capacity);
}

// --- Drivers ---------------------------------------------------------------

export async function getDriverConflicts(
  driverId: string,
  start: Date,
  end: Date,
  excludeAssignmentId?: string,
): Promise<Conflict[]> {
  const assignments = await prisma.driverAssignment.findMany({
    where: {
      driverId,
      status: "ACTIVE",
      startDateTime: { lt: end },
      endDateTime: { gt: start },
      ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}),
    },
    include: { request: { select: { requestNumber: true } } },
  });
  return assignments.map((a) => ({
    id: a.id,
    startDateTime: a.startDateTime,
    endDateTime: a.endDateTime,
    requestNumber: a.request.requestNumber,
  }));
}

export async function checkDriverAssignable(
  driverId: string,
  start: Date,
  end: Date,
  excludeAssignmentId?: string,
): Promise<{ assignable: boolean; reason?: string; conflicts: Conflict[] }> {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) return { assignable: false, reason: "Driver not found", conflicts: [] };
  if (driver.status !== "ACTIVE") {
    return { assignable: false, reason: "Driver is inactive", conflicts: [] };
  }
  if (driver.operationalStatus === DRIVER_OPERATIONAL_STATUS.UNAVAILABLE) {
    return { assignable: false, reason: "Driver is operationally unavailable", conflicts: [] };
  }
  if (driver.operationalStatus === DRIVER_OPERATIONAL_STATUS.AWAITING_CONFIRMATION) {
    return { assignable: false, reason: "Driver is awaiting availability confirmation", conflicts: [] };
  }
  const conflicts = await getDriverConflicts(driverId, start, end, excludeAssignmentId);
  if (conflicts.length > 0) {
    return { assignable: false, reason: "Driver has an overlapping assignment", conflicts };
  }
  return { assignable: true, conflicts: [] };
}

export async function assignableDrivers(start: Date, end: Date) {
  const drivers = await prisma.driver.findMany({
    where: { status: "ACTIVE", operationalStatus: DRIVER_OPERATIONAL_STATUS.AVAILABLE },
    include: { assignments: { where: { status: "ACTIVE" }, select: { startDateTime: true, endDateTime: true } } },
  });
  return drivers
    .filter((d) => !d.assignments.some((a) => rangesOverlap(a.startDateTime, a.endDateTime, start, end)))
    .map((d) => ({ id: d.id, name: d.name, licenseNumber: d.licenseNumber, operationalStatus: d.operationalStatus }));
}

// --- Request-centric availability (admin request detail, spec §17) ----------

export async function getRequestAvailability(requestId: string) {
  const request = await prisma.transportRequest.findUnique({
    where: { id: requestId },
    include: { requestedType: true },
  });
  if (!request) return null;

  const { startDateTime, endDateTime, passengerCount } = request;
  const allTypes = await prisma.vehicleType.findMany({ where: { active: true }, orderBy: { capacity: "asc" } });
  const allVehicles = await prisma.vehicle.findMany({
    include: { vehicleType: true, bookings: { where: { status: "ACTIVE" }, select: { startDateTime: true, endDateTime: true, request: { select: { requestNumber: true } } } } },
  });
  const allDrivers = await prisma.driver.findMany({
    include: { assignments: { where: { status: "ACTIVE" }, select: { startDateTime: true, endDateTime: true } } },
  });

  const vehicles = allVehicles.map((v) => {
    const conflicts = v.bookings.filter((b) => rangesOverlap(b.startDateTime, b.endDateTime, startDateTime, endDateTime));
    const fits = v.vehicleType.capacity >= passengerCount;
    const isLarger = v.vehicleType.capacity > request.requestedType.capacity;
    return {
      id: v.id,
      registrationNumber: v.registrationNumber,
      typeId: v.vehicleTypeId,
      typeName: v.vehicleType.name,
      capacity: v.vehicleType.capacity,
      status: v.status,
      requested: v.vehicleTypeId === request.requestedVehicleTypeId,
      fits,
      larger: isLarger,
      available: v.status === VEHICLE_STATUS.AVAILABLE && conflicts.length === 0,
      conflictCount: conflicts.length,
    };
  });

  const drivers = allDrivers.map((d) => {
    const conflicts = d.assignments.filter((a) => rangesOverlap(a.startDateTime, a.endDateTime, startDateTime, endDateTime));
    return {
      id: d.id,
      name: d.name,
      operationalStatus: d.operationalStatus,
      status: d.status,
      available: d.status === "ACTIVE" && d.operationalStatus === DRIVER_OPERATIONAL_STATUS.AVAILABLE && conflicts.length === 0,
      conflictCount: conflicts.length,
    };
  });

  // Smallest available vehicle that satisfies the passenger count (spec §19).
  const recommended = vehicles
    .filter((v) => v.available && v.fits)
    .sort((a, b) => a.capacity - b.capacity)[0];

  return {
    vehicleTypes: allTypes,
    vehicles,
    drivers,
    recommendedVehicleId: recommended?.id ?? null,
    requiresAlternativeReason:
      recommended ? recommended.typeId !== request.requestedVehicleTypeId : false,
    alternativeReasonOptions: Object.values(ALTERNATIVE_REASONS),
  };
}
