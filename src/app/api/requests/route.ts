import { AppError } from "@/lib/errors";
import { handle, json, readJson } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { createRequest, createRequestSchema, listRequests } from "@/modules/requests/request.service";

export const POST = handle(async (req) => {
  const session = await requireSession();
  if (session.kind !== "user") throw new AppError("Only users can create requests", 403, "FORBIDDEN");
  const body = createRequestSchema.parse(await readJson(req));
  const request = await createRequest(body, { id: session.sub, name: session.name });
  return json(request, 201);
});

export const GET = handle(async (req) => {
  const session = await requireSession();
  const sp = new URL(req.url).searchParams;

  const filters: Parameters<typeof listRequests>[0] = {
    status: sp.get("status") ?? undefined,
    q: sp.get("q") ?? undefined,
    vehicleTypeId: sp.get("vehicleTypeId") ?? undefined,
    from: sp.get("from") ? new Date(sp.get("from")!) : undefined,
    to: sp.get("to") ? new Date(sp.get("to")!) : undefined,
    page: sp.get("page") ? Number(sp.get("page")) : undefined,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : undefined,
  };

  if (session.role === "ADMIN") {
    const requesterId = sp.get("requesterId") ?? undefined;
    return json(await listRequests({ ...filters, requesterId }));
  }
  if (session.kind === "user") {
    return json(await listRequests({ ...filters, requesterId: session.sub }));
  }
  throw new AppError("Drivers use the driver trips endpoint", 403, "FORBIDDEN");
});
