import AppShell from "@/components/app-shell";
import StatusBadge from "@/components/status-badge";
import RequestActions from "@/components/request-actions";
import { requireAdminPage } from "@/lib/guards";
import { getRequest } from "@/modules/requests/request.service";
import { getRequestAvailability } from "@/modules/availability/availability.service";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";

export default async function AdminRequestDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [request, availability] = await Promise.all([getRequest(id), getRequestAvailability(id)]);

  const activeBooking = request.vehicleBookings.find((b) => b.status === "ACTIVE");
  const activeAssignment = request.driverAssignments.find((a) => a.status === "ACTIVE");

  return (
    <AppShell active="/admin/requests">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/requests" className="text-sm text-slate-500 hover:text-slate-800">← Requests</Link>
          <h1 className="text-xl font-bold text-slate-900">{request.requestNumber}</h1>
          <StatusBadge status={request.status} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Request Information</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-slate-500">Requester</dt>
                <dd>
                  <Link href={`/admin/users/${request.requesterId}`} className="text-indigo-600 hover:underline">
                    {request.requester.name}
                  </Link>
                  <span className="text-slate-400"> · {request.requester.department}</span>
                </dd>
                <dt className="text-slate-500">Purpose</dt>
                <dd>{request.purpose}</dd>
                <dt className="text-slate-500">Requested vehicle</dt>
                <dd>{request.requestedType.name} ({request.requestedType.capacity} seats)</dd>
                <dt className="text-slate-500">Assigned vehicle</dt>
                <dd>{request.assignedType?.name ?? "—"}</dd>
                <dt className="text-slate-500">Passengers</dt>
                <dd>{request.passengerCount}</dd>
                <dt className="text-slate-500">Start</dt>
                <dd>{formatDateTime(request.startDateTime)}</dd>
                <dt className="text-slate-500">End</dt>
                <dd>{formatDateTime(request.endDateTime)}</dd>
                <dt className="text-slate-500">Destination</dt>
                <dd>{request.destination}</dd>
                {request.specialInstructions && (
                  <>
                    <dt className="text-slate-500">Instructions</dt>
                    <dd>{request.specialInstructions}</dd>
                  </>
                )}
                {request.approvedAt && (
                  <>
                    <dt className="text-slate-500">Approved at</dt>
                    <dd>{formatDateTime(request.approvedAt)}</dd>
                  </>
                )}
                {request.rejectionReason && (
                  <>
                    <dt className="text-slate-500">Rejection reason</dt>
                    <dd className="text-rose-600">{request.rejectionReason}</dd>
                  </>
                )}
                {request.cancellationReason && (
                  <>
                    <dt className="text-slate-500">Cancellation</dt>
                    <dd className="text-red-600">{request.cancellationReason} <span className="text-slate-400">({request.cancellationActorRole})</span></dd>
                  </>
                )}
                {request.alternativeReason && (
                  <>
                    <dt className="text-slate-500">Alternative reason</dt>
                    <dd>{request.alternativeReason}{request.alternativeExplanation ? ` — ${request.alternativeExplanation}` : ""}</dd>
                  </>
                )}
              </dl>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Passengers</h2>
              <div className="divide-y divide-slate-100">
                {request.passengers.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between py-2 text-sm">
                    <span className="font-medium text-slate-800">{p.name}</span>
                    <span className="text-slate-500">Pickup: {p.pickupLocation}</span>
                    {p.destination && <span className="text-slate-500">Drop: {p.destination}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Approval History</h2>
              {request.approvals.length === 0 ? (
                <p className="text-sm text-slate-400">No approval events yet</p>
              ) : (
                <div className="space-y-2">
                  {request.approvals.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{a.action}</span>
                      <span className="text-slate-500">by {a.actor.name} · {formatDateTime(a.createdAt)}</span>
                      {a.reason && <span className="text-slate-400">{a.reason}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Assignment</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs uppercase text-slate-400">Vehicle</div>
                  <div className="font-medium">{activeBooking?.vehicle?.registrationNumber ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-slate-400">Driver</div>
                  <div className="font-medium">{activeAssignment?.driver?.name ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Actions</h2>
              <RequestActions
                requestId={request.id}
                status={request.status}
                requestedTypeId={request.requestedVehicleTypeId}
                availability={availability ?? { vehicles: [], drivers: [], recommendedVehicleId: null, alternativeReasonOptions: [] }}
              />
            </div>

            {availability && (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Availability</h2>
                <div className="mb-2 text-xs font-medium uppercase text-slate-400">Vehicles</div>
                <div className="space-y-1 text-sm">
                  {availability.vehicles.map((v) => (
                    <div key={v.id} className={`flex items-center justify-between rounded px-2 py-1 ${v.available ? "bg-emerald-50" : "bg-slate-50"}`}>
                      <span>{v.registrationNumber} <span className="text-slate-400">({v.typeName})</span></span>
                      <span className="text-xs text-slate-500">{v.available ? "available" : v.conflictCount > 0 ? "conflict" : v.status.toLowerCase()}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 mb-2 text-xs font-medium uppercase text-slate-400">Drivers</div>
                <div className="space-y-1 text-sm">
                  {availability.drivers.map((d) => (
                    <div key={d.id} className={`flex items-center justify-between rounded px-2 py-1 ${d.available ? "bg-emerald-50" : "bg-slate-50"}`}>
                      <span>{d.name}</span>
                      <span className="text-xs text-slate-500">{d.available ? "available" : d.operationalStatus.toLowerCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
