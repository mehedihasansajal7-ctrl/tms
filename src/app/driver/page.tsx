import AppShell from "@/components/app-shell";
import StatusBadge from "@/components/status-badge";
import DriverAvailability from "@/components/driver-availability";
import DriverTripActions from "@/components/driver-trip-actions";
import DriverReportIssue from "@/components/driver-report-issue";
import { requireDriverPage } from "@/lib/guards";
import { getDriver } from "@/modules/drivers/driver.service";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";

export default async function DriverDashboard() {
  const session = await requireDriverPage();
  const driver = await getDriver(session.sub);

  const assignments = await prisma.driverAssignment.findMany({
    where: { driverId: session.sub },
    orderBy: { startDateTime: "asc" },
    include: {
      request: {
        include: {
          requester: { select: { name: true, phone: true } },
          passengers: { orderBy: { sortOrder: "asc" } },
          requestedType: true,
          vehicleBookings: { include: { vehicle: true } },
        },
      },
    },
  });

  const now = new Date();
  const active = assignments.filter((a) => a.status === "ACTIVE");
  const current = active.find((a) => a.request.status === "ON_TRIP");
  const upcoming = active.filter((a) => a.request.status === "ASSIGNED" && a.startDateTime.getTime() > now.getTime());
  const history = assignments.filter((a) => a.status === "COMPLETED" || a.status === "CANCELLED" || a.status === "RELEASED");

  return (
    <AppShell active="/driver">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Hello, {driver.name}</h1>
          <StatusBadge status={driver.tripState} />
        </div>

        <DriverAvailability status={driver.operationalStatus} />

        <DriverReportIssue />

        {current && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-sm font-semibold">Current trip</h2>
              <StatusBadge status="ON_TRIP" />
            </div>
            <div className="mb-2 font-mono text-sm text-slate-700">{current.request.requestNumber}</div>
            <div className="text-sm">
              <div><span className="text-slate-500">Requester:</span> {current.request.requester.name} ({current.request.requester.phone})</div>
              <div><span className="text-slate-500">Vehicle:</span> {current.request.vehicleBookings[0]?.vehicle?.registrationNumber}</div>
              <div><span className="text-slate-500">Destination:</span> {current.request.destination}</div>
            </div>
            <DriverTripActions requestId={current.request.id} status="ON_TRIP" />
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Upcoming trips</h2>
            <div className="space-y-3">
              {upcoming.map((a) => (
                <div key={a.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <Link href={`/driver/trips/${a.request.id}`} className="font-mono text-sm text-indigo-600 hover:underline">{a.request.requestNumber}</Link>
                    <StatusBadge status={a.request.status} />
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{formatDateTime(a.startDateTime)} → {formatDateTime(a.endDateTime)}</div>
                  <div className="text-sm text-slate-500">To {a.request.destination}</div>
                  <DriverTripActions requestId={a.request.id} status={a.request.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Trip history</h2>
            <div className="divide-y divide-slate-100 text-sm">
              {history.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2">
                  <span className="font-mono text-slate-600">{a.request.requestNumber}</span>
                  <span className="text-slate-500">{formatDateTime(a.startDateTime)}</span>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
