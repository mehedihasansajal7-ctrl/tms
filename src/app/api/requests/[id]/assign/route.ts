import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { assignVehicleAndDriver, assignSchema } from "@/modules/assignments/assignment.service";

export const POST = handle(async (req, ctx) => {
  const session = requireAdmin(await requireSession());
  const { id } = await ctx.params;
  const body = assignSchema.parse(await readJson(req));
  return json(await assignVehicleAndDriver(id, body, { id: session.sub, name: session.name }));
});
