import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { listVehicleTypes, createVehicleType, vehicleTypeSchema } from "@/modules/vehicles/vehicle.service";

export const GET = handle(async () => {
  requireAdmin(await requireSession());
  return json(await listVehicleTypes());
});

export const POST = handle(async (req) => {
  const session = requireAdmin(await requireSession());
  const body = vehicleTypeSchema.parse(await readJson(req));
  return json(await createVehicleType(body, { id: session.sub, name: session.name }), 201);
});
