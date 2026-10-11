import { AppError } from "@/lib/errors";
import { z } from "zod";
import { handle, json, readJson } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { confirmAvailability } from "@/modules/drivers/driver.service";

const schema = z.object({ available: z.boolean() });

export const POST = handle(async (req) => {
  const session = await requireSession();
  if (session.kind !== "driver") throw new AppError("Driver only", 403, "FORBIDDEN");
  const body = schema.parse(await readJson(req));
  const driver = await confirmAvailability(session.sub, body.available);
  return json({ operationalStatus: driver.operationalStatus });
});
