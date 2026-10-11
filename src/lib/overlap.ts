// Time-range overlap detection (spec §22).
// Two ranges A and B conflict when: A.start < B.end AND A.end > B.start.
export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

// Prisma WHERE fragment for an overlapping time window.
export function overlapWhere(start: Date, end: Date) {
  return {
    startDateTime: { lt: end },
    endDateTime: { gt: start },
  };
}

// Derive a driver's trip state from assignments (spec §25).
export type TripState = "IDLE" | "BOOKED" | "ON_TRIP";

export function deriveTripState(
  start: Date | null,
  end: Date | null,
  now = new Date(),
): TripState {
  if (!start || !end) return "IDLE";
  if (now.getTime() < start.getTime()) return "BOOKED";
  if (now.getTime() <= end.getTime()) return "ON_TRIP";
  return "IDLE";
}
