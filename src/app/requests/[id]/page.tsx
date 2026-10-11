import AppShell from "@/components/app-shell";
import StatusBadge from "@/components/status-badge";
import CancelRequestButton from "@/components/cancel-request-button";
import { requireUserPage } from "@/lib/guards";
import { getRequest } from "@/modules/requests/request.service";
import { formatDateTime } from "@/lib/format";
import { AppError } from "@/lib/errors";
import Link from "next/link";

export default async function UserRequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUserPage();
  const { id } = await params;
  const request = await getRequest(id);
  if (request.requesterId !== session.sub) throw new AppError("Not authorized", 403);

  const activeBooking = request.vehicleBookings.find((b) => b.status === "ACTIVE");
  const activeAssignment = request.driverAssignments.find((a) => a.status === "ACTIVE");
  const cancellable = request.status === "PENDING" || request.status === "APPROVED";

  return (
    <AppShell active="/dashboard">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">← My requests</Link>
          <h1 className="text-xl font-bold text-slate-900">{request.requestNumber}</h1>
          <StatusBadge status={request.status} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Trip details</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">Purpose</dt><dd>{request.purpose}</dd>
            <dt className="text-slate-500">Vehicle</dt><dd>{request.requestedType.name} ({request.requestedType.capacity} seats)</dd>
            <dt className="text-slate-500">Start</dt><dd>{formatDateTime(request.startDateTime)}</dd>
            <dt className="text-slate-500">End</dt><dd>{formatDateTime(request.endDateTime)}</dd>
            <dt className="text-slate-500">Destination</dt><dd>{request.destination}</dd>
            {request.assignedType && (<><dt className="text-slate-500">Assigned vehicle</dt><dd>{request.assignedType.name}</dd></>)}
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Passengers</h2>
          {request.passengers.map((p) => (
            <div key={p.id} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
              <span className="font-medium">{p.name}</span>
              <span className="text-slate-500">{p.pickupLocation}</span>
            </div>
          ))}
        </div>

        {activeAssignment && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Assigned</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><div className="text-xs uppercase text-slate-400">Vehicle</div><div className="font-medium">{activeBooking?.vehicle?.registrationNumber}</div></div>
              <div><div className="text-xs uppercase text-slate-400">Driver</div><div className="font-medium">{activeAssignment.driver?.name}</div></div>
            </div>
          </div>
        )}

        {request.rejectionReason && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">Rejected: {request.rejectionReason}</div>
        )}
        {request.cancellationReason && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">Cancelled: {request.cancellationReason}</div>
        )}

        {cancellable && <CancelRequestButton requestId={request.id} />}
      </div>
    </AppShell>
  );
}
