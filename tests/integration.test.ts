import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import path from "node:path";
/* eslint-disable @typescript-eslint/no-explicit-any */

const TEST_DB = "file:./test.db";
process.env.DATABASE_URL = TEST_DB;
process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret";

let prisma: any;
let services: any;

let admin: { id: string; name: string };
let rahim: { id: string; name: string };
let smallTypeId = "";
let smallVehicleId = "";
let mediumVehicleId = "";
let availDriverId = "";
let awaitDriverId = "";

before(async () => {
  const env = { ...process.env, DATABASE_URL: TEST_DB };
  execSync("npx prisma db push --skip-generate --accept-data-loss", { env, stdio: "ignore", cwd: process.cwd() });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "ignore", cwd: process.cwd() });

  const prismaMod = await import("../src/lib/prisma");
  prisma = prismaMod.prisma;
  services = {
    createRequest: (await import("../src/modules/requests/request.service")).createRequest,
    approveRequest: (await import("../src/modules/approvals/approval.service")).approveRequest,
    rejectRequest: (await import("../src/modules/approvals/approval.service")).rejectRequest,
    reopenRequest: (await import("../src/modules/approvals/approval.service")).reopenRequest,
    assignVehicleAndDriver: (await import("../src/modules/assignments/assignment.service")).assignVehicleAndDriver,
    cancelRequest: (await import("../src/modules/cancellations/cancellation.service")).cancelRequest,
    startTrip: (await import("../src/modules/trips/trip.service")).startTrip,
    completeTrip: (await import("../src/modules/trips/trip.service")).completeTrip,
    checkDriverAssignable: (await import("../src/modules/availability/availability.service")).checkDriverAssignable,
  };

  admin = { id: await byEmail("user", "admin@tms.local"), name: "Transport Admin" };
  rahim = { id: await byEmail("user", "rahim@company.com"), name: "Rahim Uddin" };
  smallTypeId = await byName("vehicleType", "SMALL");
  smallVehicleId = await byReg("DHA-S-0011");
  mediumVehicleId = await byReg("DHA-M-0022");
  availDriverId = await byEmail("driver", "driver1@company.com");
  awaitDriverId = await byEmail("driver", "driver4@company.com");
});

after(async () => {
  await prisma.$disconnect();
  const fs = await import("node:fs");
  for (const f of ["test.db", "test.db-journal"]) {
    const p = path.join(process.cwd(), f);
    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
  }
});

async function byEmail(model: string, email: string): Promise<string> {
  const row = await prisma[model].findUnique({ where: { email }, select: { id: true } });
  if (!row) throw new Error(`No ${model} with email ${email}`);
  return row.id;
}
async function byName(model: string, name: string): Promise<string> {
  const row = await prisma[model].findUnique({ where: { name }, select: { id: true } });
  if (!row) throw new Error(`No ${model} with name ${name}`);
  return row.id;
}
async function byReg(registrationNumber: string): Promise<string> {
  const row = await prisma.vehicle.findUnique({ where: { registrationNumber }, select: { id: true } });
  if (!row) throw new Error(`No vehicle ${registrationNumber}`);
  return row.id;
}

const later = (h: number) => new Date(Date.now() + h * 3600000);

let counter = 0;
async function mkRequest(overrides: Record<string, unknown> = {}) {
  const base = 72 + counter++ * 24; // each request lands in its own 24h slot
  return services.createRequest(
    {
      purpose: "Test purpose",
      startDateTime: later(base),
      endDateTime: later(base + 2),
      requestedVehicleTypeId: smallTypeId,
      destination: "Test destination",
      passengers: [{ name: "P1", pickupLocation: "Uttara" }],
      ...overrides,
    },
    rahim,
  );
}

let entityCounter = 0;
async function freshDriver() {
  const n = entityCounter++;
  const d = await prisma.driver.create({
    data: {
      name: `Test Driver ${n}`,
      email: `testdriver${n}@company.com`,
      licenseNumber: `TST-DL-${n}`,
      status: "ACTIVE",
      operationalStatus: "AVAILABLE",
      passwordHash: "x",
    },
  });
  return d.id;
}
async function freshVehicle() {
  const n = entityCounter++;
  const v = await prisma.vehicle.create({
    data: {
      registrationNumber: `TST-${n}-${Math.floor(Math.random() * 1000)}`,
      vehicleTypeId: smallTypeId,
      capacity: 3,
      status: "AVAILABLE",
    },
  });
  return v.id;
}

