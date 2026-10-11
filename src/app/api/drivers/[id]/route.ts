import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { getDriver, updateDriver } from "@/modules/drivers/driver.service";

export const GET = handle(async (_req, ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  if (session.role !== "ADMIN" && session.sub !== id) {
    requireAdmin(session);
  }
  return json(await getDriver(id));
});

export const PATCH = handle(async (req, ctx) => {
  const session = requireAdmin(await requireSession());
  const { id } = await ctx.params;
  const body = await readJson(req);
  return json(await updateDriver(id, body, { id: session.sub, name: session.name }));
});
