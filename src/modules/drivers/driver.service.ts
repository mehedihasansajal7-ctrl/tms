import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AppError, ErrorCodes } from "@/lib/errors";
import { DRIVER_OPERATIONAL_STATUS } from "@/lib/constants";
import { hashPassword } from "../auth/auth.service";
import { writeAudit } from "@/lib/audit";
import { type TripState } from "@/lib/overlap";

export const driverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").transform((s) => s.trim().toLowerCase()),
  phone: z.string().optional().nullable(),
  licenseNumber: z.string().min(1, "License number is required"),
  licenseExpiry: z.coerce.date().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  operationalStatus: z
    .enum([
      DRIVER_OPERATIONAL_STATUS.AVAILABLE,
      DRIVER_OPERATIONAL_STATUS.UNAVAILABLE,
      DRIVER_OPERATIONAL_STATUS.AWAITING_CONFIRMATION,
    ])
    .optional(),
  password: z.string().min(6).optional(),
});

export const operationalStatusSchema = z.object({
  status: z.enum([
    DRIVER_OPERATIONAL_STATUS.AVAILABLE,
    DRIVER_OPERATIONAL_STATUS.UNAVAILABLE,
    DRIVER_OPERATIONAL_STATUS.AWAITING_CONFIRMATION,
  ]),
  reason: z.string().optional().nullable(),
});

export async function listDrivers(filters: { q?: string; status?: string; operationalStatus?: string } = {}) {
  const where: Record<string, unknown> = {};
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q } },
      { email: { contains: filters.q } },
      { phone: { contains: filters.q } },
      { licenseNumber: { contains: filters.q } },
    ];
  }
  if (filters.status) where.status = filters.status;
  if (filters.operationalStatus) where.operationalStatus = filters.operationalStatus;
  return prisma.driver.findMany({ where, orderBy: { name: "asc" } });
}

export async function getDriver(id: string) {
  const driver = await prisma.driver.findUnique({
    where: { id },
    include: {
      assignments: {
        where: { status: "ACTIVE" },
        include: { request: { select: { requestNumber: true, startDateTime: true, endDateTime: true } } },
        orderBy: { startDateTime: "asc" },
      },
    },
  });
  if (!driver) throw new AppError("Driver not found", 404, ErrorCodes.NOT_FOUND);
  const { passwordHash: _pw, ...rest } = driver;
  return { ...rest, tripState: tripStateFromAssignments(driver.assignments) };
}

function tripStateFromAssignments(
  assignments: { startDateTime: Date; endDateTime: Date }[],
  now = new Date(),
): TripState {
  for (const a of assignments) {
    if (now.getTime() < a.endDateTime.getTime() && now.getTime() >= a.startDateTime.getTime()) return "ON_TRIP";
  }
  for (const a of assignments) {
    if (now.getTime() < a.startDateTime.getTime()) return "BOOKED";
  }
  return "IDLE";
}

export async function createDriver(data: z.infer<typeof driverSchema>, actor?: { id: string; name: string }) {
  const parsed = driverSchema.parse(data);
  const password = parsed.password || "ChangeMe123!";
  const driver = await prisma.driver.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone ?? null,
      licenseNumber: parsed.licenseNumber,
      licenseExpiry: parsed.licenseExpiry ?? null,
      status: parsed.status,
      operationalStatus: parsed.operationalStatus ?? DRIVER_OPERATIONAL_STATUS.AWAITING_CONFIRMATION,
      passwordHash: hashPassword(password),
    },
    select: { id: true, name: true, email: true, licenseNumber: true, status: true, operationalStatus: true },
  });
  await writeAudit({
    actorId: actor?.id,
    actorKind: "USER",
    actorName: actor?.name,
    action: "DRIVER_CREATED",
    entityType: "Driver",
    entityId: driver.id,
    newData: driver,
  });
  return driver;
}

export async function updateDriver(id: string, data: Partial<z.infer<typeof driverSchema>>, actor?: { id: string; name: string }) {
  const existing = await prisma.driver.findUnique({ where: { id } });
  if (!existing) throw new AppError("Driver not found", 404, ErrorCodes.NOT_FOUND);
  const driver = await prisma.driver.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      licenseNumber: data.licenseNumber,
      licenseExpiry: data.licenseExpiry,
      status: data.status,
      operationalStatus: data.operationalStatus,
    },
    select: { id: true, name: true, email: true, licenseNumber: true, status: true, operationalStatus: true },
  });
  await writeAudit({
    actorId: actor?.id,
    actorKind: "USER",
    actorName: actor?.name,
    action: "DRIVER_UPDATED",
    entityType: "Driver",
    entityId: id,
    previousData: { status: existing.status, operationalStatus: existing.operationalStatus },
    newData: driver,
  });
  return driver;
}

// Change a driver's operational status. Used by admin (override) and by the
// driver themself (post-trip confirmation). Always records history + audit.
export async function setOperationalStatus(
  id: string,
  status: string,
  opts: { reason?: string | null; actorId?: string | null; actorKind?: "USER" | "DRIVER"; actorName?: string | null } = {},
) {
  const existing = await prisma.driver.findUnique({ where: { id } });
  if (!existing) throw new AppError("Driver not found", 404, ErrorCodes.NOT_FOUND);

  const driver = await prisma.driver.update({ where: { id }, data: { operationalStatus: status } });

  await prisma.driverAvailabilityHistory.create({
    data: {
      driverId: id,
      previousStatus: existing.operationalStatus,
      newStatus: status,
      reason: opts.reason ?? null,
      changedBy: opts.actorId ?? null,
    },
  });
  await writeAudit({
    actorId: opts.actorId,
    actorKind: opts.actorKind ?? (opts.actorId ? "USER" : "SYSTEM"),
    actorName: opts.actorName,
    action: "DRIVER_OPERATIONAL_STATUS_CHANGED",
    entityType: "Driver",
    entityId: id,
    previousData: { operationalStatus: existing.operationalStatus },
    newData: { operationalStatus: status },
    reason: opts.reason,
  });
  return driver;
}

// Driver self-service after completing a trip (spec §27, §90).
export async function confirmAvailability(id: string, available: boolean) {
  const status = available
    ? DRIVER_OPERATIONAL_STATUS.AVAILABLE
    : DRIVER_OPERATIONAL_STATUS.UNAVAILABLE;
  return setOperationalStatus(id, status, {
    actorId: id,
    actorKind: "DRIVER",
    actorName: null,
    reason: available ? "Driver confirmed available" : "Driver confirmed unavailable",
  });
}

export async function resetDriverPassword(id: string, newPassword: string, actor?: { id: string; name: string }) {
  if (!newPassword || newPassword.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400, ErrorCodes.VALIDATION);
  }
  await prisma.driver.update({ where: { id }, data: { passwordHash: hashPassword(newPassword) } });
  await writeAudit({
    actorId: actor?.id,
    actorKind: "USER",
    actorName: actor?.name,
    action: "DRIVER_PASSWORD_RESET",
    entityType: "Driver",
    entityId: id,
  });
}
