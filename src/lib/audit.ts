import { prisma } from "./prisma";

interface AuditInput {
  actorId?: string | null;
  actorKind?: "USER" | "DRIVER" | "SYSTEM" | null;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  previousData?: unknown;
  newData?: unknown;
  reason?: string | null;
  metadata?: unknown;
}

// Write an immutable audit event. The audit log has no update/delete API.
export async function writeAudit(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorKind: input.actorKind ?? null,
      actorName: input.actorName ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      previousData: input.previousData ? JSON.stringify(input.previousData) : null,
      newData: input.newData ? JSON.stringify(input.newData) : null,
      reason: input.reason ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}
