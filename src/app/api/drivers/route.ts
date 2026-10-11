import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { listDrivers, createDriver, driverSchema } from "@/modules/drivers/driver.service";

export const GET = handle(async (req) => {
  const session = await requireSession();
  requireAdmin(session);
  const sp = new URL(req.url).searchParams;
  return json(await listDrivers({
    q: sp.get("q") ?? undefined,
    status: sp.get("status") ?? undefined,
    operationalStatus: sp.get("operationalStatus") ?? undefined,
  }));
});

export const POST = handle(async (req) => {
  const session = requireAdmin(await requireSession());
  const body = driverSchema.parse(await readJson(req));
  return json(await createDriver(body, { id: session.sub, name: session.name }), 201);
});
