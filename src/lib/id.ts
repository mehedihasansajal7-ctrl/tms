import { prisma } from "./prisma";

// Atomic per-year sequence for request numbers like TR-2026-00125.
export async function nextRequestNumber(now = new Date()): Promise<string> {
  const year = now.getUTCFullYear();
  const key = `TR-${year}`;
  const seq = await prisma.sequence.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `TR-${year}-${String(seq.value).padStart(5, "0")}`;
}
