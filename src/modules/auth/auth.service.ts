import { AppError, ErrorCodes } from "@/lib/errors";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
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

// --- Self-service password reset (forgot password) ------------------------
// Tokens are random, stored only as SHA-256 hashes, single-use, 1-hour expiry.

const RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Always resolves without revealing whether the email exists (prevents
// account-enumeration). Returns the token in dev only for easy testing.
export async function requestPasswordReset(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  const driver = user ? null : await prisma.driver.findUnique({ where: { email: normalized } });
  const account = user
    ? { kind: "USER" as const, email: user.email }
    : driver
      ? { kind: "DRIVER" as const, email: driver.email }
      : null;
  if (!account) return;

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      email: account.email,
      kind: account.kind,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const link = `${appUrl}/reset-password?token=${token}`;
  await sendEmail(
    account.email,
    "Reset your TMS password",
    `Use this link to reset your password (valid for 1 hour):\n\n${link}\n\nIf you did not request this, you can safely ignore this email.`,
  );
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 6) {
    throw new AppError("New password must be at least 6 characters", 400, ErrorCodes.VALIDATION);
  }
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new AppError("This reset link is invalid or has expired", 400, ErrorCodes.VALIDATION);
  }

  if (record.kind === "DRIVER") {
    const driver = await prisma.driver.findUnique({ where: { email: record.email } });
    if (!driver) throw new AppError("Account not found", 404, ErrorCodes.NOT_FOUND);
    await prisma.driver.update({ where: { id: driver.id }, data: { passwordHash: hashPassword(newPassword) } });
  } else {
    const user = await prisma.user.findUnique({ where: { email: record.email } });
    if (!user) throw new AppError("Account not found", 404, ErrorCodes.NOT_FOUND);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(newPassword) } });
  }
  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
}
