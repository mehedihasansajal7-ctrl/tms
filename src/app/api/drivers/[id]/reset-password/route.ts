import { z } from "zod";
import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { resetDriverPassword } from "@/modules/drivers/driver.service";

const schema = z.object({ password: z.string().min(6) });

export const POST = handle(async (req, ctx) => {
  const session = requireAdmin(await requireSession());
  const { id } = await ctx.params;
  const body = schema.parse(await readJson(req));
  await resetDriverPassword(id, body.password, { id: session.sub, name: session.name });
  return json({ ok: true });
});
