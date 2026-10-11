import { handle, json } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { listAuditLogs } from "@/modules/audit/audit.service";

export const GET = handle(async (req) => {
  requireAdmin(await requireSession());
  const sp = new URL(req.url).searchParams;
  return json(await listAuditLogs({
    q: sp.get("q") ?? undefined,
    action: sp.get("action") ?? undefined,
    entityType: sp.get("entityType") ?? undefined,
    page: sp.get("page") ? Number(sp.get("page")) : undefined,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : undefined,
  }));
});
