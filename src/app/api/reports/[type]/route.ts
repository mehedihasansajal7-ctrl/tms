import { handle, json } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { normalizeRows, toCsv, toExcelBuffer } from "@/lib/csv";
import { renderTablePdf } from "@/lib/pdf";
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
  const format = sp.get("format");

  let data: unknown;
  switch (type) {
    case "requests":
      data = await getRequestsReport(from, to, (sp.get("groupBy") as "day" | "month" | "status") ?? "status");
      break;
    case "vehicle-utilization":
      data = await getVehicleUtilization(from, to);
      break;
    case "driver-trips":
      data = await getDriverTripCounts(from, to);
      break;
    case "user-trips":
      data = await getUserTripCounts(from, to);
      break;
    case "department":
      data = await getDepartmentReport(from, to);
      break;
    case "vehicle-type":
      data = await getVehicleTypeUsage(from, to);
      break;
    case "cancellation":
      data = await getCancellationReport(from, to);
      break;
    case "rejection":
      data = await getRejectionReport(from, to);
      break;
    case "alternative":
      data = await getAlternativeAssignmentReport(from, to);
      break;
    case "driver-availability":
      data = await getDriverAvailabilityReport();
      break;
    default:
      return json({ error: "Unknown report type" }, 404);
  }

  const rows = normalizeRows(data);
  if (format === "csv") {
    return new Response(new Uint8Array(Buffer.from("\uFEFF" + toCsv(rows), "utf-8")), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-report.csv"`,
      },
    });
  }
  if (format === "xlsx") {
    return new Response(new Uint8Array(toExcelBuffer(rows)), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${type}-report.xlsx"`,
      },
    });
  }
  if (format === "pdf") {
    const pdf = await renderTablePdf(`${type.replace(/-/g, " ")} report`, rows);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${type}-report.pdf"`,
      },
    });
  }
  return json(data);
});
