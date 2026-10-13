import { prisma } from "./prisma";
import { sendEmail } from "./email";

interface NotifyInput {
  userId?: string | null;
  driverId?: string | null;
  type: string;
  title: string;
  message: string;
  refType?: string | null;
  refId?: string | null;
}

// Create an in-app notification for a user and/or driver, and (best-effort)
// email the recipient. Email is fire-and-forget so it never blocks the response.
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

  // Resolve the recipient's email and send (non-blocking).
  void (async () => {
    try {
      let email: string | null = null;
      if (input.userId) {
        const u = await prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } });
        email = u?.email ?? null;
      } else if (input.driverId) {
        const d = await prisma.driver.findUnique({ where: { id: input.driverId }, select: { email: true } });
        email = d?.email ?? null;
      }
      if (email) await sendEmail(email, input.title, input.message);
    } catch {
      // ignore email errors — in-app notification already persisted
    }
  })();
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
