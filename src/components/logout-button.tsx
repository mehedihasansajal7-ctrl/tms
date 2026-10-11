"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/login", { method: "DELETE" });
        router.push("/login");
        router.refresh();
      }}
      className="text-sm text-slate-500 hover:text-slate-800"
    >
      Sign out
    </button>
  );
}
