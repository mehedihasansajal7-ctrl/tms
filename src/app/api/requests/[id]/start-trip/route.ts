import { AppError } from "@/lib/errors";
import { handle, json } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { startTrip } from "@/modules/trips/trip.service";

export const POST = handle(async (_req, ctx) => {
  const session = await requireSession();
  if (session.kind !== "driver") throw new AppError("Driver only", 403, "FORBIDDEN");
  const { id } = await ctx.params;
  return json(await startTrip(id, session.sub));
});
