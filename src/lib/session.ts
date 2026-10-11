import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./auth";
import { AppError, ErrorCodes } from "./errors";

// Resolve the current session from the httpOnly cookie (server-side only).
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AppError("Authentication required", 401, ErrorCodes.UNAUTHORIZED);
  return session;
}
