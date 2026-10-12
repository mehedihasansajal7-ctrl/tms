import AppShell from "@/components/app-shell";
import StatusBadge from "@/components/status-badge";
import { requireAdminPage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminSearch({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  return (
    <AppShell active="/admin/search">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Search</h1>
        <form method="GET" className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search requests, users, drivers, vehicles…" className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white">Search</button>
        </form>

        {!q ? (
          <p className="text-sm text-slate-400">Type a query above to search.</p>
        ) : (
          <Results q={q} />
        )}
      </div>
    </AppShell>
  );
}

async function Results({ q }: { q: string }) {
  const [requests, users, drivers, vehicles] = await Promise.all([
    prisma.transportRequest.findMany({
      where: { OR: [{ requestNumber: { contains: q } }, { purpose: { contains: q } }] },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { requester: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { OR: [{ name: { contains: q } }, { email: { contains: q } }, { employeeId: { contains: q } }] },
      take: 10,
    }),
    prisma.driver.findMany({
      where: { OR: [{ name: { contains: q } }, { email: { contains: q } }, { licenseNumber: { contains: q } }] },
      take: 10,
    }),
    prisma.vehicle.findMany({
      where: { registrationNumber: { contains: q } },
      take: 10,
      include: { vehicleType: true },
    }),
  ]);

  const empty = requests.length === 0 && users.length === 0 && drivers.length === 0 && vehicles.length === 0;

  return (
    <div className="space-y-4">
      {empty && <p className="text-sm text-slate-400">No results for "{q}".</p>}

      {requests.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">Requests</h2>
          <div className="divide-y divide-slate-100 text-sm">
            {requests.map((r) => (
              <Link key={r.id} href={`/admin/requests/${r.id}`} className="flex items-center justify-between py-2 hover:bg-slate-50">
                <span className="font-mono text-indigo-600">{r.requestNumber}</span>
                <span className="text-slate-600">{r.purpose}</span>
                <StatusBadge status={r.status} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {users.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">Users</h2>
          <div className="divide-y divide-slate-100 text-sm">
            {users.map((u) => (
              <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center justify-between py-2 hover:bg-slate-50">
                <span className="text-indigo-600">{u.name}</span>
                <span className="text-slate-500">{u.email}</span>
                <span className="text-slate-500">{u.employeeId}</span>
                <StatusBadge status={u.role} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {drivers.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">Drivers</h2>
          <div className="divide-y divide-slate-100 text-sm">
            {drivers.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2">
                <span>{d.name}</span>
                <span className="text-slate-500">{d.licenseNumber}</span>
                <StatusBadge status={d.operationalStatus} />
              </div>
            ))}
          </div>
        </div>
      )}

      {vehicles.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">Vehicles</h2>
          <div className="divide-y divide-slate-100 text-sm">
            {vehicles.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-2">
                <span className="font-mono">{v.registrationNumber}</span>
                <span className="text-slate-500">{v.vehicleType.name}</span>
                <StatusBadge status={v.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
