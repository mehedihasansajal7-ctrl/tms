import { handle, json } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { completeTrip } from "@/modules/trips/trip.service";

export const POST = handle(async (_req, ctx) => {
  const session = await requireSession();
  if (session.kind !== "driver") throw Object.assign(new Error("Driver only"), { status: 403 });
  const { id } = await ctx.params;
  return json(await completeTrip(id, session.sub));
});
