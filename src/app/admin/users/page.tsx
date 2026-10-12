import AppShell from "@/components/app-shell";
import StatusBadge from "@/components/status-badge";
import { UserCreateForm } from "@/components/management-forms";
import { StatusToggleButton } from "@/components/status-actions";
import { requireAdminPage } from "@/lib/guards";
import { listUsers } from "@/modules/users/user.service";
import Link from "next/link";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const data = await listUsers({
    q: typeof sp.q === "string" ? sp.q : undefined,
    role: typeof sp.role === "string" ? sp.role : undefined,
    status: typeof sp.status === "string" ? sp.status : undefined,
    page: 1,
    pageSize: 100,
  });

  return (
    <AppShell active="/admin/users">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>

        <UserCreateForm />

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/admin/users/${u.id}`} className="text-indigo-600 hover:underline">{u.name}</Link></td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{u.employeeId}</td>
                  <td className="px-4 py-3 text-slate-600">{u.department ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.role} /></td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-3"><StatusToggleButton url={`/api/users/${u.id}`} current={u.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
