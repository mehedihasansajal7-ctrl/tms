import { z } from "zod";
import { handle, json, readJson } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { AppError, ErrorCodes } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  emailNotifications: z.boolean().optional(),
});

// Self-service profile edit. Users may change their own name/phone/department/
// designation (+ email-notification preference); drivers name/phone (+ the same
// preference). Role and status are NOT editable here.
export const PATCH = handle(async (req) => {
  const session = await requireSession();
  const body = schema.parse(await readJson(req));

  if (session.kind === "driver") {
    const driver = await prisma.driver.update({
      where: { id: session.sub },
      data: { name: body.name, phone: body.phone ?? undefined, emailNotifications: body.emailNotifications },
      select: { name: true, phone: true, email: true, licenseNumber: true, emailNotifications: true },
    });
    return json({ ok: true, profile: driver });
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) throw new AppError("Account not found", 404, ErrorCodes.NOT_FOUND);

  const updated = await prisma.user.update({
    where: { id: session.sub },
    data: {
      name: body.name,
      phone: body.phone ?? undefined,
      department: body.department ?? undefined,
      designation: body.designation ?? undefined,
      emailNotifications: body.emailNotifications,
    },
    select: { name: true, phone: true, email: true, department: true, designation: true, emailNotifications: true },
  });
  return json({ ok: true, profile: updated });
});

export const GET = handle(async () => {
  const session = await requireSession();
  if (session.kind === "driver") {
    const d = await prisma.driver.findUnique({
      where: { id: session.sub },
      select: { name: true, phone: true, email: true, licenseNumber: true, emailNotifications: true },
    });
    return json({ kind: "driver", profile: d });
  }
  const u = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { name: true, phone: true, email: true, department: true, designation: true, emailNotifications: true },
  });
  return json({ kind: "user", profile: u });
});
