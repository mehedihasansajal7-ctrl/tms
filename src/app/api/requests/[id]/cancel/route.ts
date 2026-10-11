import { handle, json, readJson } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { cancelRequest, cancelSchema } from "@/modules/cancellations/cancellation.service";

export const POST = handle(async (req, ctx) => {
  const session = await requireSession();
  if (session.kind !== "user") throw Object.assign(new Error("Only users or admins can cancel"), { status: 403 });
  const { id } = await ctx.params;
  const body = cancelSchema.parse(await readJson(req));
  const request = await cancelRequest(id, body, { id: session.sub, name: session.name, role: session.role });
  return json(request);
});
