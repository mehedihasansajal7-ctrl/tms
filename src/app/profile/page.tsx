"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Profile {
  name?: string;
  phone?: string | null;
  email?: string;
  department?: string | null;
  designation?: string | null;
  licenseNumber?: string;
  emailNotifications?: boolean;
}

export default function ProfilePage() {
  const [kind, setKind] = useState<"user" | "driver">("user");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/profile")
      .then((r) => r.json())
      .then((d) => {
        setKind(d.kind);
        setProfile(d.profile);
        setName(d.profile?.name ?? "");
        setPhone(d.profile?.phone ?? "");
        setDepartment(d.profile?.department ?? "");
        setDesignation(d.profile?.designation ?? "");
        setEmailNotifications(d.profile?.emailNotifications ?? true);
      })
      .catch(() => setError("Could not load profile"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "driver" ? { name, phone, emailNotifications } : { name, phone, department, designation, emailNotifications },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">← Back</Link>
        <h1 className="text-xl font-bold text-slate-900">My profile</h1>
        <Link href="/change-password" className="text-sm text-slate-500 hover:text-slate-800">Password</Link>
      </div>

      {!profile ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input className={input} required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input className={input} value={profile.email ?? ""} disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Phone</label>
            <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {kind === "user" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700">Department</label>
                <input className={input} value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Designation</label>
                <input className={input} value={designation} onChange={(e) => setDesignation(e.target.value)} />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700">Licence number</label>
              <input className={input} value={profile.licenseNumber ?? ""} disabled />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Email me about notifications
          </label>

          {error && <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {saved && <div role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Profile saved.</div>}

          <button type="submit" disabled={busy} className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
      )}
    </div>
  );
}
