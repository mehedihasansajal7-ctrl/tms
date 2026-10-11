import { REQUEST_STATUS_LABELS, VEHICLE_STATUS_LABELS, DRIVER_OPERATIONAL_LABELS } from "@/lib/constants";

const COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-indigo-100 text-indigo-800",
  ON_TRIP: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-slate-200 text-slate-700",
  CANCELLED: "bg-red-100 text-red-700",
  REJECTED: "bg-rose-100 text-rose-700",
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  UNAVAILABLE: "bg-red-100 text-red-700",
  AWAITING_CONFIRMATION: "bg-amber-100 text-amber-800",
  MAINTENANCE: "bg-amber-100 text-amber-800",
  INACTIVE: "bg-slate-200 text-slate-600",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  BOOKED: "bg-indigo-100 text-indigo-800",
  IDLE: "bg-slate-100 text-slate-600",
  USER: "bg-slate-100 text-slate-700",
  ADMIN: "bg-purple-100 text-purple-800",
  DRIVER: "bg-cyan-100 text-cyan-800",
};

export function labelFor(status: string): string {
  return REQUEST_STATUS_LABELS[status as keyof typeof REQUEST_STATUS_LABELS]
    ?? VEHICLE_STATUS_LABELS[status as keyof typeof VEHICLE_STATUS_LABELS]
    ?? DRIVER_OPERATIONAL_LABELS[status as keyof typeof DRIVER_OPERATIONAL_LABELS]
    ?? status;
}

export default function StatusBadge({ status }: { status: string }) {
  const color = COLOR[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {labelFor(status)}
    </span>
  );
}
