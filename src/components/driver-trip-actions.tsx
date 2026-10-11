"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DriverTripActions({ requestId, status }: { requestId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(path: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/requests/${requestId}/${path}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {status === "ASSIGNED" && (
        <button onClick={() => act("start-trip")} disabled={busy} className="w-full rounded-md bg-emerald-600 py-4 text-lg font-semibold text-white disabled:opacity-50">
          START TRIP
        </button>
      )}
      {status === "ON_TRIP" && (
        <button onClick={() => act("complete-trip")} disabled={busy} className="w-full rounded-md bg-indigo-600 py-4 text-lg font-semibold text-white disabled:opacity-50">
          COMPLETE TRIP
        </button>
      )}
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    </div>
  );
}
