import AppShell from "@/components/app-shell";
import NewRequestForm from "@/components/new-request-form";
import { requireUserPage } from "@/lib/guards";
import { listVehicleTypes } from "@/modules/vehicles/vehicle.service";

export default async function NewRequestPage() {
  await requireUserPage();
  const types = await listVehicleTypes(true);

  return (
    <AppShell active="/requests/new">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-2xl font-bold text-slate-900">New Transport Request</h1>
        <NewRequestForm types={types} />
      </div>
    </AppShell>
  );
}
