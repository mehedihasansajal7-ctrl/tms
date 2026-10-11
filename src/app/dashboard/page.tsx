import AppShell from "@/components/app-shell";
import StatusBadge from "@/components/status-badge";
import { requireUserPage } from "@/lib/guards";
import { listRequests } from "@/modules/requests/request.service";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";

export default async function UserDashboard() {
  const session = await requireUserPage();
  const data = await listRequests({ requesterId: session.sub, page: 1, pageSize: 50 });

  return (
    <AppShell active="/dashboard">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">My Requests</h1>
          <Link href="/requests/new" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            + New request
          </Link>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Request</th><th className="px-4 py-3">Start</th><th className="px-4 py-3">Purpose</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Driver</th><th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/requests/${r.id}`} className="font-mono text-indigo-600 hover:underline">{r.requestNumber}</Link></td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(r.startDateTime)}</td>
                  <td className="px-4 py-3 text-slate-600">{r.purpose}</td>
                  <td className="px-4 py-3 text-slate-600">{r.vehicleBookings[0]?.vehicle?.registrationNumber ?? (r.assignedType?.name ?? r.requestedType.name)}</td>
                  <td className="px-4 py-3 text-slate-600">{r.driverAssignments[0]?.driver?.name ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {data.items.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No requests yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
