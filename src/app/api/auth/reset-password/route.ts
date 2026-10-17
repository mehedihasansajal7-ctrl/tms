import { z } from "zod";
import { handle, json, readJson } from "@/lib/api";
import { resetPasswordWithToken } from "@/modules/auth/auth.service";

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

export const POST = handle(async (req) => {
  const body = schema.parse(await readJson(req));
  await resetPasswordWithToken(body.token, body.newPassword);
  return json({ ok: true });
});
