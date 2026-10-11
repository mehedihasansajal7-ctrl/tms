import { redirect } from "next/navigation";
import { getSession } from "./session";

export async function requireAdminPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "ADMIN") redirect(s.kind === "driver" ? "/driver" : "/dashboard");
  return s;
}

export async function requireUserPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.kind !== "user") redirect(s.role === "ADMIN" ? "/admin" : "/driver");
  return s;
}

export async function requireDriverPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.kind !== "driver") redirect(s.role === "ADMIN" ? "/admin" : "/dashboard");
  return s;
}
