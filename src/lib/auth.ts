import { SignJWT, jwtVerify } from "jose";
import { ROLES } from "./constants";

export type SessionKind = "user" | "driver";

export interface SessionPayload {
  sub: string;
  kind: SessionKind;
  role: string;
  name: string;
}

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
};

export async function signSession(payload: SessionPayload): Promise<string> {
  const maxAge = Number(process.env.SESSION_MAX_AGE_SECONDS || 2592000);
  return new SignJWT({ kind: payload.kind, role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      kind: (payload.kind as SessionKind) || "user",
      role: String(payload.role ?? ROLES.USER),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "tms_session";

export function isAdmin(role: string): boolean {
  return role === ROLES.ADMIN;
}
