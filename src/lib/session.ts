import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./auth";

// Resolve the current session from the httpOnly cookie (server-side only).
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Unauthorized();
  return session;
}

// A small hierarchy: reuse AppError to avoid a circular import from errors.
class Unauthorized extends Error {
  status = 401;
  code = "UNAUTHORIZED";
  constructor() {
    super("Authentication required");
    this.name = "AppError";
  }
}
