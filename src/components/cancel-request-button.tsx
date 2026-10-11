"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/requests/${requestId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cancellation failed");
      router.refresh();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancellation failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
        Cancel request
      </button>
    );
  }

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3">
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cancellation reason (required)" className="w-full rounded-md border border-red-300 px-2 py-1.5 text-sm" />
      {error && <div className="mt-1 text-sm text-red-700">{error}</div>}
      <div className="mt-2 flex gap-2">
        <button onClick={submit} disabled={busy || !reason.trim()} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">Confirm</button>
        <button onClick={() => setOpen(false)} className="rounded-md bg-slate-200 px-3 py-1.5 text-sm">Back</button>
      </div>
    </div>
  );
}
