import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { reopenRequest, reopenSchema } from "@/modules/approvals/approval.service";

export const POST = handle(async (req, ctx) => {
  const session = requireAdmin(await requireSession());
  const { id } = await ctx.params;
  const body = reopenSchema.parse(await readJson(req));
  return json(await reopenRequest(id, body, { id: session.sub, name: session.name }));
});
