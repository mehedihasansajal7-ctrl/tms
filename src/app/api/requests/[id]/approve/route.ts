import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { approveRequest, approveSchema } from "@/modules/approvals/approval.service";

export const POST = handle(async (req, ctx) => {
  const session = requireAdmin(await requireSession());
  const { id } = await ctx.params;
  const body = approveSchema.parse(await readJson(req));
  return json(await approveRequest(id, body, { id: session.sub, name: session.name }));
});