test("new request starts PENDING with a valid request number", async () => {
  const r = await mkRequest();
  assert.equal(r.status, "PENDING");
  assert.match(r.requestNumber, /^TR-\d{4}-\d{5}$/);
});

test("admin can approve a PENDING request and approval history is recorded", async () => {
  const r = await mkRequest();
  const approved = await services.approveRequest(r.id, { comment: "ok" }, admin);
  assert.equal(approved.status, "APPROVED");
  const approvals = await prisma.requestApproval.findMany({ where: { requestId: r.id } });
  assert.equal(approvals.length, 1);
  assert.equal(approvals[0].action, "APPROVED");
});

test("admin cannot approve their own request", async () => {
  const r = await services.createRequest(
    { purpose: "Own", startDateTime: later(10), endDateTime: later(11), requestedVehicleTypeId: smallTypeId, destination: "X", passengers: [{ name: "Self", pickupLocation: "Here" }] },
    admin,
  );
  await assert.rejects(() => services.approveRequest(r.id, {}, admin), /own request/);
});

test("rejection requires a reason", async () => {
  const r = await mkRequest();
  await assert.rejects(() => services.rejectRequest(r.id, { reason: "" }, admin));
});

test("a PENDING request cannot be assigned without approval", async () => {
  const r = await mkRequest();
  await assert.rejects(
    () => services.assignVehicleAndDriver(r.id, { vehicleId: smallVehicleId, driverId: availDriverId }, admin),
    /Invalid status transition|not.*approved/i,
  );
});

test("assignment creates booking and sets ASSIGNED", async () => {
  const r = await mkRequest();
  await services.approveRequest(r.id, {}, admin);
  await services.assignVehicleAndDriver(r.id, { vehicleId: smallVehicleId, driverId: availDriverId }, admin);
  const updated = await prisma.transportRequest.findUnique({ where: { id: r.id } });
  assert.equal(updated.status, "ASSIGNED");
  const booking = await prisma.vehicleBooking.findFirst({ where: { requestId: r.id } });
  assert.ok(booking);
  assert.equal(booking.status, "ACTIVE");
});

test("vehicle with overlapping booking cannot be assigned", async () => {
  const vehicle = await freshVehicle();
  const driver = await freshDriver();
  const t = { startDateTime: later(40), endDateTime: later(42) };

  const r1 = await mkRequest(t);
  await services.approveRequest(r1.id, {}, admin);
  await services.assignVehicleAndDriver(r1.id, { vehicleId: vehicle, driverId: await freshDriver() }, admin);

  const r2 = await mkRequest(t);
  await services.approveRequest(r2.id, {}, admin);
  await assert.rejects(
    () => services.assignVehicleAndDriver(r2.id, { vehicleId: vehicle, driverId: driver }, admin),
    /overlapping booking/i,
  );
});

test("driver AWAITING_CONFIRMATION is not assignable", async () => {
  const check = await services.checkDriverAssignable(awaitDriverId, later(1), later(2));
  assert.equal(check.assignable, false);
  assert.match(check.reason ?? "", /awaiting/i);
});

test("driver with overlapping assignment is not assignable", async () => {
  const vehicle = await freshVehicle();
  const driver = await freshDriver();
  const t = { startDateTime: later(44), endDateTime: later(46) };

  const r1 = await mkRequest(t);
  await services.approveRequest(r1.id, {}, admin);
  await services.assignVehicleAndDriver(r1.id, { vehicleId: vehicle, driverId: driver }, admin);

  const r2 = await mkRequest(t);
  await services.approveRequest(r2.id, {}, admin);
  const otherVehicle = await freshVehicle();
  await assert.rejects(
    () => services.assignVehicleAndDriver(r2.id, { vehicleId: otherVehicle, driverId: driver }, admin),
    /overlapping assignment/i,
  );
});

