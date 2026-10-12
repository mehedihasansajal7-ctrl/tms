import { AppError, ErrorCodes } from "@/lib/errors";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export interface Authenticated {
  id: string;
  name: string;
  email: string;
  kind: "user" | "driver";
  role: string;
}

// Auto-detect the account type from the email: look up the email in the User
// table (admin/staff), then the Driver table. Whoever matches wins.
export async function authenticate(email: string, password: string): Promise<Authenticated> {
  const normalized = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (user && verifyPassword(password, user.passwordHash)) {
    if (user.status !== "ACTIVE") {
      throw new AppError("This account is inactive. Contact an administrator.", 403, ErrorCodes.FORBIDDEN);
    }
    return { id: user.id, name: user.name, email: user.email, kind: "user", role: user.role };
  }

  const driver = await prisma.driver.findUnique({ where: { email: normalized } });
  if (driver && verifyPassword(password, driver.passwordHash)) {
    if (driver.status !== "ACTIVE") {
      throw new AppError("This account is inactive. Contact an administrator.", 403, ErrorCodes.FORBIDDEN);
    }
    return { id: driver.id, name: driver.name, email: driver.email, kind: "driver", role: ROLES.DRIVER };
  }

  throw new AppError("Invalid email or password", 401, ErrorCodes.UNAUTHORIZED);
}

// Validate that a user is allowed to exist (used by direct creation + import).
export function validateRole(role: string): string {
  const r = role?.toUpperCase?.();
  if (r !== ROLES.ADMIN && r !== ROLES.USER) return ROLES.USER;
  return r;
}

// Change the current user's/driver's own password (verifies current one first).
export async function changePassword(
  session: { sub: string; kind: string },
  currentPassword: string,
  newPassword: string,
) {
  if (newPassword.length < 6) {
    throw new AppError("New password must be at least 6 characters", 400, ErrorCodes.VALIDATION);
  }
  if (session.kind === "driver") {
    const driver = await prisma.driver.findUnique({ where: { id: session.sub } });
    if (!driver || !verifyPassword(currentPassword, driver.passwordHash)) {
      throw new AppError("Current password is incorrect", 400, ErrorCodes.VALIDATION);
    }
    await prisma.driver.update({ where: { id: session.sub }, data: { passwordHash: hashPassword(newPassword) } });
  } else {
    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
      throw new AppError("Current password is incorrect", 400, ErrorCodes.VALIDATION);
    }
    await prisma.user.update({ where: { id: session.sub }, data: { passwordHash: hashPassword(newPassword) } });
  }
}
