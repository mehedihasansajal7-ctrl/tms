import { handle, json } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { getDriver } from "@/modules/drivers/driver.service";
import { prisma } from "@/lib/prisma";

export const GET = handle(async () => {
  const session = await requireSession();
  if (session.kind !== "driver") throw Object.assign(new Error("Driver only"), { status: 403 });
  const driver = await getDriver(session.sub);

  const assignments = await prisma.driverAssignment.findMany({
    where: { driverId: session.sub },
    orderBy: { startDateTime: "desc" },
    include: {
      request: {
        include: {
          requester: { select: { id: true, name: true, phone: true } },
          passengers: { orderBy: { sortOrder: "asc" } },
          requestedType: true,
          vehicleBookings: { where: { status: "ACTIVE" }, include: { vehicle: true } },
        },
      },
    },
  });

  return json({ profile: driver, assignments });
});
