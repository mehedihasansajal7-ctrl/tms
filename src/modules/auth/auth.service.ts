import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { AppError, ErrorCodes } from "@/lib/errors";
import { ROLES } from "@/lib/constants";

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export interface AuthDriver {
  id: string;
  name: string;
  email: string;
  status: string;
  operationalStatus: string;
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new AppError("Invalid email or password", 401, ErrorCodes.UNAUTHORIZED);
  }
  if (user.status !== "ACTIVE") {
    throw new AppError("This account is inactive. Contact an administrator.", 403, ErrorCodes.FORBIDDEN);
  }
  return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status };
}

export async function authenticateDriver(email: string, password: string): Promise<AuthDriver> {
  const driver = await prisma.driver.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!driver || !verifyPassword(password, driver.passwordHash)) {
    throw new AppError("Invalid email or password", 401, ErrorCodes.UNAUTHORIZED);
  }
  if (driver.status !== "ACTIVE") {
    throw new AppError("This account is inactive. Contact an administrator.", 403, ErrorCodes.FORBIDDEN);
  }
  return {
    id: driver.id,
    name: driver.name,
    email: driver.email,
    status: driver.status,
    operationalStatus: driver.operationalStatus,
  };
}

// Validate that a user is allowed to exist (used by direct creation + import).
export function validateRole(role: string): string {
  const r = role?.toUpperCase?.();
  if (r !== ROLES.ADMIN && r !== ROLES.USER) return ROLES.USER;
  return r;
}
