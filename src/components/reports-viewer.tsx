"use client";

import { useState } from "react";

const REPORTS = [
  { id: "requests", label: "Requests (by status)" },
  { id: "vehicle-utilization", label: "Vehicle utilization" },
  { id: "driver-trips", label: "Driver trip count" },
  { id: "user-trips", label: "User trip count" },
  { id: "department", label: "Department-wise trips" },
  { id: "vehicle-type", label: "Vehicle type usage" },
  { id: "cancellation", label: "Cancellation report" },
  { id: "rejection", label: "Rejection report" },
  { id: "alternative", label: "Alternative assignment report" },
  { id: "driver-availability", label: "Driver availability" },
];

function renderValue(v: unknown): React.ReactNode {
  if (Array.isArray(v)) {
    if (v.length === 0) return <span className="text-slate-400">—</span>;
    const cols = Object.keys(v[0] || {});
    return (
      <table className="w-full text-xs">
        <thead>
          <tr>{cols.map((c) => <th key={c} className="border-b border-slate-200 py-1 text-left text-slate-400">{c}</th>)}</tr>
        </thead>
        <tbody>
          {v.map((row, i) => (
            <tr key={i}>{cols.map((c) => <td key={c} className="border-b border-slate-100 py-1 pr-2">{String((row as Record<string, unknown>)[c] ?? "")}</td>)}</tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (v && typeof v === "object") {
    return (
      <table className="w-full text-xs">
        <tbody>
          {Object.entries(v as Record<string, unknown>).map(([k, val]) => (
            <tr key={k}>
              <td className="w-1/3 border-b border-slate-100 py-1 pr-2 font-medium text-slate-600">{k}</td>
              <td className="border-b border-slate-100 py-1">{renderValue(val)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return <span>{String(v)}</span>;
}

export default function ReportsViewer() {
  const [type, setType] = useState("requests");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/reports/${type}?${params}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function exportUrl(format: "csv" | "xlsx") {
    const params = new URLSearchParams({ format });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (type === "requests") params.set("groupBy", "status");
    return `/api/reports/${type}?${params}`;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Reports</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-slate-500">Report</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            {REPORTS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <button onClick={load} disabled={loading} className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm text-white disabled:opacity-50">
          {loading ? "Loading…" : "Run"}
        </button>
        <a href={exportUrl("csv")} download className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">CSV</a>
        <a href={exportUrl("xlsx")} download className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Excel</a>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {data === null ? <p className="text-sm text-slate-400">Select a report and click Run.</p> : renderValue(data)}
      </div>
    </div>
  );
}
