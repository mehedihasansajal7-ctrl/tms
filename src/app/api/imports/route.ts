import { handle, json } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { listImportHistory } from "@/modules/imports/import.service";

export const GET = handle(async () => {
  requireAdmin(await requireSession());
  return json(await listImportHistory());
});
