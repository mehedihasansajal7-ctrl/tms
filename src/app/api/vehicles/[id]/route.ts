import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { getVehicle, updateVehicle } from "@/modules/vehicles/vehicle.service";

export const GET = handle(async (_req, ctx) => {
  requireAdmin(await requireSession());
  const { id } = await ctx.params;
  return json(await getVehicle(id));
});

export const PATCH = handle(async (req, ctx) => {
  const session = requireAdmin(await requireSession());
  const { id } = await ctx.params;
  const body = await readJson(req);
  return json(await updateVehicle(id, body, { id: session.sub, name: session.name }));
});
