import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { listVehicles, createVehicle, vehicleSchema } from "@/modules/vehicles/vehicle.service";

export const GET = handle(async (req) => {
  requireAdmin(await requireSession());
  const sp = new URL(req.url).searchParams;
  return json(await listVehicles({
    q: sp.get("q") ?? undefined,
    typeId: sp.get("typeId") ?? undefined,
    status: sp.get("status") ?? undefined,
  }));
});

export const POST = handle(async (req) => {
  const session = requireAdmin(await requireSession());
  const body = vehicleSchema.parse(await readJson(req));
  return json(await createVehicle(body, { id: session.sub, name: session.name }), 201);
});
