import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const hash = (s: string) => bcrypt.hashSync(s, 10);
const hours = (n: number) => n * 3600000;
const days = (n: number) => n * 86400000;

async function wipe() {
  await prisma.importRow.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.requestApproval.deleteMany();
  await prisma.passenger.deleteMany();
  await prisma.vehicleBooking.deleteMany();
  await prisma.driverAssignment.deleteMany();
  await prisma.driverAvailabilityHistory.deleteMany();
  await prisma.transportRequest.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.vehicleType.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.user.deleteMany();
  await prisma.sequence.deleteMany();
}

async function main() {
  await wipe();
  const now = Date.now();

  // --- Vehicle types (authoritative capacities, spec §3) ---
  const small = await prisma.vehicleType.create({ data: { name: "SMALL", capacity: 3 } });
  const medium = await prisma.vehicleType.create({ data: { name: "MEDIUM", capacity: 5 } });
  const large = await prisma.vehicleType.create({ data: { name: "LARGE", capacity: 8 } });

  // --- Users ---
  const admin = await prisma.user.create({
    data: { name: "Transport Admin", email: "admin@tms.local", phone: "01700000001", employeeId: "EMP-0001", department: "Administration", designation: "Transport Administrator", role: "ADMIN", status: "ACTIVE", passwordHash: hash("admin1234") },
  });
  const mkUser = (i: number, name: string, email: string, dept: string) =>
    prisma.user.create({
      data: { name, email, phone: `0170000000${i}`, employeeId: `EMP-${1000 + i}`, department: dept, designation: "Officer", role: "USER", status: "ACTIVE", passwordHash: hash("password123") },
    });
  const rahim = await mkUser(1, "Rahim Uddin", "rahim@company.com", "Finance");
  const karim = await mkUser(2, "Karim Hossain", "karim@company.com", "HR");
  const hasan = await mkUser(3, "Hasan Ali", "hasan@company.com", "Operations");
  const jesmin = await mkUser(4, "Jesmin Akter", "jesmin@company.com", "IT");

  // --- Drivers (variety of operational states, spec §83) ---
  const mkDriver = (name: string, email: string, operationalStatus: string, licenseExpiryDays: number) =>
    prisma.driver.create({
      data: { name, email, phone: `018100000${Math.floor(Math.random() * 90 + 10)}`, licenseNumber: `DL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, licenseExpiry: new Date(now + days(licenseExpiryDays)), status: "ACTIVE", operationalStatus, passwordHash: hash("password123") },
    });
  const dAva = await mkDriver("Driver One", "driver1@company.com", "AVAILABLE", 300);
  const dAva2 = await mkDriver("Driver Two", "driver2@company.com", "AVAILABLE", 500);
  const dUnavail = await mkDriver("Driver Three", "driver3@company.com", "UNAVAILABLE", 400);
  const dAwait = await mkDriver("Driver Four", "driver4@company.com", "AWAITING_CONFIRMATION", 600);

  // --- Vehicles (spec §83) ---
  const v1 = await prisma.vehicle.create({ data: { registrationNumber: "DHA-S-0011", vehicleTypeId: small.id, capacity: 3, status: "AVAILABLE" } });
  const v2 = await prisma.vehicle.create({ data: { registrationNumber: "DHA-M-0022", vehicleTypeId: medium.id, capacity: 5, status: "AVAILABLE" } });
  const v3 = await prisma.vehicle.create({ data: { registrationNumber: "DHA-L-0033", vehicleTypeId: large.id, capacity: 8, status: "AVAILABLE" } });
  const v4 = await prisma.vehicle.create({ data: { registrationNumber: "DHA-M-0044", vehicleTypeId: medium.id, capacity: 5, status: "MAINTENANCE" } });

  let seq = 0;
  const requestNumber = () => `TR-2026-${String(++seq).padStart(5, "0")}`;

  const mkRequest = (data: {
    requesterId: string; purpose: string; start: Date; end: Date; typeId: string;
    destination: string; status: string; passengers: { name: string; pickup: string }[];
    approvedBy?: string; rejectedBy?: string; rejectionReason?: string;
    cancelledBy?: string; cancellationReason?: string; cancellationActorRole?: string;
    assignedTypeId?: string; alternativeReason?: string; alternativeExplanation?: string;
  }) =>
    prisma.transportRequest.create({
      data: {
        requestNumber: requestNumber(),
        requesterId: data.requesterId,
        purpose: data.purpose,
        startDateTime: data.start,
        endDateTime: data.end,
        requestedVehicleTypeId: data.typeId,
        passengerCount: data.passengers.length,
        destination: data.destination,
        status: data.status,
        approvedBy: data.approvedBy,
        approvedAt: data.approvedBy ? new Date(now - hours(2)) : null,
        rejectedBy: data.rejectedBy,
        rejectedAt: data.rejectedBy ? new Date(now - hours(3)) : null,
        rejectionReason: data.rejectionReason,
        cancelledBy: data.cancelledBy,
        cancelledAt: data.cancelledBy ? new Date(now - hours(4)) : null,
        cancellationReason: data.cancellationReason,
        cancellationActorRole: data.cancellationActorRole,
        assignedVehicleTypeId: data.assignedTypeId,
        alternativeReason: data.alternativeReason,
        alternativeExplanation: data.alternativeExplanation,
        passengers: {
          create: data.passengers.map((p, i) => ({ name: p.name, pickupLocation: p.pickup, sortOrder: i })),
        },
      },
    });

  // PENDING
  await mkRequest({ requesterId: rahim.id, purpose: "Client meeting", start: new Date(now + days(2)), end: new Date(now + days(2) + hours(3)), typeId: small.id, destination: "Motijheel", status: "PENDING", passengers: [{ name: "Rahim Uddin", pickup: "Uttara" }] });

  // APPROVED
  const approved = await mkRequest({ requesterId: karim.id, purpose: "Airport pickup", start: new Date(now + days(3)), end: new Date(now + days(3) + hours(4)), typeId: medium.id, destination: "Hazrat Shahjalal Airport", status: "APPROVED", approvedBy: admin.id, passengers: [{ name: "Karim Hossain", pickup: "Mirpur" }, { name: "Guest", pickup: "Banani" }] });

  // ASSIGNED (upcoming, tomorrow)
  const assigned = await mkRequest({ requesterId: hasan.id, purpose: "Site visit", start: new Date(now + days(1)), end: new Date(now + days(1) + hours(5)), typeId: medium.id, destination: "Gazipur", status: "ASSIGNED", approvedBy: admin.id, assignedTypeId: medium.id, passengers: [{ name: "Hasan Ali", pickup: "Uttara" }, { name: "Rahim Uddin", pickup: "Mirpur" }, { name: "Jesmin Akter", pickup: "Banani" }] });
  await prisma.vehicleBooking.create({ data: { requestId: assigned.id, vehicleId: v2.id, startDateTime: assigned.startDateTime, endDateTime: assigned.endDateTime, status: "ACTIVE", assignedBy: admin.id } });
  await prisma.driverAssignment.create({ data: { requestId: assigned.id, driverId: dAva.id, startDateTime: assigned.startDateTime, endDateTime: assigned.endDateTime, status: "ACTIVE", assignedBy: admin.id } });

  // ON_TRIP (started, in progress now)
  const onTrip = await mkRequest({ requesterId: jesmin.id, purpose: "Vendor visit", start: new Date(now - hours(1)), end: new Date(now + hours(2)), typeId: small.id, destination: "Tejgaon", status: "ON_TRIP", approvedBy: admin.id, assignedTypeId: small.id, passengers: [{ name: "Jesmin Akter", pickup: "Dhanmondi" }] });
  await prisma.vehicleBooking.create({ data: { requestId: onTrip.id, vehicleId: v1.id, startDateTime: onTrip.startDateTime, endDateTime: onTrip.endDateTime, status: "ACTIVE", assignedBy: admin.id } });
  const daOnTrip = await prisma.driverAssignment.create({ data: { requestId: onTrip.id, driverId: dAva2.id, startDateTime: onTrip.startDateTime, endDateTime: onTrip.endDateTime, status: "ACTIVE", assignedBy: admin.id, startedAt: new Date(now - hours(1)) } });

  // COMPLETED (past)
  const completed = await mkRequest({ requesterId: rahim.id, purpose: "Training", start: new Date(now - days(2)), end: new Date(now - days(2) + hours(4)), typeId: medium.id, destination: "Uttara", status: "COMPLETED", approvedBy: admin.id, assignedTypeId: medium.id, passengers: [{ name: "Rahim Uddin", pickup: "Uttara" }, { name: "Hasan Ali", pickup: "Mirpur" }] });
  await prisma.vehicleBooking.create({ data: { requestId: completed.id, vehicleId: v2.id, startDateTime: completed.startDateTime, endDateTime: completed.endDateTime, status: "COMPLETED", assignedBy: admin.id } });
  await prisma.driverAssignment.create({ data: { requestId: completed.id, driverId: dAva.id, startDateTime: completed.startDateTime, endDateTime: completed.endDateTime, status: "COMPLETED", assignedBy: admin.id, startedAt: completed.startDateTime, completedAt: completed.endDateTime } });

  // CANCELLED (user cancelled, was approved)
  await mkRequest({ requesterId: karim.id, purpose: "Meeting", start: new Date(now + days(5)), end: new Date(now + days(5) + hours(2)), typeId: small.id, destination: "Motijheel", status: "CANCELLED", approvedBy: admin.id, cancelledBy: karim.id, cancellationReason: "Meeting rescheduled", cancellationActorRole: "USER", passengers: [{ name: "Karim Hossain", pickup: "Mirpur" }] });

  // REJECTED
  await mkRequest({ requesterId: hasan.id, purpose: "Personal errand", start: new Date(now + days(1)), end: new Date(now + days(1) + hours(2)), typeId: large.id, destination: "Chattogram", status: "REJECTED", rejectedBy: admin.id, rejectionReason: "Purpose is outside transport policy", passengers: [{ name: "Hasan Ali", pickup: "Uttara" }] });

  // Alternative vehicle assignment example (requested SMALL, assigned MEDIUM)
  const alt = await mkRequest({ requesterId: rahim.id, purpose: "Team outing", start: new Date(now + days(4)), end: new Date(now + days(4) + hours(5)), typeId: small.id, destination: "Savar", status: "ASSIGNED", approvedBy: admin.id, assignedTypeId: medium.id, alternativeReason: "REQUESTED_VEHICLE_UNAVAILABLE", alternativeExplanation: "All small vehicles were booked", passengers: [{ name: "Rahim Uddin", pickup: "Uttara" }, { name: "Karim Hossain", pickup: "Mirpur" }, { name: "Hasan Ali", pickup: "Banani" }, { name: "Jesmin Akter", pickup: "Dhanmondi" }] });
  await prisma.vehicleBooking.create({ data: { requestId: alt.id, vehicleId: v2.id, startDateTime: alt.startDateTime, endDateTime: alt.endDateTime, status: "ACTIVE", assignedBy: admin.id } });
  await prisma.driverAssignment.create({ data: { requestId: alt.id, driverId: dAva2.id, startDateTime: alt.startDateTime, endDateTime: alt.endDateTime, status: "ACTIVE", assignedBy: admin.id } });

  // Approval history for the approved request
  await prisma.requestApproval.create({ data: { requestId: approved.id, action: "APPROVED", actorId: admin.id, reason: "Approved" } });

  // Driver availability history
  await prisma.driverAvailabilityHistory.create({ data: { driverId: dAwait.id, previousStatus: "AVAILABLE", newStatus: "AWAITING_CONFIRMATION", reason: "Trip completed — awaiting confirmation", changedBy: null } });

  // Sync the request-number sequence so future requests don't collide.
  const year = new Date(now).getUTCFullYear();
  await prisma.sequence.upsert({ where: { key: `TR-${year}` }, create: { key: `TR-${year}`, value: seq }, update: { value: seq } });

  console.log("Seed complete.");
  console.log("Admin login: admin@tms.local / admin1234");
  console.log("Users:     rahim@company.com / password123 (and karim, hasan, jesmin)");
  console.log("Drivers:   driver1@company.com / password123 (and driver2..4)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
