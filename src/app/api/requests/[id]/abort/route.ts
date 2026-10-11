import { z } from "zod";
import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { adminAbortTrip } from "@/modules/trips/trip.service";

const schema = z.object({ reason: z.string().min(1) });

export const POST = handle(async (req, ctx) => {
  const session = requireAdmin(await requireSession());
  const { id } = await ctx.params;
  const body = schema.parse(await readJson(req));
  return json(await adminAbortTrip(id, body.reason, { id: session.sub, name: session.name }));
});
