"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Toggle a user/driver between ACTIVE and INACTIVE (soft deactivation).
export function StatusToggleButton({ url, current }: { url: string; current: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isActive = current === "ACTIVE";

  async function toggle() {
    setBusy(true);
    try {
      await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isActive ? "INACTIVE" : "ACTIVE" }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${
        isActive ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      }`}
    >
      {isActive ? "Deactivate" : "Activate"}
    </button>
  );
}

// Change a vehicle's operational status (AVAILABLE / MAINTENANCE / INACTIVE).
export function VehicleStatusSelect({ url, current }: { url: string; current: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function change(status: string) {
    setBusy(true);
    try {
      await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={current}
      disabled={busy}
      onChange={(e) => change(e.target.value)}
      className="rounded border border-slate-300 px-2 py-1 text-xs"
    >
      <option value="AVAILABLE">Available</option>
      <option value="MAINTENANCE">Maintenance</option>
      <option value="INACTIVE">Inactive</option>
    </select>
  );
}
