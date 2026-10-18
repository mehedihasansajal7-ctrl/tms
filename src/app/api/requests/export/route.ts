import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { listRequests } from "@/modules/requests/request.service";
import { toCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";

export const GET = handle(async (req) => {
  requireAdmin(await requireSession());
  const sp = new URL(req.url).searchParams;
  const data = await listRequests({
    status: sp.get("status") ?? undefined,
    q: sp.get("q") ?? undefined,
    page: 1,
    pageSize: 5000,
  });

  const rows = data.items.map((r) => ({
    Request: r.requestNumber,
    Requester: r.requester.name,
    Email: r.requester.email,
    Department: r.requester.department ?? "",
    Purpose: r.purpose,
    RequestedType: r.requestedType.name,
    AssignedType: r.assignedType?.name ?? "",
    Passengers: r.passengerCount,
    Start: formatDateTime(r.startDateTime),
    End: formatDateTime(r.endDateTime),
    Destination: r.destination,
    Status: r.status,
    Vehicle: r.vehicleBookings[0]?.vehicle?.registrationNumber ?? "",
    Driver: r.driverAssignments[0]?.driver?.name ?? "",
  }));

  return new Response(new Uint8Array(Buffer.from("\uFEFF" + toCsv(rows), "utf-8")), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="requests.csv"',
    },
  });
});
