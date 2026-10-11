import { prisma } from "@/lib/prisma";

export async function listNotifications(recipient: { userId?: string; driverId?: string }, limit = 50) {
  const where = recipient.userId
    ? { userId: recipient.userId }
    : recipient.driverId
      ? { driverId: recipient.driverId }
      : {};
  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function unreadCount(recipient: { userId?: string; driverId?: string }) {
  const where = recipient.userId
    ? { userId: recipient.userId, readAt: null }
    : recipient.driverId
      ? { driverId: recipient.driverId, readAt: null }
      : {};
  return prisma.notification.count({ where });
}

export async function markRead(id: string, recipient: { userId?: string; driverId?: string }) {
  const where = recipient.userId
    ? { userId: recipient.userId }
    : { driverId: recipient.driverId };
  await prisma.notification.updateMany({ where: { id, ...where, readAt: null }, data: { readAt: new Date() } });
}

export async function markAllRead(recipient: { userId?: string; driverId?: string }) {
  const where = recipient.userId
    ? { userId: recipient.userId }
    : { driverId: recipient.driverId };
  await prisma.notification.updateMany({ where: { ...where, readAt: null }, data: { readAt: new Date() } });
}
