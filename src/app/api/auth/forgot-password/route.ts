import { z } from "zod";
import { handle, json, readJson } from "@/lib/api";
import { requestPasswordReset } from "@/modules/auth/auth.service";
import { AppError } from "@/lib/errors";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

export const POST = handle(async (req) => {
  const body = schema.parse(await readJson(req));
  const rl = rateLimit(`forgot:${clientIp(req)}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    throw new AppError(`Too many reset requests. Try again in ${rl.retryAfterSeconds} second(s).`, 429, "RATE_LIMITED");
  }
  await requestPasswordReset(body.email);
  // Always the same response — never reveal whether the email exists.
  return json({ ok: true, message: "If that email is registered, a reset link has been sent." });
});
