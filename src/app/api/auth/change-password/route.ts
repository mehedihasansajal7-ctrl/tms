import { z } from "zod";
import { handle, json, readJson } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { changePassword } from "@/modules/auth/auth.service";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export const POST = handle(async (req) => {
  const session = await requireSession();
  const body = schema.parse(await readJson(req));
  await changePassword(session, body.currentPassword, body.newPassword);
  return json({ ok: true });
});
