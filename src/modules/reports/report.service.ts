import { prisma } from "@/lib/prisma";
import { REQUEST_STATUS, VEHICLE_STATUS, DRIVER_OPERATIONAL_STATUS } from "@/lib/constants";
import { rangesOverlap } from "@/lib/overlap";
import { startOfDay, endOfDay, dateKey, monthKey } from "@/lib/format";

// ---------------------------------------------------------------------------
// Dashboard rollup (spec §48)
// ---------------------------------------------------------------------------

export async function getDashboard() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [requests, vehicles, drivers, todayRequests, licenseAlerts] = await Promise.all([
    prisma.transportRequest.findMany({
      select: { status: true, startDateTime: true },
    }),
    prisma.vehicle.findMany({
      include: { bookings: { where: { status: "ACTIVE" }, select: { startDateTime: true, endDateTime: true } } },
    }),
    prisma.driver.findMany({
      include: { assignments: { where: { status: "ACTIVE" }, select: { startDateTime: true, endDateTime: true } } },
    }),
    prisma.transportRequest.findMany({
      where: { startDateTime: { gte: todayStart, lte: todayEnd } },
      select: { status: true, startDateTime: true },
    }),
    prisma.driver.findMany({
      where: { status: "ACTIVE", licenseExpiry: { not: null, lte: new Date(now.getTime() + 30 * 86400000) } },
      select: { id: true, name: true, licenseExpiry: true },
      orderBy: { licenseExpiry: "asc" },
    }),
  ]);

  const count = (arr: { status: string }[], s: string) => arr.filter((x) => x.status === s).length;

  const requestCounts = {
    pending: count(requests, REQUEST_STATUS.PENDING),
    approved: count(requests, REQUEST_STATUS.APPROVED),
    assigned: count(requests, REQUEST_STATUS.ASSIGNED),
    onTrip: count(requests, REQUEST_STATUS.ON_TRIP),
    completed: count(requests, REQUEST_STATUS.COMPLETED),
    cancelled: count(requests, REQUEST_STATUS.CANCELLED),
    rejected: count(requests, REQUEST_STATUS.REJECTED),
  };

  const todayCounts = {
    total: todayRequests.length,
    upcoming: todayRequests.filter((r) => r.status === REQUEST_STATUS.ASSIGNED && r.startDateTime.getTime() > now.getTime()).length,
    onTrip: count(todayRequests, REQUEST_STATUS.ON_TRIP),
    completed: count(todayRequests, REQUEST_STATUS.COMPLETED),
    cancelled: count(todayRequests, REQUEST_STATUS.CANCELLED),
  };

  const vehiclesInTrip = (v: { bookings: { startDateTime: Date; endDateTime: Date }[] }) =>
    v.bookings.some((b) => b.startDateTime.getTime() <= now.getTime() && now.getTime() <= b.endDateTime.getTime());
  const vehiclesBooked = (v: { bookings: { startDateTime: Date; endDateTime: Date }[] }) =>
    v.bookings.some((b) => b.startDateTime.getTime() > now.getTime());

  const vehicleCounts = {
    available: vehicles.filter((v) => v.status === VEHICLE_STATUS.AVAILABLE && v.bookings.every((b) => !rangesOverlap(b.startDateTime, b.endDateTime, now, now))).length,
    booked: vehicles.filter((v) => v.status === VEHICLE_STATUS.AVAILABLE && vehiclesBooked(v)).length,
    onTrip: vehicles.filter((v) => vehiclesInTrip(v)).length,
    maintenance: count(vehicles as { status: string }[], VEHICLE_STATUS.MAINTENANCE),
    inactive: count(vehicles as { status: string }[], VEHICLE_STATUS.INACTIVE),
  };

  const driverOnTrip = (d: { assignments: { startDateTime: Date; endDateTime: Date }[] }) =>
    d.assignments.some((a) => a.startDateTime.getTime() <= now.getTime() && now.getTime() <= a.endDateTime.getTime());
  const driverBooked = (d: { assignments: { startDateTime: Date; endDateTime: Date }[] }) =>
    d.assignments.some((a) => a.startDateTime.getTime() > now.getTime());

  const driverCounts = {
    available: drivers.filter((d) => d.operationalStatus === DRIVER_OPERATIONAL_STATUS.AVAILABLE && !driverOnTrip(d)).length,
    booked: drivers.filter((d) => driverBooked(d)).length,
    onTrip: drivers.filter((d) => driverOnTrip(d)).length,
    unavailable: drivers.filter((d) => d.operationalStatus === DRIVER_OPERATIONAL_STATUS.UNAVAILABLE).length,
    awaitingConfirmation: drivers.filter((d) => d.operationalStatus === DRIVER_OPERATIONAL_STATUS.AWAITING_CONFIRMATION).length,
  };

  const alerts: { type: string; message: string }[] = [];
  if (requestCounts.pending > 0) alerts.push({ type: "PENDING_APPROVAL", message: `${requestCounts.pending} request(s) awaiting approval` });
  const awaiting = drivers.filter((d) => d.operationalStatus === DRIVER_OPERATIONAL_STATUS.AWAITING_CONFIRMATION).length;
  if (awaiting > 0) alerts.push({ type: "DRIVER_AWAITING_CONFIRMATION", message: `${awaiting} driver(s) awaiting availability confirmation` });

  for (const d of licenseAlerts) {
    const days = Math.ceil((new Date(d.licenseExpiry!).getTime() - now.getTime()) / 86400000);
    alerts.push({ type: "LICENSE_EXPIRY", message: `${d.name}'s driving licence expires in ${days} day(s)` });
  }

  return { requestCounts, todayCounts, vehicleCounts, driverCounts, alerts, licenseAlerts };
}

