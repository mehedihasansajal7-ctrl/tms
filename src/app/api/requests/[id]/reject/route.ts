import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { rejectRequest, rejectSchema } from "@/modules/approvals/approval.service";

export const POST = handle(async (req, ctx) => {
  const session = requireAdmin(await requireSession());
  const { id } = await ctx.params;
  const body = rejectSchema.parse(await readJson(req));
  return json(await rejectRequest(id, body, { id: session.sub, name: session.name }));
});
