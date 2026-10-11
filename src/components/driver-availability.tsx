"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/status-badge";

export default function DriverAvailability({ status }: { status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(available: boolean) {
    setBusy(true);
    try {
      await fetch("/api/driver/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">My availability</span>
        <StatusBadge status={status} />
      </div>
      {status === "AWAITING_CONFIRMATION" && (
        <p className="mt-2 text-xs text-amber-700">A trip was completed. Confirm whether you are available for more work.</p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => set(true)}
          disabled={busy}
          className="rounded-md bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          I&apos;m available
        </button>
        <button
          onClick={() => set(false)}
          disabled={busy}
          className="rounded-md bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          I&apos;m not available
        </button>
      </div>
    </div>
  );
}
