import { handle, json } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { getRequestAvailability } from "@/modules/availability/availability.service";

export const GET = handle(async (_req, ctx) => {
  requireAdmin(await requireSession());
  const { id } = await ctx.params;
  return json(await getRequestAvailability(id));
});
