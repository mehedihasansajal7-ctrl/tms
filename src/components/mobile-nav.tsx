"use client";

import { useState } from "react";
import Link from "next/link";

interface NavItem {
  href: string;
  label: string;
}

export default function MobileNav({ items, active }: { items: NavItem[]; active: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <nav className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
              <span className="text-lg font-bold text-slate-900">TMS</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-3">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-md px-3 py-2.5 text-sm font-medium ${
                    active === item.href ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
