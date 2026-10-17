"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

  if (!token) {
    return (
      <div className="mt-4 space-y-3">
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">This reset link is missing its token.</div>
        <Link href="/forgot-password" className="block w-full rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white">Request a new link</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mt-4 space-y-3">
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Password reset successfully.</div>
        <button onClick={() => router.push("/login")} className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Sign in</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">New password</label>
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Confirm new password</label>
        <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
      </div>
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <button type="submit" disabled={busy} className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
        {busy ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Reset password</h1>
        <Suspense fallback={<p className="mt-4 text-sm text-slate-400">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
