"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [kind, setKind] = useState<"user" | "driver">("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, kind }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.push(data.role === "ADMIN" ? "/admin" : data.kind === "driver" ? "/driver" : "/dashboard");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Transport Management</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {(["user", "driver"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                kind === k ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {k === "user" ? "Staff / Admin" : "Driver"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 rounded-md bg-slate-50 p-3 text-xs text-slate-500">
          Demo: <span className="font-mono">admin@tms.local / admin1234</span>
          <br />
          Driver: <span className="font-mono">driver1@company.com / password123</span>
        </div>
      </div>
    </div>
  );
}