test("cannot assign a smaller vehicle than requested", async () => {
  const largeTypeId = await byName("vehicleType", "LARGE");
  const r = await services.createRequest(
    { purpose: "Big", startDateTime: later(30), endDateTime: later(31), requestedVehicleTypeId: largeTypeId, destination: "X", passengers: [{ name: "A", pickupLocation: "B" }] },
    rahim,
  );
  await services.approveRequest(r.id, {}, admin);
  await assert.rejects(
    () => services.assignVehicleAndDriver(r.id, { vehicleId: smallVehicleId, driverId: availDriverId }, admin),
    /smaller/i,
  );
});

test("alternative vehicle assignment requires a reason when type differs", async () => {
  const r = await mkRequest(); // requests SMALL
  await services.approveRequest(r.id, {}, admin);
  const driver = await freshDriver();
  await assert.rejects(
    () => services.assignVehicleAndDriver(r.id, { vehicleId: mediumVehicleId, driverId: driver }, admin),
    /alternative/i,
  );
  await services.assignVehicleAndDriver(
    r.id,
    { vehicleId: mediumVehicleId, driverId: driver, alternativeReason: "REQUESTED_VEHICLE_UNAVAILABLE" },
    admin,
  );
  const updated = await prisma.transportRequest.findUnique({ where: { id: r.id } });
  assert.equal(updated.status, "ASSIGNED");
  assert.equal(updated.alternativeReason, "REQUESTED_VEHICLE_UNAVAILABLE");
});

test("user can cancel their PENDING request", async () => {
  const r = await mkRequest();
  const c = await services.cancelRequest(r.id, { reason: "Changed mind" }, { id: rahim.id, name: rahim.name, role: "USER" });
  assert.equal(c.status, "CANCELLED");
});

test("user cannot cancel an ASSIGNED request", async () => {
  const r = await mkRequest();
  await services.approveRequest(r.id, {}, admin);
  await services.assignVehicleAndDriver(r.id, { vehicleId: smallVehicleId, driverId: availDriverId }, admin);
  await assert.rejects(
    () => services.cancelRequest(r.id, { reason: "nope" }, { id: rahim.id, name: rahim.name, role: "USER" }),
    /cannot cancel an assigned/i,
  );
});

test("admin can cancel an ASSIGNED request before start and releases resources", async () => {
  const r = await mkRequest();
  await services.approveRequest(r.id, {}, admin);
  await services.assignVehicleAndDriver(r.id, { vehicleId: smallVehicleId, driverId: availDriverId }, admin);
  await services.cancelRequest(r.id, { reason: "Operational" }, { id: admin.id, name: admin.name, role: "ADMIN" });
  const updated = await prisma.transportRequest.findUnique({ where: { id: r.id } });
  assert.equal(updated.status, "CANCELLED");
  const booking = await prisma.vehicleBooking.findFirst({ where: { requestId: r.id } });
  assert.equal(booking.status, "RELEASED");
});

test("a cancelled request cannot be cancelled again", async () => {
  const r = await mkRequest();
  await services.cancelRequest(r.id, { reason: "once" }, { id: rahim.id, name: rahim.name, role: "USER" });
  await assert.rejects(
    () => services.cancelRequest(r.id, { reason: "twice" }, { id: rahim.id, name: rahim.name, role: "USER" }),
    /already cancelled/i,
  );
});

test("completing a trip sets the driver to AWAITING_CONFIRMATION", async () => {
  const vehicle = await freshVehicle();
  const driver = await freshDriver();
  const r = await mkRequest({ startDateTime: later(-1), endDateTime: later(1) });
  await services.approveRequest(r.id, {}, admin);
  await services.assignVehicleAndDriver(r.id, { vehicleId: vehicle, driverId: driver }, admin);
  await services.startTrip(r.id, driver);
  await services.completeTrip(r.id, driver);

  const d = await prisma.driver.findUnique({ where: { id: driver } });
  assert.equal(d.operationalStatus, "AWAITING_CONFIRMATION");
  const updated = await prisma.transportRequest.findUnique({ where: { id: r.id } });
  assert.equal(updated.status, "COMPLETED");
});

test("reopening a rejected request returns it to PENDING", async () => {
  const r = await mkRequest();
  await services.rejectRequest(r.id, { reason: "nope" }, admin);
  const reopened = await services.reopenRequest(r.id, { reason: "reconsidered" }, admin);
  assert.equal(reopened.status, "PENDING");
});
