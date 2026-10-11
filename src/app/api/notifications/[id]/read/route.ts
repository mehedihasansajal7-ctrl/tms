import { handle, json } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { markRead } from "@/modules/notifications/notification.service";

export const POST = handle(async (_req, ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  const recipient = session.kind === "driver" ? { driverId: session.sub } : { userId: session.sub };
  await markRead(id, recipient);
  return json({ ok: true });
});
