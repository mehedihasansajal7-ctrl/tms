import { handle, json } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { markAllRead } from "@/modules/notifications/notification.service";

export const POST = handle(async () => {
  const session = await requireSession();
  const recipient = session.kind === "driver" ? { driverId: session.sub } : { userId: session.sub };
  await markAllRead(recipient);
  return json({ ok: true });
});
