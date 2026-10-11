import AppShell from "@/components/app-shell";
import StatusBadge from "@/components/status-badge";
import { requireAdminPage } from "@/lib/guards";
import { getUserById } from "@/modules/users/user.service";
import { listRequests } from "@/modules/requests/request.service";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";

export default async function AdminUserProfile({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [user, requests] = await Promise.all([
    getUserById(id),
    listRequests({ requesterId: id, page: 1, pageSize: 50 }),
  ]);

  return (
    <AppShell active="/admin/users">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/users" className="text-sm text-slate-500 hover:text-slate-800">← Users</Link>
          <h1 className="text-xl font-bold text-slate-900">{user.name}</h1>
          <StatusBadge status={user.role} />
          <StatusBadge status={user.status} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Profile</h2>
            <dl className="space-y-1 text-sm">
              <div><dt className="inline text-slate-500">Email: </dt><dd className="inline">{user.email}</dd></div>
              <div><dt className="inline text-slate-500">Phone: </dt><dd className="inline">{user.phone ?? "—"}</dd></div>
              <div><dt className="inline text-slate-500">Employee ID: </dt><dd className="inline font-mono">{user.employeeId}</dd></div>
              <div><dt className="inline text-slate-500">Department: </dt><dd className="inline">{user.department ?? "—"}</dd></div>
              <div><dt className="inline text-slate-500">Designation: </dt><dd className="inline">{user.designation ?? "—"}</dd></div>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {Object.entries(user.stats.byStatus).map(([s, n]) => (
                <div key={s} className="rounded bg-slate-50 p-2 text-center">
                  <div className="text-lg font-bold">{n}</div>
                  <div className="text-[10px] uppercase text-slate-400">{s}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Request History</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="py-2">Request</th><th className="py-2">Start</th><th className="py-2">Purpose</th><th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.items.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2"><Link href={`/admin/requests/${r.id}`} className="font-mono text-indigo-600 hover:underline">{r.requestNumber}</Link></td>
                    <td className="py-2 text-slate-600">{formatDateTime(r.startDateTime)}</td>
                    <td className="py-2 text-slate-600">{r.purpose}</td>
                    <td className="py-2"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
                {requests.items.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-slate-400">No requests</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
