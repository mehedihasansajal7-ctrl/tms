"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input = "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm";
const label = "block text-xs font-medium text-slate-500 mb-0.5";
const btn = "rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50";

function useCreate(path: string, onCreated: () => void) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }
  return { error, busy, submit };
}

export function UserCreateForm() {
  const router = useRouter();
  const { error, busy, submit } = useCreate("/api/users", () => router.refresh());
  const [f, setF] = useState({ name: "", email: "", phone: "", employeeId: "", department: "", designation: "", role: "USER" });

  return (
    <form
      className="rounded-lg border border-slate-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(f);
      }}
    >
      <h3 className="mb-3 text-sm font-semibold">Add user</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={label}>Name</label><input className={input} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className={label}>Email</label><input className={input} type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className={label}>Employee ID</label><input className={input} required value={f.employeeId} onChange={(e) => setF({ ...f, employeeId: e.target.value })} /></div>
        <div><label className={label}>Phone</label><input className={input} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div><label className={label}>Department</label><input className={input} value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></div>
        <div><label className={label}>Designation</label><input className={input} value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} /></div>
        <div><label className={label}>Role</label>
          <select className={input} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="USER">USER</option><option value="ADMIN">ADMIN</option>
          </select>
        </div>
      </div>
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      <button type="submit" disabled={busy} className={`${btn} mt-3 bg-indigo-600 text-white hover:bg-indigo-700`}>Create</button>
    </form>
  );
}

export function DriverCreateForm() {
  const router = useRouter();
  const { error, busy, submit } = useCreate("/api/drivers", () => router.refresh());
  const [f, setF] = useState({ name: "", email: "", phone: "", licenseNumber: "", licenseExpiry: "", operationalStatus: "AWAITING_CONFIRMATION" });

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-4" onSubmit={(e) => { e.preventDefault(); submit({ ...f, licenseExpiry: f.licenseExpiry ? new Date(f.licenseExpiry).toISOString() : null }); }}>
      <h3 className="mb-3 text-sm font-semibold">Add driver</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={label}>Name</label><input className={input} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className={label}>Email</label><input className={input} type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className={label}>Phone</label><input className={input} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div><label className={label}>License number</label><input className={input} required value={f.licenseNumber} onChange={(e) => setF({ ...f, licenseNumber: e.target.value })} /></div>
        <div><label className={label}>License expiry</label><input className={input} type="date" value={f.licenseExpiry} onChange={(e) => setF({ ...f, licenseExpiry: e.target.value })} /></div>
        <div><label className={label}>Operational status</label>
          <select className={input} value={f.operationalStatus} onChange={(e) => setF({ ...f, operationalStatus: e.target.value })}>
            <option value="AVAILABLE">AVAILABLE</option><option value="UNAVAILABLE">UNAVAILABLE</option><option value="AWAITING_CONFIRMATION">AWAITING_CONFIRMATION</option>
          </select>
        </div>
      </div>
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      <button type="submit" disabled={busy} className={`${btn} mt-3 bg-indigo-600 text-white hover:bg-indigo-700`}>Create</button>
    </form>
  );
}

export function VehicleCreateForm({ types }: { types: { id: string; name: string; capacity: number }[] }) {
  const router = useRouter();
  const { error, busy, submit } = useCreate("/api/vehicles", () => router.refresh());
  const [f, setF] = useState({ registrationNumber: "", vehicleTypeId: types[0]?.id ?? "", status: "AVAILABLE" });

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-4" onSubmit={(e) => { e.preventDefault(); submit(f); }}>
      <h3 className="mb-3 text-sm font-semibold">Add vehicle</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={label}>Registration number</label><input className={input} required value={f.registrationNumber} onChange={(e) => setF({ ...f, registrationNumber: e.target.value })} /></div>
        <div><label className={label}>Type</label>
          <select className={input} value={f.vehicleTypeId} onChange={(e) => setF({ ...f, vehicleTypeId: e.target.value })}>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.capacity})</option>)}
          </select>
        </div>
        <div><label className={label}>Status</label>
          <select className={input} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="AVAILABLE">AVAILABLE</option><option value="MAINTENANCE">MAINTENANCE</option><option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </div>
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      <button type="submit" disabled={busy} className={`${btn} mt-3 bg-indigo-600 text-white hover:bg-indigo-700`}>Create</button>
    </form>
  );
}
