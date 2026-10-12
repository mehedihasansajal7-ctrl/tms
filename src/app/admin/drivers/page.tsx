import AppShell from "@/components/app-shell";
import StatusBadge from "@/components/status-badge";
import { DriverCreateForm } from "@/components/management-forms";
import { StatusToggleButton } from "@/components/status-actions";
import { requireAdminPage } from "@/lib/guards";
import { listDrivers } from "@/modules/drivers/driver.service";
import { formatDate } from "@/lib/format";

export default async function AdminDrivers() {
  await requireAdminPage();
  const drivers = await listDrivers();

  return (
    <AppShell active="/admin/drivers">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>

        <DriverCreateForm />

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">License</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Operational</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-slate-600">{d.email}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{d.licenseNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(d.licenseExpiry)}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={d.operationalStatus} /></td>
                  <td className="px-4 py-3"><StatusToggleButton url={`/api/drivers/${d.id}`} current={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
