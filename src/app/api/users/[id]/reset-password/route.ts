import { z } from "zod";
import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { resetUserPassword } from "@/modules/users/user.service";

const schema = z.object({ password: z.string().min(6) });

export const POST = handle(async (req, ctx) => {
  const session = requireAdmin(await requireSession());
  const { id } = await ctx.params;
  const body = schema.parse(await readJson(req));
  await resetUserPassword(id, body.password, { id: session.sub, name: session.name });
  return json({ ok: true });
});
