import { z } from "zod";
import { cookies } from "next/headers";
import { handle, json, readJson } from "@/lib/api";
import { authenticate } from "@/modules/auth/auth.service";
import { signSession, SESSION_COOKIE, type SessionPayload } from "@/lib/auth";
import { AppError, ErrorCodes } from "@/lib/errors";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const POST = handle(async (req) => {
  const body = loginSchema.parse(await readJson(req));
  const ip = clientIp(req);
  const email = body.email.trim().toLowerCase();

  // Brute-force protection: per-IP and per-email sliding windows.
  const byIp = rateLimit(`login:ip:${ip}`, 20, WINDOW_MS);
  const byEmail = rateLimit(`login:email:${email}`, 10, WINDOW_MS);
  if (!byIp.ok || !byEmail.ok) {
    const retry = Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds);
    throw new AppError(`Too many login attempts. Try again in ${retry} second(s).`, 429, "RATE_LIMITED");
  }

  let account;
  try {
    account = await authenticate(body.email, body.password);
  } catch (e) {
    await writeAudit({
      actorKind: "SYSTEM",
      action: "LOGIN_FAILED",
      entityType: "Auth",
      entityId: email,
      reason: e instanceof Error ? e.message : "authentication failed",
      metadata: { ip },
    });
    throw e;
  }

  const payload: SessionPayload = {
    sub: account.id,
    kind: account.kind,
    role: account.role,
    name: account.name,
  };

  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Number(process.env.SESSION_MAX_AGE_SECONDS || 2592000),
  });

  await writeAudit({
    actorId: account.id,
    actorKind: account.kind === "driver" ? "DRIVER" : "USER",
    actorName: account.name,
    action: "LOGIN",
    entityType: "Auth",
    entityId: account.id,
    metadata: { ip, role: account.role },
  });

  return json({ ok: true, role: payload.role, name: payload.name, kind: payload.kind });
});

export const DELETE = handle(async () => {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return json({ ok: true });
});
