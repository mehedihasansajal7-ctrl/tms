"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setItems(d.notifications ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    load();
  }
  async function markAll() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">← Back</Link>
        <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
        <button onClick={markAll} className="text-sm text-indigo-600 hover:underline">Mark all read</button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">No notifications</p>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 rounded-lg border p-3 ${n.readAt ? "border-slate-200 bg-white" : "border-indigo-200 bg-indigo-50"}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{n.title}</span>
                  <span className="text-xs text-slate-400">{formatDateTime(n.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{n.message}</p>
              </div>
              {!n.readAt && (
                <button onClick={() => markRead(n.id)} className="text-xs text-indigo-600 hover:underline">Mark read</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
