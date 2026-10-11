import AppShell from "@/components/app-shell";
import { requireAdminPage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}
function localDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function localMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function AdminCalendar({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const monthStr = typeof sp.month === "string" ? sp.month : null;
  const base = monthStr ? new Date(monthStr + "-01") : new Date();
  const monthStart = startOfMonth(base);
  const monthEnd = endOfMonth(base);

  const requests = await prisma.transportRequest.findMany({
    where: { startDateTime: { gte: monthStart, lte: monthEnd } },
    include: {
      requester: { select: { name: true } },
      vehicleBookings: { where: { status: "ACTIVE" }, include: { vehicle: true } },
      driverAssignments: { where: { status: "ACTIVE" }, include: { driver: { select: { name: true } } } },
    },
    orderBy: { startDateTime: "asc" },
  });

  const byDay = new Map<string, typeof requests>();
  for (const r of requests) {
    const key = localDateKey(r.startDateTime);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(r);
  }

  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const firstDow = monthStart.getDay();

  const prevMonth = localMonthKey(new Date(base.getFullYear(), base.getMonth() - 1, 1));
  const nextMonth = localMonthKey(new Date(base.getFullYear(), base.getMonth() + 1, 1));
  const monthLabel = base.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <AppShell active="/admin/calendar">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <div className="flex gap-2">
            <Link href={`?month=${prevMonth}`} className="rounded border border-slate-300 px-3 py-1.5 text-sm">←</Link>
            <span className="px-2 py-1.5 text-sm font-semibold">{monthLabel}</span>
            <Link href={`?month=${nextMonth}`} className="rounded border border-slate-300 px-3 py-1.5 text-sm">→</Link>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold uppercase text-slate-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} className="min-h-20 border-b border-r border-slate-100" />;
              const dateKey = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;              const items = byDay.get(dateKey) ?? [];
              return (
                <div key={day} className="min-h-20 border-b border-r border-slate-100 p-1 text-xs">
                  <div className="text-slate-400">{day}</div>
                  <div className="mt-1 space-y-0.5">
                    {items.map((r) => (
                      <Link key={r.id} href={`/admin/requests/${r.id}`} className="block truncate rounded bg-indigo-50 px-1 py-0.5 text-indigo-700 hover:bg-indigo-100">
                        {r.requestNumber} · {r.vehicleBookings[0]?.vehicle?.registrationNumber ?? "—"}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
