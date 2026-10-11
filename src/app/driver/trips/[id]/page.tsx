import AppShell from "@/components/app-shell";
import StatusBadge from "@/components/status-badge";
import DriverTripActions from "@/components/driver-trip-actions";
import { requireDriverPage } from "@/lib/guards";
import { getRequest } from "@/modules/requests/request.service";
import { formatDateTime } from "@/lib/format";
import { AppError } from "@/lib/errors";
import Link from "next/link";

export default async function DriverTripDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireDriverPage();
  const { id } = await params;
  const request = await getRequest(id);
  const isAssigned = request.driverAssignments.some((a) => a.driverId === session.sub);
  if (!isAssigned) throw new AppError("You are not assigned to this trip", 403);

  const activeBooking = request.vehicleBookings.find((b) => b.status === "ACTIVE");

  return (
    <AppShell active="/driver">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/driver" className="text-sm text-slate-500 hover:text-slate-800">← My trips</Link>
          <h1 className="text-xl font-bold text-slate-900">{request.requestNumber}</h1>
          <StatusBadge status={request.status} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Trip details</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Requester</dt>
            <dd>{request.requester.name} · {request.requester.phone}</dd>
            <dt className="text-slate-500">Vehicle</dt>
            <dd>{activeBooking?.vehicle?.registrationNumber ?? "—"}</dd>
            <dt className="text-slate-500">Start</dt>
            <dd>{formatDateTime(request.startDateTime)}</dd>
            <dt className="text-slate-500">End</dt>
            <dd>{formatDateTime(request.endDateTime)}</dd>
            <dt className="text-slate-500">Purpose</dt>
            <dd>{request.purpose}</dd>
            <dt className="text-slate-500">Destination</dt>
            <dd>{request.destination}</dd>
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Passengers & pickups</h2>
          <div className="space-y-2">
            {request.passengers.map((p) => (
              <div key={p.id} className="rounded-md bg-slate-50 p-2 text-sm">
                <div className="font-medium">{p.name}</div>
                <div className="text-slate-500">Pickup: {p.pickupLocation}</div>
                {p.specialInstructions && <div className="text-xs text-slate-400">{p.specialInstructions}</div>}
              </div>
            ))}
          </div>
        </div>

        {(request.status === "ASSIGNED" || request.status === "ON_TRIP") && (
          <DriverTripActions requestId={request.id} status={request.status} />
        )}
      </div>
    </AppShell>
  );
}
