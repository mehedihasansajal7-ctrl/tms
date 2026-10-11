import AppShell from "@/components/app-shell";
import ReportsViewer from "@/components/reports-viewer";
import { requireAdminPage } from "@/lib/guards";

export default async function AdminReports() {
  await requireAdminPage();
  return (
    <AppShell active="/admin/reports">
      <ReportsViewer />
    </AppShell>
  );
}
