"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setUnread(d.unread ?? 0))
      .catch(() => {});
  }, []);

  return (
    <Link href="/notifications" className="relative text-slate-500 hover:text-slate-800" title="Notifications">
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unread}
        </span>
      )}
    </Link>
  );
}
