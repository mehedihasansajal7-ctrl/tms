import { handle, json } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import {
  getRequestsReport,
  getVehicleUtilization,
  getDriverTripCounts,
  getUserTripCounts,
  getDepartmentReport,
  getVehicleTypeUsage,
  getCancellationReport,
  getRejectionReport,
  getAlternativeAssignmentReport,
  getDriverAvailabilityReport,
} from "@/modules/reports/report.service";

export const GET = handle(async (req, ctx) => {
  requireAdmin(await requireSession());
  const { type } = await ctx.params;
  const sp = new URL(req.url).searchParams;
  const from = sp.get("from") ? new Date(sp.get("from")!) : new Date(Date.now() - 30 * 86400000);
  const to = sp.get("to") ? new Date(sp.get("to")!) : new Date();

  switch (type) {
    case "requests":
      return json(await getRequestsReport(from, to, (sp.get("groupBy") as "day" | "month" | "status") ?? "status"));
    case "vehicle-utilization":
      return json(await getVehicleUtilization(from, to));
    case "driver-trips":
      return json(await getDriverTripCounts(from, to));
    case "user-trips":
      return json(await getUserTripCounts(from, to));
    case "department":
      return json(await getDepartmentReport(from, to));
    case "vehicle-type":
      return json(await getVehicleTypeUsage(from, to));
    case "cancellation":
      return json(await getCancellationReport(from, to));
    case "rejection":
      return json(await getRejectionReport(from, to));
    case "alternative":
      return json(await getAlternativeAssignmentReport(from, to));
    case "driver-availability":
      return json(await getDriverAvailabilityReport());
    default:
      return json({ error: "Unknown report type" }, 404);
  }
});
