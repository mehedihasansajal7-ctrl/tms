import { z } from "zod";
import { handle, json, readJson } from "@/lib/api";
import { resetPasswordWithToken } from "@/modules/auth/auth.service";
import { AppError } from "@/lib/errors";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

export const POST = handle(async (req) => {
  const rl = rateLimit(`reset:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!rl.ok) {
    throw new AppError(`Too many attempts. Try again in ${rl.retryAfterSeconds} second(s).`, 429, "RATE_LIMITED");
  }
  const body = schema.parse(await readJson(req));
  await resetPasswordWithToken(body.token, body.newPassword);
  return json({ ok: true });
});
