"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DriverReportIssue() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/driver/report-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to report");
      setDone(true);
      setMessage("");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to report");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Issue reported to the transport team.</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Report an issue</span>
        {!open && (
          <button onClick={() => setOpen(true)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            Report
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={submit} className="mt-3 space-y-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Describe the issue (vehicle problem, route, etc.)"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            aria-label="Issue description"
          />
          {error && <div role="alert" className="rounded-md bg-red-50 px-2 py-1.5 text-sm text-red-700">{error}</div>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !message.trim()} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
              {busy ? "Sending…" : "Send report"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md bg-slate-200 px-3 py-1.5 text-sm">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
