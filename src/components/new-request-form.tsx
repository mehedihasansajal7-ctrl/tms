"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input = "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm";
const label = "block text-xs font-medium text-slate-500 mb-0.5";

interface Passenger {
  name: string;
  pickupLocation: string;
}

export default function NewRequestForm({ types }: { types: { id: string; name: string; capacity: number }[] }) {
  const router = useRouter();
  const [purpose, setPurpose] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const [destination, setDestination] = useState("");
  const [instructions, setInstructions] = useState("");
  const [passengers, setPassengers] = useState<Passenger[]>([{ name: "", pickupLocation: "" }]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const capacity = types.find((t) => t.id === typeId)?.capacity ?? 0;

  function addPassenger() {
    setPassengers([...passengers, { name: "", pickupLocation: "" }]);
  }
  function updatePassenger(i: number, key: keyof Passenger, value: string) {
    setPassengers(passengers.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)));
  }
  function removePassenger(i: number) {
    if (passengers.length > 1) setPassengers(passengers.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          startDateTime: new Date(start).toISOString(),
          endDateTime: new Date(end).toISOString(),
          requestedVehicleTypeId: typeId,
          destination,
          specialInstructions: instructions || null,
          passengers: passengers.filter((p) => p.name && p.pickupLocation),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Trip details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Purpose</label>
            <input className={input} required value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
          <div>
            <label className={label}>Start</label>
            <input className={input} type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className={label}>End</label>
            <input className={input} type="datetime-local" required value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div>
            <label className={label}>Vehicle type</label>
            <select className={input} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.capacity} seats)</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Destination</label>
            <input className={input} required value={destination} onChange={(e) => setDestination(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Special instructions (optional)</label>
            <textarea className={input} rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Passengers ({passengers.length} / {capacity} seats)</h2>
          <button type="button" onClick={addPassenger} className="rounded-md bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200">+ Add passenger</button>
        </div>
        <div className="space-y-2">
          {passengers.map((p, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input className={input + " flex-1"} placeholder="Passenger name" value={p.name} onChange={(e) => updatePassenger(i, "name", e.target.value)} />
              <input className={input + " flex-[2]"} placeholder="Pickup location" value={p.pickupLocation} onChange={(e) => updatePassenger(i, "pickupLocation", e.target.value)} />
              {passengers.length > 1 && (
                <button type="button" onClick={() => removePassenger(i)} className="text-sm text-red-500 hover:underline">Remove</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.back()} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>
        <button type="submit" disabled={busy} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {busy ? "Submitting…" : "Submit request"}
        </button>
      </div>
    </form>
  );
}
