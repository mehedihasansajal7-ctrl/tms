import Link from "next/link";
import { getSession } from "@/lib/session";
import LogoutButton from "./logout-button";
import NotificationBell from "./notification-bell";
import MobileNav from "./mobile-nav";
import ThemeToggle from "./theme-toggle";

interface NavItem {
  href: string;
  label: string;
}

function navFor(role: string, kind: string): NavItem[] {
  if (role === "ADMIN") {
    return [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/requests", label: "Requests" },
      { href: "/admin/users", label: "Users" },
      { href: "/admin/drivers", label: "Drivers" },
      { href: "/admin/vehicles", label: "Vehicles" },
      { href: "/admin/calendar", label: "Calendar" },
      { href: "/admin/reports", label: "Reports" },
      { href: "/admin/imports", label: "Bulk Upload" },
      { href: "/admin/audit", label: "Audit Log" },
      { href: "/admin/search", label: "Search" },
    ];
  }
  if (kind === "driver") {
    return [{ href: "/driver", label: "My Trips" }];
  }
  return [
    { href: "/dashboard", label: "My Requests" },
    { href: "/requests/new", label: "New Request" },
  ];
}

export default async function AppShell({ active, children }: { active: string; children: React.ReactNode }) {
  const session = await getSession();
  const nav = navFor(session?.role ?? "USER", session?.kind ?? "user");

  return (
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center border-b border-slate-200 px-5">
          <span className="text-lg font-bold text-slate-900">TMS</span>
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const isActive = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-3 md:hidden">
            <MobileNav items={nav} active={active} />
            <span className="text-lg font-bold text-slate-900">TMS</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {session?.role === "ADMIN" && (
              <form method="GET" action="/admin/search" className="hidden lg:block" role="search">
                <input
                  name="q"
                  aria-label="Search requests, users, drivers and vehicles"
                  placeholder="Search…"
                  className="w-44 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </form>
            )}
            <ThemeToggle />
            <NotificationBell />
            <div className="hidden text-sm text-slate-700 sm:block">{session?.name}</div>
            <Link href="/profile" className="hidden text-sm text-slate-500 hover:text-slate-800 sm:inline">Profile</Link>
            <Link href="/change-password" className="hidden text-sm text-slate-500 hover:text-slate-800 sm:inline">Change password</Link>
            <LogoutButton />
          </div>
        </header>
        <main id="main" className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
