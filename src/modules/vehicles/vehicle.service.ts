import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AppError, ErrorCodes } from "@/lib/errors";
import { VEHICLE_STATUS } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";

export const vehicleTypeSchema = z.object({
  name: z.string().min(1).transform((s) => s.trim().toUpperCase()),
  capacity: z.coerce.number().int().positive(),
  active: z.boolean().default(true),
});

export const vehicleSchema = z.object({
  registrationNumber: z.string().min(1, "Registration number is required").transform((s) => s.trim().toUpperCase()),
  vehicleTypeId: z.string().min(1),
  capacity: z.coerce.number().int().positive().optional(),
  status: z.enum([VEHICLE_STATUS.AVAILABLE, VEHICLE_STATUS.MAINTENANCE, VEHICLE_STATUS.INACTIVE]).optional(),
});

export async function listVehicleTypes(activeOnly = false) {
  return prisma.vehicleType.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { capacity: "asc" },
  });
}

export async function getVehicleType(id: string) {
  const t = await prisma.vehicleType.findUnique({ where: { id } });
  if (!t) throw new AppError("Vehicle type not found", 404, ErrorCodes.NOT_FOUND);
  return t;
}

export async function createVehicleType(data: z.infer<typeof vehicleTypeSchema>, actor?: { id: string; name: string }) {
  const parsed = vehicleTypeSchema.parse(data);
  const t = await prisma.vehicleType.create({
    data: { name: parsed.name, capacity: parsed.capacity, active: parsed.active },
  });
  await writeAudit({
    actorId: actor?.id,
    actorKind: "USER",
    actorName: actor?.name,
    action: "VEHICLE_TYPE_CREATED",
    entityType: "VehicleType",
    entityId: t.id,
    newData: t,
  });
  return t;
}

export async function updateVehicleType(id: string, data: Partial<z.infer<typeof vehicleTypeSchema>>, actor?: { id: string; name: string }) {
  const t = await prisma.vehicleType.update({ where: { id }, data });
  await writeAudit({
    actorId: actor?.id,
    actorKind: "USER",
    actorName: actor?.name,
    action: "VEHICLE_TYPE_UPDATED",
    entityType: "VehicleType",
    entityId: id,
    newData: t,
  });
  return t;
}

export async function listVehicles(filters: { q?: string; typeId?: string; status?: string } = {}) {
  const where: Record<string, unknown> = {};
  if (filters.q) where.registrationNumber = { contains: filters.q };
  if (filters.typeId) where.vehicleTypeId = filters.typeId;
  if (filters.status) where.status = filters.status;
  return prisma.vehicle.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { vehicleType: true },
  });
}

export async function getVehicle(id: string) {
  const v = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      vehicleType: true,
      bookings: {
        where: { status: "ACTIVE" },
        include: { request: { select: { requestNumber: true, requester: { select: { name: true } } } } },
        orderBy: { startDateTime: "asc" },
      },
    },
  });
  if (!v) throw new AppError("Vehicle not found", 404, ErrorCodes.NOT_FOUND);
  return v;
}

export async function createVehicle(data: z.infer<typeof vehicleSchema>, actor?: { id: string; name: string }) {
  const parsed = vehicleSchema.parse(data);
  const type = await getVehicleType(parsed.vehicleTypeId);
  const capacity = parsed.capacity ?? type.capacity;
  const v = await prisma.vehicle.create({
    data: {
      registrationNumber: parsed.registrationNumber,
      vehicleTypeId: parsed.vehicleTypeId,
      capacity,
      status: parsed.status ?? VEHICLE_STATUS.AVAILABLE,
    },
  });
  await writeAudit({
    actorId: actor?.id,
    actorKind: "USER",
    actorName: actor?.name,
    action: "VEHICLE_CREATED",
    entityType: "Vehicle",
    entityId: v.id,
    newData: v,
  });
  return v;
}

export async function updateVehicle(id: string, data: Partial<z.infer<typeof vehicleSchema>>, actor?: { id: string; name: string }) {
  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) throw new AppError("Vehicle not found", 404, ErrorCodes.NOT_FOUND);
  let capacity = data.capacity ?? existing.capacity;
  if (data.vehicleTypeId && data.vehicleTypeId !== existing.vehicleTypeId) {
    const type = await getVehicleType(data.vehicleTypeId);
    capacity = data.capacity ?? type.capacity;
  }
  const v = await prisma.vehicle.update({
    where: { id },
    data: {
      registrationNumber: data.registrationNumber,
      vehicleTypeId: data.vehicleTypeId,
      capacity,
      status: data.status,
    },
  });
  await writeAudit({
    actorId: actor?.id,
    actorKind: "USER",
    actorName: actor?.name,
    action: "VEHICLE_UPDATED",
    entityType: "Vehicle",
    entityId: id,
    previousData: { status: existing.status },
    newData: v,
  });
  return v;
}

export async function setVehicleStatus(id: string, status: z.infer<typeof vehicleSchema>["status"], actor?: { id: string; name: string }) {
  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) throw new AppError("Vehicle not found", 404, ErrorCodes.NOT_FOUND);
  const v = await prisma.vehicle.update({ where: { id }, data: { status } });
  await writeAudit({
    actorId: actor?.id,
    actorKind: "USER",
    actorName: actor?.name,
    action: "VEHICLE_STATUS_CHANGED",
    entityType: "Vehicle",
    entityId: id,
    previousData: { status: existing.status },
    newData: { status },
  });
  return v;
}
