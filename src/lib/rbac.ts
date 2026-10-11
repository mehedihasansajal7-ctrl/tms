import { AppError, ErrorCodes } from "./errors";
import { ROLES } from "./constants";
import type { SessionPayload } from "./auth";

// Server-side authorization helpers. Frontend UI is never the source of truth;
// every protected API route calls requireRole / requireAdmin / requireSelfOrAdmin.

export function requireRole(session: SessionPayload | null, allowed: string[]): SessionPayload {
  if (!session) throw new AppError("Authentication required", 401, ErrorCodes.UNAUTHORIZED);
  if (!allowed.includes(session.role)) {
    throw new AppError("You do not have permission to perform this action", 403, ErrorCodes.FORBIDDEN);
  }
  return session;
}

export function requireAdmin(session: SessionPayload | null): SessionPayload {
  return requireRole(session, [ROLES.ADMIN]);
}

export function requireDriver(session: SessionPayload | null): SessionPayload {
  return requireRole(session, [ROLES.DRIVER]);
}

export function requireUser(session: SessionPayload | null): SessionPayload {
  return requireRole(session, [ROLES.USER, ROLES.ADMIN]);
}
