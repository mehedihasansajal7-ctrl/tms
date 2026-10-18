import { z } from "zod";
import { handle, json, readJson } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { AppError } from "@/lib/errors";
import { notifyAdmins } from "@/lib/notify";
import { writeAudit } from "@/lib/audit";
import { getDriver } from "@/modules/drivers/driver.service";

const schema = z.object({ message: z.string().min(1, "Describe the issue").max(1000) });

export const POST = handle(async (req) => {
  const session = await requireSession();
  if (session.kind !== "driver") throw new AppError("Driver only", 403);
  const body = schema.parse(await readJson(req));
  const driver = await getDriver(session.sub);

  await notifyAdmins({
    type: "DRIVER_ISSUE",
    title: "Driver reported an issue",
    message: `${driver.name}: ${body.message}`,
    refType: "DRIVER",
    refId: session.sub,
  });
  await writeAudit({
    actorId: session.sub,
    actorKind: "DRIVER",
    actorName: driver.name,
    action: "DRIVER_ISSUE_REPORTED",
    entityType: "Driver",
    entityId: session.sub,
    reason: body.message,
  });

  return json({ ok: true });
});
