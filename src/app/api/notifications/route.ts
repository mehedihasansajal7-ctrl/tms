import { handle, json } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { listNotifications, unreadCount } from "@/modules/notifications/notification.service";

export const GET = handle(async () => {
  const session = await requireSession();
  const recipient = session.kind === "driver" ? { driverId: session.sub } : { userId: session.sub };
  const [notifications, unread] = await Promise.all([
    listNotifications(recipient),
    unreadCount(recipient),
  ]);
  return json({ notifications, unread });
});
