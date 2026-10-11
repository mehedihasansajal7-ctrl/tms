import { z } from "zod";
import { cookies } from "next/headers";
import { handle, json, readJson } from "@/lib/api";
import { authenticate } from "@/modules/auth/auth.service";
import { signSession, SESSION_COOKIE, type SessionPayload } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST = handle(async (req) => {
  const body = loginSchema.parse(await readJson(req));

  const account = await authenticate(body.email, body.password);
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

  return json({ ok: true, role: payload.role, name: payload.name, kind: payload.kind });
});

export const DELETE = handle(async () => {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return json({ ok: true });
});
