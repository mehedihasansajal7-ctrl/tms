import { AppError } from "@/lib/errors";
import { handle, json } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const GET = handle(async (req) => {
  const session = await requireSession();
  if (session.kind !== "driver") throw new AppError("Driver only", 403, "FORBIDDEN");

  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") ?? undefined;

  const assignments = await prisma.driverAssignment.findMany({
    where: { driverId: session.sub, ...(status ? { status } : {}) },
    orderBy: { startDateTime: "desc" },
    include: {
      request: {
        include: {
          requester: { select: { name: true, phone: true } },
          passengers: { orderBy: { sortOrder: "asc" } },
          requestedType: true,
          vehicleBookings: { include: { vehicle: true } },
        },
      },
    },
  });

  return json(assignments);
});
