"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode =
  | "none"
  | "approve"
  | "reject"
  | "reopen"
  | "cancel"
  | "reschedule"
  | "assign";

interface Vehicle {
  id: string;
  registrationNumber: string;
  typeId: string;
  typeName: string;
  capacity: number;
  available: boolean;
  larger: boolean;
  fits: boolean;
}
interface Driver {
  id: string;
  name: string;
  available: boolean;
}

export default function RequestActions({
  requestId,
  status,
  requestedTypeId,
  availability,
}: {
  requestId: string;
  status: string;
  requestedTypeId: string;
  availability: {
    vehicles: Vehicle[];
    drivers: Driver[];
    recommendedVehicleId: string | null;
    alternativeReasonOptions: string[];
  };
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("none");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [altReason, setAltReason] = useState("");
  const [altExplanation, setAltExplanation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const availableVehicles = availability.vehicles.filter((v) => v.available && v.fits);
  const availableDrivers = availability.drivers.filter((d) => d.available);
  const selectedVehicle = availability.vehicles.find((v) => v.id === vehicleId);
  const needsAltReason = selectedVehicle ? selectedVehicle.typeId !== requestedTypeId : false;

  async function post(path: string, body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/requests/${requestId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setMode("none");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const btn = "rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "PENDING" && (
          <>
            <button className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`} onClick={() => setMode("approve")}>Approve</button>
            <button className={`${btn} bg-rose-600 text-white hover:bg-rose-700`} onClick={() => setMode("reject")}>Reject</button>
          </>
        )}
        {status === "APPROVED" && (
          <button className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`} onClick={() => setMode("assign")}>Assign</button>
        )}
        {status === "PENDING" && (
          <button className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`} onClick={() => setMode("assign")}>Approve & Assign</button>
        )}
        {status === "ASSIGNED" && (
          <button className={`${btn} bg-slate-700 text-white hover:bg-slate-800`} onClick={() => setMode("reschedule")}>Reschedule</button>
        )}
        {(status === "PENDING" || status === "APPROVED" || status === "ASSIGNED") && (
          <button className={`${btn} bg-red-600 text-white hover:bg-red-700`} onClick={() => setMode("cancel")}>Cancel</button>
        )}
        {(status === "REJECTED" || status === "CANCELLED") && (
          <button className={`${btn} bg-amber-500 text-white hover:bg-amber-600`} onClick={() => setMode("reopen")}>Reopen</button>
        )}
        {status === "ON_TRIP" && (
          <button className={`${btn} bg-red-600 text-white hover:bg-red-700`} onClick={() => setMode("cancel")}>Abort trip</button>
        )}
      </div>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {mode === "approve" && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Approval comment (optional)" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <div className="mt-2 flex gap-2">
            <button className={`${btn} bg-emerald-600 text-white`} disabled={busy} onClick={() => post("approve", { comment })}>Confirm approve</button>
            <button className={`${btn} bg-slate-200`} onClick={() => setMode("none")}>Cancel</button>
          </div>
        </div>
      )}

      {mode === "reject" && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason (required)" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <div className="mt-2 flex gap-2">
            <button className={`${btn} bg-rose-600 text-white`} disabled={busy} onClick={() => post("reject", { reason })}>Confirm reject</button>
            <button className={`${btn} bg-slate-200`} onClick={() => setMode("none")}>Cancel</button>
          </div>
        </div>
      )}

      {mode === "reopen" && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reopen reason (required)" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <div className="mt-2 flex gap-2">
            <button className={`${btn} bg-amber-500 text-white`} disabled={busy} onClick={() => post("reopen", { reason })}>Reopen request</button>
            <button className={`${btn} bg-slate-200`} onClick={() => setMode("none")}>Cancel</button>
          </div>
        </div>
      )}

      {mode === "cancel" && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          {status === "ON_TRIP" && (
            <p className="mb-2 text-xs text-amber-700">This is an emergency abort of an active trip and will be fully audited.</p>
          )}
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cancellation reason (required)" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <div className="mt-2 flex gap-2">
            <button
              className={`${btn} bg-red-600 text-white`}
              disabled={busy}
              onClick={() => (status === "ON_TRIP" ? post("abort", { reason }) : post("cancel", { reason }))}
            >
              {status === "ON_TRIP" ? "Abort trip" : "Confirm cancel"}
            </button>
            <button className={`${btn} bg-slate-200`} onClick={() => setMode("none")}>Back</button>
          </div>
        </div>
      )}

      {mode === "reschedule" && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          </div>
          <div className="mt-2 flex gap-2">
            <button className={`${btn} bg-slate-700 text-white`} disabled={busy} onClick={() => post("reschedule", { startDateTime: start, endDateTime: end })}>Save</button>
            <button className={`${btn} bg-slate-200`} onClick={() => setMode("none")}>Back</button>
          </div>
        </div>
      )}

      {mode === "assign" && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Select vehicle…</option>
              {availableVehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNumber} ({v.typeName} · {v.capacity})</option>
              ))}
            </select>
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Select driver…</option>
              {availableDrivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {needsAltReason && (
            <div className="mt-2 space-y-2">
              <select value={altReason} onChange={(e) => setAltReason(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                <option value="">Alternative assignment reason (required)…</option>
                {availability.alternativeReasonOptions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {altReason === "OTHER" && (
                <input value={altExplanation} onChange={(e) => setAltExplanation(e.target.value)} placeholder="Explanation (required)" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
              )}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              className={`${btn} bg-indigo-600 text-white`}
              disabled={busy || !vehicleId || !driverId}
              onClick={() =>
                post(status === "PENDING" ? "approve-and-assign" : "assign", {
                  vehicleId,
                  driverId,
                  alternativeReason: altReason || null,
                  alternativeExplanation: altExplanation || null,
                })
              }
            >
              {status === "PENDING" ? "Approve & assign" : "Assign"}
            </button>
            <button className={`${btn} bg-slate-200`} onClick={() => setMode("none")}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}
