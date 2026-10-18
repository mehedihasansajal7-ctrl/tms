import AppShell from "@/components/app-shell";
import { requireAdminPage } from "@/lib/guards";
import { getDashboard } from "@/modules/reports/report.service";
import Link from "next/link";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{children}</div>
    </div>
  );
}

function BarChart({ title, data }: { title: string; data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 text-slate-500">{d.label}</span>
            <div className="h-3 flex-1 overflow-hidden rounded bg-slate-100">
              <div className={`h-3 rounded ${d.color}`} style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right font-medium text-slate-700">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AdminDashboard() {
  await requireAdminPage();
  const d = await getDashboard();

  return (
    <AppShell active="/admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <Link href="/admin/requests?status=PENDING" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Review pending ({d.requestCounts.pending})
          </Link>
        </div>

        {d.alerts.length > 0 && (
          <div className="space-y-2">
            {d.alerts.map((a, i) => (
              <div key={i} className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                {a.message}
              </div>
            ))}
          </div>
        )}

        <Section title="Today's Trips">
          <Stat label="Total" value={d.todayCounts.total} />
          <Stat label="Upcoming" value={d.todayCounts.upcoming} />
          <Stat label="On Trip" value={d.todayCounts.onTrip} />
          <Stat label="Completed" value={d.todayCounts.completed} />
          <Stat label="Cancelled" value={d.todayCounts.cancelled} />
        </Section>

        <Section title="Requests">
          <Stat label="Pending" value={d.requestCounts.pending} />
          <Stat label="Approved" value={d.requestCounts.approved} />
          <Stat label="Assigned" value={d.requestCounts.assigned} />
          <Stat label="Cancelled" value={d.requestCounts.cancelled} />
          <Stat label="Rejected" value={d.requestCounts.rejected} />
        </Section>

        <BarChart
          title="Requests by status"
          data={[
            { label: "Pending", value: d.requestCounts.pending, color: "bg-amber-500" },
            { label: "Approved", value: d.requestCounts.approved, color: "bg-blue-500" },
            { label: "Assigned", value: d.requestCounts.assigned, color: "bg-indigo-500" },
            { label: "On Trip", value: d.requestCounts.onTrip, color: "bg-emerald-500" },
            { label: "Completed", value: d.requestCounts.completed, color: "bg-slate-400" },
            { label: "Cancelled", value: d.requestCounts.cancelled, color: "bg-red-500" },
            { label: "Rejected", value: d.requestCounts.rejected, color: "bg-rose-500" },
          ]}
        />

        <Section title="Vehicles">
          <Stat label="Available" value={d.vehicleCounts.available} />
          <Stat label="Booked" value={d.vehicleCounts.booked} />
          <Stat label="On Trip" value={d.vehicleCounts.onTrip} />
          <Stat label="Maintenance" value={d.vehicleCounts.maintenance} />
          <Stat label="Inactive" value={d.vehicleCounts.inactive} />
        </Section>

        <Section title="Drivers">
          <Stat label="Available" value={d.driverCounts.available} />
          <Stat label="Booked" value={d.driverCounts.booked} />
          <Stat label="On Trip" value={d.driverCounts.onTrip} />
          <Stat label="Unavailable" value={d.driverCounts.unavailable} />
          <Stat label="Awaiting" value={d.driverCounts.awaitingConfirmation} />
        </Section>
      </div>
    </AppShell>
  );
}
