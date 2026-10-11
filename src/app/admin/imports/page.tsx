import AppShell from "@/components/app-shell";
import ImportsManager from "@/components/imports-manager";
import { requireAdminPage } from "@/lib/guards";

export default async function AdminImports() {
  await requireAdminPage();
  return (
    <AppShell active="/admin/imports">
      <ImportsManager />
    </AppShell>
  );
}
