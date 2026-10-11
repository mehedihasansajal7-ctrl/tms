import { z } from "zod";
import { handle, json, readJson } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { confirmAvailability } from "@/modules/drivers/driver.service";

const schema = z.object({ available: z.boolean() });

export const POST = handle(async (req) => {
  const session = await requireSession();
  if (session.kind !== "driver") throw Object.assign(new Error("Driver only"), { status: 403 });
  const body = schema.parse(await readJson(req));
  const driver = await confirmAvailability(session.sub, body.available);
  return json({ operationalStatus: driver.operationalStatus });
});
