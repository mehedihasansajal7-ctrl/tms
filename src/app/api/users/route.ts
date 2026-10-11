import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { listUsers, getUserById, createUser, updateUser, resetUserPassword, userFiltersSchema, createUserSchema, updateUserSchema } from "@/modules/users/user.service";

export const GET = handle(async (req) => {
  const session = await requireSession();
  requireAdmin(session);
  const sp = new URL(req.url).searchParams;
  const filters = userFiltersSchema.parse({
    q: sp.get("q") ?? undefined,
    role: sp.get("role") ?? undefined,
    status: sp.get("status") ?? undefined,
    department: sp.get("department") ?? undefined,
    page: sp.get("page") ?? undefined,
    pageSize: sp.get("pageSize") ?? undefined,
  });
  return json(await listUsers(filters));
});

export const POST = handle(async (req) => {
  const session = requireAdmin(await requireSession());
  const body = createUserSchema.parse(await readJson(req));
  return json(await createUser(body, { id: session.sub, name: session.name }), 201);
});
