"use client";

import { useEffect, useState } from "react";

interface History {
  id: string;
  fileName: string;
  importType: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  skippedRows: number;
  updatedRows: number;
  status: string;
  uploadedBy: { name: string };
  createdAt: string;
}

export default function ImportsManager() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<{ importId: string; summary: { total: number; valid: number; errors: number; duplicates: number } } | null>(null);
  const [dupMode, setDupMode] = useState("SKIP");
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<History[]>([]);

  useEffect(() => {
    fetch("/api/imports").then((r) => r.json()).then(setHistory).catch(() => {});
  }, []);

  async function stage(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    setSummary(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/imports/stage", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!summary) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/imports/${summary.importId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateMode: dupMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(data);
      setSummary(null);
      fetch("/api/imports").then((r) => r.json()).then(setHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Bulk Upload</h1>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Download templates</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href="/api/imports/templates/users" download className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Users (.csv)</a>
          <a href="/api/imports/templates/drivers" download className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Drivers (.csv)</a>
          <a href="/api/imports/templates/vehicles" download className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Vehicles (.csv)</a>
          <a href="/api/imports/templates/combined" download className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 hover:bg-indigo-100">Combined (.xlsx)</a>
        </div>
      </div>

      <form onSubmit={stage} className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Upload file</h2>
        <input type="file" accept=".xlsx,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        <button type="submit" disabled={!file || busy} className="ml-3 rounded-md bg-indigo-600 px-4 py-1.5 text-sm text-white disabled:opacity-50">
          {busy ? "Validating…" : "Preview import"}
        </button>
      </form>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {summary && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">Validation preview</h2>
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <div className="rounded bg-slate-50 p-2"><div className="text-xl font-bold">{summary.summary.total}</div><div className="text-xs text-slate-500">Total</div></div>
            <div className="rounded bg-emerald-50 p-2"><div className="text-xl font-bold text-emerald-700">{summary.summary.valid}</div><div className="text-xs text-slate-500">Valid</div></div>
            <div className="rounded bg-red-50 p-2"><div className="text-xl font-bold text-red-700">{summary.summary.errors}</div><div className="text-xs text-slate-500">Errors</div></div>
            <div className="rounded bg-amber-50 p-2"><div className="text-xl font-bold text-amber-700">{summary.summary.duplicates}</div><div className="text-xs text-slate-500">Duplicates</div></div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm">Duplicate handling:</label>
            <select value={dupMode} onChange={(e) => setDupMode(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="SKIP">Skip existing</option>
              <option value="UPDATE">Update existing</option>
              <option value="REJECT">Reject duplicates</option>
            </select>
            <button onClick={confirm} disabled={busy} className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm text-white disabled:opacity-50">Import valid rows</button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Import complete — imported {result.successful}, updated {result.updated}, skipped {result.skipped}, failed {result.failed}.
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Import history</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs font-semibold uppercase text-slate-400">
            <tr>
              <th className="py-2">File</th><th className="py-2">Type</th><th className="py-2">Total</th><th className="py-2">Imported</th><th className="py-2">Skipped</th><th className="py-2">Failed</th><th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((h) => (
              <tr key={h.id}>
                <td className="py-2">{h.fileName}</td>
                <td className="py-2 text-slate-600">{h.importType}</td>
                <td className="py-2">{h.totalRows}</td>
                <td className="py-2">{h.successfulRows}</td>
                <td className="py-2">{h.skippedRows}</td>
                <td className="py-2">{h.failedRows}</td>
                <td className="py-2"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{h.status}</span></td>
              </tr>
            ))}
            {history.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-slate-400">No imports yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
