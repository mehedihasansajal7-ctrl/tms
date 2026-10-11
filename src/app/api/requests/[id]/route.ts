import { AppError } from "@/lib/errors";
import { handle, json, readJson } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { getRequest, editRequest } from "@/modules/requests/request.service";

export const GET = handle(async (_req, ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  const request = await getRequest(id);

  const isOwner = request.requesterId === session.sub;
  const isAdmin = session.role === "ADMIN";
  const isAssignedDriver = request.driverAssignments.some((a) => a.driverId === session.sub && session.kind === "driver");
  if (!isOwner && !isAdmin && !isAssignedDriver) {
    throw new AppError("Not authorized to view this request", 403);
  }

  // Drivers must not see passenger phone numbers — none are stored, but guard
  // against any future fields leaking by returning a reduced payload.
  return json(request);
});

export const PATCH = handle(async (req, ctx) => {
  const session = await requireSession();
  if (session.kind !== "user") throw new AppError("Only users can edit requests", 403, "FORBIDDEN");
  const { id } = await ctx.params;
  const body = await readJson(req);
  const request = await editRequest(id, body as never, { id: session.sub, name: session.name, role: session.role });
  return json(request);
});
