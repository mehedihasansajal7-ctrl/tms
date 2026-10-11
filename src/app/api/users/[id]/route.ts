import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { getUserById, updateUser, updateUserSchema } from "@/modules/users/user.service";

export const GET = handle(async (_req, ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  if (session.role !== "ADMIN" && session.sub !== id) {
    requireAdmin(session);
  }
  return json(await getUserById(id));
});

export const PATCH = handle(async (req, ctx) => {
  const session = requireAdmin(await requireSession());
  const { id } = await ctx.params;
  const body = updateUserSchema.parse(await readJson(req));
  return json(await updateUser(id, body, { id: session.sub, name: session.name }));
});
