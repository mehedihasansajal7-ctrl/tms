import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { userTemplateCsv, driverTemplateCsv, vehicleTemplateCsv, combinedTemplateBuffer, csvToBuffer } from "@/modules/imports/templates";

export const GET = handle(async (_req, ctx) => {
  requireAdmin(await requireSession());
  const { type } = await ctx.params;

  if (type === "combined") {
    return new Response(new Uint8Array(combinedTemplateBuffer()), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="TMS_Combined_Template.xlsx"',
      },
    });
  }

  let csv: string;
  let name: string;
  if (type === "users") { csv = userTemplateCsv(); name = "TMS_Users_Template.csv"; }
  else if (type === "drivers") { csv = driverTemplateCsv(); name = "TMS_Drivers_Template.csv"; }
  else if (type === "vehicles") { csv = vehicleTemplateCsv(); name = "TMS_Vehicles_Template.csv"; }
  else return new Response("Unknown template", { status: 404 });

  return new Response(new Uint8Array(csvToBuffer(csv)), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
});
