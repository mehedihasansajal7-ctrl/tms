import { prisma } from "@/lib/prisma";

export async function listAuditLogs(filters: {
  q?: string;
  action?: string;
  entityType?: string;
  page?: number;
  pageSize?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters.action) where.action = filters.action;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.q) {
    where.OR = [
      { actorName: { contains: filters.q } },
      { entityId: { contains: filters.q } },
      { action: { contains: filters.q } },
    ];
  }
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { total, page, pageSize, items };
}
