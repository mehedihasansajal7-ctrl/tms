import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AppError, ErrorCodes } from "@/lib/errors";
import { ROLES } from "@/lib/constants";
import { hashPassword } from "../auth/auth.service";
import { writeAudit } from "@/lib/audit";

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").transform((s) => s.trim().toLowerCase()),
  phone: z.string().optional().nullable(),
  employeeId: z.string().min(1, "Employee ID is required"),
  department: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  role: z.enum([ROLES.ADMIN, ROLES.USER]).default(ROLES.USER),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  role: z.enum([ROLES.ADMIN, ROLES.USER]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const userFiltersSchema = z.object({
  q: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  department: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const PAGE_SIZE = 20;

export async function listUsers(filters: z.infer<typeof userFiltersSchema>) {
  const where: Record<string, unknown> = {};
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q } },
      { email: { contains: filters.q } },
      { employeeId: { contains: filters.q } },
      { phone: { contains: filters.q } },
      { department: { contains: filters.q } },
      { designation: { contains: filters.q } },
    ];
  }
  if (filters.role) where.role = filters.role;
  if (filters.status) where.status = filters.status;
  if (filters.department) where.department = filters.department;

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        employeeId: true,
        department: true,
        designation: true,
        role: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);
  return { total, page, pageSize, items };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError("User not found", 404, ErrorCodes.NOT_FOUND);
  const { passwordHash: _pw, ...rest } = user;

  // Aggregate request statistics for the profile view.
  const grouped = await prisma.transportRequest.groupBy({
    by: ["status"],
    where: { requesterId: id },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const g of grouped) counts[g.status] = g._count._all;

  return { ...rest, stats: { total: Object.values(counts).reduce((a, b) => a + b, 0), byStatus: counts } };
}

export async function createUser(data: z.infer<typeof createUserSchema>, actor?: { id: string; name: string }) {
  const parsed = createUserSchema.parse(data);
  const password = parsed.password || "ChangeMe123!";
  const user = await prisma.user.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone ?? null,
      employeeId: parsed.employeeId,
      department: parsed.department ?? null,
      designation: parsed.designation ?? null,
      role: parsed.role,
      status: parsed.status,
      passwordHash: hashPassword(password),
    },
    select: { id: true, name: true, email: true, employeeId: true, role: true, status: true },
  });
  await writeAudit({
    actorId: actor?.id,
    actorKind: "USER",
    actorName: actor?.name,
    action: "USER_CREATED",
    entityType: "User",
    entityId: user.id,
    newData: user,
  });
  return user;
}

export async function updateUser(id: string, data: z.infer<typeof updateUserSchema>, actor?: { id: string; name: string }) {
  const parsed = updateUserSchema.parse(data);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new AppError("User not found", 404, ErrorCodes.NOT_FOUND);

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: parsed.name,
      phone: parsed.phone,
      department: parsed.department,
      designation: parsed.designation,
      role: parsed.role,
      status: parsed.status,
    },
    select: { id: true, name: true, email: true, employeeId: true, role: true, status: true },
  });
  await writeAudit({
    actorId: actor?.id,
    actorKind: "USER",
    actorName: actor?.name,
    action: "USER_UPDATED",
    entityType: "User",
    entityId: id,
    previousData: { role: existing.role, status: existing.status, name: existing.name },
    newData: user,
  });
  return user;
}

export async function resetUserPassword(id: string, newPassword: string, actor?: { id: string; name: string }) {
  if (!newPassword || newPassword.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400, ErrorCodes.VALIDATION);
  }
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new AppError("User not found", 404, ErrorCodes.NOT_FOUND);
  await prisma.user.update({ where: { id }, data: { passwordHash: hashPassword(newPassword) } });
  await writeAudit({
    actorId: actor?.id,
    actorKind: "USER",
    actorName: actor?.name,
    action: "USER_PASSWORD_RESET",
    entityType: "User",
    entityId: id,
  });
}
