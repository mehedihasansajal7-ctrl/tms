import AppShell from "@/components/app-shell";
import { requireAdminPage } from "@/lib/guards";
import { listAuditLogs } from "@/modules/audit/audit.service";
import { formatDateTime } from "@/lib/format";

export default async function AdminAudit({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const data = await listAuditLogs({
    q: typeof sp.q === "string" ? sp.q : undefined,
    action: typeof sp.action === "string" ? sp.action : undefined,
    page: typeof sp.page === "string" ? Number(sp.page) : 1,
    pageSize: 100,
  });

  return (
    <AppShell active="/admin/audit">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
          <form method="GET" className="flex gap-2">
            <input name="q" defaultValue={sp.q as string | undefined} placeholder="Search actor / entity / action…" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            <button className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white">Search</button>
          </form>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-500">{formatDateTime(a.createdAt)}</td>
                  <td className="px-4 py-2">{a.actorName ?? a.actorKind ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{a.action}</td>
                  <td className="px-4 py-2 text-slate-600">{a.entityType}{a.entityId ? ` · ${a.entityId.slice(0, 8)}` : ""}</td>
                  <td className="px-4 py-2 text-slate-500">{a.reason ?? ""}</td>
                </tr>
              ))}
              {data.items.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No audit events</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="text-sm text-slate-500">{data.total} events</div>
      </div>
    </AppShell>
  );
}
