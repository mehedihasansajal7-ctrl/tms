import AppShell from "@/components/app-shell";
import { VehicleCreateForm, VehicleTypeCreateForm } from "@/components/management-forms";
import { VehicleStatusSelect } from "@/components/status-actions";
import { requireAdminPage } from "@/lib/guards";
import { listVehicles, listVehicleTypes } from "@/modules/vehicles/vehicle.service";

export default async function AdminVehicles() {
  await requireAdminPage();
  const [vehicles, types] = await Promise.all([listVehicles(), listVehicleTypes()]);

  return (
    <AppShell active="/admin/vehicles">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Vehicles</h1>

        <VehicleCreateForm types={types} />

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">Vehicle types</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {types.map((t) => (
              <span key={t.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                {t.name} <span className="text-slate-400">({t.capacity} seats)</span>
              </span>
            ))}
          </div>
          <VehicleTypeCreateForm />
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Registration</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Capacity</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium">{v.registrationNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{v.vehicleType.name}</td>
                  <td className="px-4 py-3 text-slate-600">{v.capacity}</td>
                  <td className="px-4 py-3"><VehicleStatusSelect url={`/api/vehicles/${v.id}`} current={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
