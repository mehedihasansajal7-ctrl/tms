import { z } from "zod";
import { handle, json, readJson } from "@/lib/api";
import { requestPasswordReset } from "@/modules/auth/auth.service";

const schema = z.object({ email: z.string().email() });

export const POST = handle(async (req) => {
  const body = schema.parse(await readJson(req));
  await requestPasswordReset(body.email);
  // Always the same response — never reveal whether the email exists.
  return json({ ok: true, message: "If that email is registered, a reset link has been sent." });
});
