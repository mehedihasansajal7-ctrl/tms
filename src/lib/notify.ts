import { prisma } from "./prisma";

interface NotifyInput {
  userId?: string | null;
  driverId?: string | null;
  type: string;
  title: string;
  message: string;
  refType?: string | null;
  refId?: string | null;
}

// Create an in-app notification for a user and/or driver.
// The service is intentionally a thin wrapper so email/SMS/WhatsApp providers
// can be added later without touching call sites.
export async function notify(input: NotifyInput) {
  if (!input.userId && !input.driverId) return;
  await prisma.notification.create({
    data: {
      userId: input.userId ?? null,
      driverId: input.driverId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      refType: input.refType ?? null,
      refId: input.refId ?? null,
    },
  });
}

// Notify every active admin (used for "pending action" style alerts).
export async function notifyAdmins(input: Omit<NotifyInput, "userId" | "driverId">) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true },
  });
  await Promise.all(
    admins.map((a) => notify({ ...input, userId: a.id })),
  );
}
