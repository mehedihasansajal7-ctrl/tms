import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { setOperationalStatus, operationalStatusSchema } from "@/modules/drivers/driver.service";

export const POST = handle(async (req, ctx) => {
  const session = requireAdmin(await requireSession());
  const { id } = await ctx.params;
  const body = operationalStatusSchema.parse(await readJson(req));
  const driver = await setOperationalStatus(id, body.status, {
    reason: body.reason,
    actorId: session.sub,
    actorKind: "USER",
    actorName: session.name,
  });
  return json(driver);
});
