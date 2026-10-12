"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("New passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Change password</h1>

        {done ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Password changed successfully.</div>
            <button onClick={() => router.back()} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Back</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Current password</label>
              <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={input} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">New password</label>
              <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={input} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Confirm new password</label>
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
            </div>

            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <button type="submit" disabled={busy} className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {busy ? "Saving…" : "Change password"}
            </button>
            <button type="button" onClick={() => router.back()} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">Back</button>
          </form>
        )}
      </div>
    </div>
  );
}
