import { handle, json } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDriver } from "@/modules/drivers/driver.service";

export const GET = handle(async () => {
  const session = await requireSession();
  if (session.kind === "driver") {
    const driver = await getDriver(session.sub);
    return json({ kind: "driver", role: "DRIVER", name: driver.name, profile: driver });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, role: true, status: true, employeeId: true, department: true, designation: true, phone: true },
  });
  if (!user) throw new Error("User not found");
  return json({ kind: "user", role: user.role, name: user.name, profile: user });
});
