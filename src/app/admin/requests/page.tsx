import AppShell from "@/components/app-shell";
import StatusBadge from "@/components/status-badge";
import { requireAdminPage } from "@/lib/guards";
import { listRequests } from "@/modules/requests/request.service";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";

export default async function AdminRequests({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) : 1;

  const data = await listRequests({ status, q, page, pageSize: 20 });

  const statuses = ["PENDING", "APPROVED", "ASSIGNED", "ON_TRIP", "COMPLETED", "CANCELLED", "REJECTED"];

  return (
    <AppShell active="/admin/requests">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Transport Requests</h1>
          <form className="flex flex-wrap items-center gap-2" method="GET">
            <select name="status" defaultValue={status ?? ""} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input name="q" defaultValue={q ?? ""} placeholder="Request ID…" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            <button type="submit" className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white">Filter</button>
            <a
              href={`/api/requests/export?${status ? `status=${status}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Export CSV
            </a>
          </form>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/requests/${r.id}`} className="font-mono font-medium text-indigo-600 hover:underline">
                      {r.requestNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${r.requesterId}`} className="hover:underline">{r.requester.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.purpose}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.vehicleBookings[0]?.vehicle?.registrationNumber ?? (r.assignedType?.name ?? r.requestedType.name)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(r.startDateTime)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No requests found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{data.total} request(s)</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`?page=${page - 1}${status ? `&status=${status}` : ""}`} className="rounded border border-slate-300 px-2 py-1">Prev</Link>}
            {page * 20 < data.total && <Link href={`?page=${page + 1}${status ? `&status=${status}` : ""}`} className="rounded border border-slate-300 px-2 py-1">Next</Link>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
