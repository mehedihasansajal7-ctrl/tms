import { z } from "zod";
import { cookies } from "next/headers";
import { handle, json, readJson } from "@/lib/api";
import { authenticateUser, authenticateDriver } from "@/modules/auth/auth.service";
import { signSession, SESSION_COOKIE, SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { ROLES } from "@/lib/constants";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  kind: z.enum(["user", "driver"]).default("user"),
});

export const POST = handle(async (req) => {
  const body = loginSchema.parse(await readJson(req));

  let payload: SessionPayload;
  if (body.kind === "driver") {
    const driver = await authenticateDriver(body.email, body.password);
    payload = { sub: driver.id, kind: "driver", role: ROLES.DRIVER, name: driver.name };
  } else {
    const user = await authenticateUser(body.email, body.password);
    payload = { sub: user.id, kind: "user", role: user.role, name: user.name };
  }

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