// ---------------------------------------------------------------------------
// Reports (spec §51)
// ---------------------------------------------------------------------------

export async function getRequestsReport(from: Date, to: Date, groupBy: "day" | "month" | "status" = "status") {
  const rows = await prisma.transportRequest.findMany({
    where: { startDateTime: { gte: from, lte: to } },
    select: { status: true, startDateTime: true, requestedType: { select: { name: true } } },
  });

  if (groupBy === "status") {
    const byStatus: Record<string, number> = {};
    for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    return { groupBy, total: rows.length, rows: byStatus };
  }

  const buckets: Record<string, number> = {};
  for (const r of rows) {
    const key = groupBy === "day" ? dateKey(r.startDateTime) : monthKey(r.startDateTime);
    buckets[key] = (buckets[key] || 0) + 1;
  }
  return { groupBy, total: rows.length, rows: buckets };
}

export async function getVehicleUtilization(from: Date, to: Date) {
  const bookings = await prisma.vehicleBooking.findMany({
    where: { startDateTime: { gte: from }, endDateTime: { lte: to } },
    include: { vehicle: { select: { registrationNumber: true } } },
  });
  const trips = await prisma.transportRequest.findMany({
    where: { startDateTime: { gte: from, lte: to }, status: REQUEST_STATUS.COMPLETED },
    select: { id: true },
  });
  const byVehicle: Record<string, { trips: number; hours: number }> = {};
  for (const b of bookings) {
    const key = b.vehicle.registrationNumber;
    if (!byVehicle[key]) byVehicle[key] = { trips: 0, hours: 0 };
    byVehicle[key].hours += (b.endDateTime.getTime() - b.startDateTime.getTime()) / 3600000;
  }
  return { totalCompletedTrips: trips.length, byVehicle };
}

export async function getDriverTripCounts(from: Date, to: Date) {
  const assignments = await prisma.driverAssignment.findMany({
    where: { startDateTime: { gte: from }, endDateTime: { lte: to } },
    include: { driver: { select: { name: true } } },
  });
  const byDriver: Record<string, number> = {};
  for (const a of assignments) byDriver[a.driver.name] = (byDriver[a.driver.name] || 0) + 1;
  return byDriver;
}

export async function getUserTripCounts(from: Date, to: Date) {
  const grouped = await prisma.transportRequest.groupBy({
    by: ["requesterId"],
    where: { startDateTime: { gte: from, lte: to } },
    _count: { _all: true },
  });
  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  return grouped.map((g) => ({ name: nameById.get(g.requesterId) ?? g.requesterId, trips: g._count._all }));
}

export async function getDepartmentReport(from: Date, to: Date) {
  const requests = await prisma.transportRequest.findMany({
    where: { startDateTime: { gte: from, lte: to } },
    include: { requester: { select: { department: true } } },
  });
  const byDept: Record<string, number> = {};
  for (const r of requests) {
    const dept = r.requester.department || "Unassigned";
    byDept[dept] = (byDept[dept] || 0) + 1;
  }
  return byDept;
}

export async function getVehicleTypeUsage(from: Date, to: Date) {
  const requests = await prisma.transportRequest.findMany({
    where: { startDateTime: { gte: from, lte: to } },
    include: { assignedType: { select: { name: true } }, requestedType: { select: { name: true } } },
  });
  const requested: Record<string, number> = {};
  const assigned: Record<string, number> = {};
  for (const r of requests) {
    const rk = r.requestedType?.name ?? "N/A";
    const ak = r.assignedType?.name ?? rk;
    requested[rk] = (requested[rk] || 0) + 1;
    assigned[ak] = (assigned[ak] || 0) + 1;
  }
  return { requested, assigned };
}

export async function getCancellationReport(from: Date, to: Date) {
  const rows = await prisma.transportRequest.findMany({
    where: { status: REQUEST_STATUS.CANCELLED, cancelledAt: { gte: from, lte: to } },
    select: { requestNumber: true, cancelledBy: true, cancellationReason: true, cancellationActorRole: true, cancelledAt: true },
  });
  return rows;
}

export async function getRejectionReport(from: Date, to: Date) {
  return prisma.transportRequest.findMany({
    where: { status: REQUEST_STATUS.REJECTED, rejectedAt: { gte: from, lte: to } },
    select: { requestNumber: true, rejectionReason: true, rejectedAt: true, rejectedBy: true },
  });
}

export async function getAlternativeAssignmentReport(from: Date, to: Date) {
  return prisma.transportRequest.findMany({
    where: { startDateTime: { gte: from, lte: to }, alternativeReason: { not: null } },
    include: { requestedType: { select: { name: true } }, assignedType: { select: { name: true } } },
  });
}

export async function getDriverAvailabilityReport() {
  const drivers = await prisma.driver.findMany({
    select: {
      id: true,
      name: true,
      operationalStatus: true,
      status: true,
      availability: { orderBy: { createdAt: "desc" }, take: 1 },
      assignments: { where: { status: "ACTIVE" }, select: { startDateTime: true, endDateTime: true } },
    },
  });
  const now = new Date();
  return drivers.map((d) => ({
    name: d.name,
    operationalStatus: d.operationalStatus,
    active: d.status === "ACTIVE",
    tripState: d.assignments.some((a) => a.startDateTime.getTime() <= now.getTime() && now.getTime() <= a.endDateTime.getTime())
      ? "ON_TRIP"
      : d.assignments.some((a) => a.startDateTime.getTime() > now.getTime())
        ? "BOOKED"
        : "IDLE",
    lastChange: d.availability[0]?.newStatus ?? null,
  }));
}
