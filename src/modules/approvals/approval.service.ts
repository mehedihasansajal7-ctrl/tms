import { AppError, ErrorCodes } from "@/lib/errors";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { REQUEST_STATUS, APPROVAL_ACTION } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { assertTransition } from "../requests/request.service";

export const approveSchema = z.object({ comment: z.string().optional().nullable() });
export const rejectSchema = z.object({ reason: z.string().min(1, "Rejection reason is required") });
export const reopenSchema = z.object({ reason: z.string().min(1, "Reopen reason is required") });

async function assertAdminCanDecide(request: { requesterId: string }, actorId: string) {
  // Administrators cannot approve their own requests (spec §10).
  if (request.requesterId === actorId) {
    throw new AppError("You cannot approve or reject your own request", 403, ErrorCodes.FORBIDDEN);
  }
}

export async function approveRequest(id: string, data: z.infer<typeof approveSchema>, actor: { id: string; name: string }) {
  const existing = await prisma.transportRequest.findUnique({ where: { id } });
  if (!existing) throw new AppError("Request not found", 404, ErrorCodes.NOT_FOUND);
  await assertAdminCanDecide(existing, actor.id);
  assertTransition(existing.status, REQUEST_STATUS.APPROVED);

  const parsed = approveSchema.parse(data);
  const request = await prisma.transportRequest.update({
    where: { id },
    data: {
      status: REQUEST_STATUS.APPROVED,
      approvedBy: actor.id,
      approvedAt: new Date(),
      approvalComment: parsed.comment ?? null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
    },
  });

  await prisma.requestApproval.create({
    data: { requestId: id, action: APPROVAL_ACTION.APPROVED, actorId: actor.id, reason: parsed.comment ?? null },
  });
  await writeAudit({
    actorId: actor.id,
    actorKind: "USER",
    actorName: actor.name,
    action: "REQUEST_APPROVED",
    entityType: "TransportRequest",
    entityId: id,
    previousData: { status: existing.status },
    newData: { status: REQUEST_STATUS.APPROVED },
    reason: parsed.comment,
  });
  await notify({
    userId: existing.requesterId,
    type: "REQUEST_APPROVED",
    title: "Request approved",
    message: `Your request ${existing.requestNumber} was approved and is now eligible for assignment.`,
    refType: "REQUEST",
    refId: id,
  });

  return request;
}

export async function rejectRequest(id: string, data: z.infer<typeof rejectSchema>, actor: { id: string; name: string }) {
  const existing = await prisma.transportRequest.findUnique({ where: { id } });
  if (!existing) throw new AppError("Request not found", 404, ErrorCodes.NOT_FOUND);
  await assertAdminCanDecide(existing, actor.id);
  assertTransition(existing.status, REQUEST_STATUS.REJECTED);

  const parsed = rejectSchema.parse(data);
  const request = await prisma.transportRequest.update({
    where: { id },
    data: {
      status: REQUEST_STATUS.REJECTED,
      rejectedBy: actor.id,
      rejectedAt: new Date(),
      rejectionReason: parsed.reason,
    },
  });

  await prisma.requestApproval.create({
    data: { requestId: id, action: APPROVAL_ACTION.REJECTED, actorId: actor.id, reason: parsed.reason },
  });
  await writeAudit({
    actorId: actor.id,
    actorKind: "USER",
    actorName: actor.name,
    action: "REQUEST_REJECTED",
    entityType: "TransportRequest",
    entityId: id,
    previousData: { status: existing.status },
    newData: { status: REQUEST_STATUS.REJECTED },
    reason: parsed.reason,
  });
  await notify({
    userId: existing.requesterId,
    type: "REQUEST_REJECTED",
    title: "Request rejected",
    message: `Your request ${existing.requestNumber} was rejected. Reason: ${parsed.reason}`,
    refType: "REQUEST",
    refId: id,
  });

  return request;
}

// Reopen a rejected/cancelled request back into PENDING (spec §41).
export async function reopenRequest(id: string, data: z.infer<typeof reopenSchema>, actor: { id: string; name: string }) {
  const existing = await prisma.transportRequest.findUnique({ where: { id } });
  if (!existing) throw new AppError("Request not found", 404, ErrorCodes.NOT_FOUND);
  if (existing.status !== REQUEST_STATUS.REJECTED && existing.status !== REQUEST_STATUS.CANCELLED) {
    throw new AppError(`Only rejected or cancelled requests can be reopened (current: ${existing.status})`, 400, ErrorCodes.INVALID_TRANSITION);
  }

  const parsed = reopenSchema.parse(data);
  const request = await prisma.transportRequest.update({
    where: { id },
    data: {
      status: REQUEST_STATUS.PENDING,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      cancelledBy: null,
      cancelledAt: null,
      cancellationReason: null,
      cancellationActorRole: null,
      cancellationNotes: null,
    },
  });

  await prisma.requestApproval.create({
    data: { requestId: id, action: APPROVAL_ACTION.REOPENED, actorId: actor.id, reason: parsed.reason },
  });
  await writeAudit({
    actorId: actor.id,
    actorKind: "USER",
    actorName: actor.name,
    action: "REQUEST_REOPENED",
    entityType: "TransportRequest",
    entityId: id,
    previousData: { status: existing.status },
    newData: { status: REQUEST_STATUS.PENDING },
    reason: parsed.reason,
  });
  await notify({
    userId: existing.requesterId,
    type: "REQUEST_REOPENED",
    title: "Request reopened",
    message: `Your request ${existing.requestNumber} was reopened and is pending approval again.`,
    refType: "REQUEST",
    refId: id,
  });

  return request;
}
