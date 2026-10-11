import { test } from "node:test";
import assert from "node:assert/strict";
import { rangesOverlap, deriveTripState } from "../src/lib/overlap";
import { canTransition, REQUEST_STATUS, STATUS_TRANSITIONS } from "../src/lib/constants";

const d = (iso: string) => new Date(iso);

test("rangesOverlap: no overlap (adjacent)", () => {
  assert.equal(rangesOverlap(d("2026-10-20T09:00"), d("2026-10-20T13:00"), d("2026-10-20T13:00"), d("2026-10-20T17:00")), false);
});

test("rangesOverlap: no overlap (gap)", () => {
  assert.equal(rangesOverlap(d("2026-10-20T09:00"), d("2026-10-20T13:00"), d("2026-10-20T14:00"), d("2026-10-20T17:00")), false);
});

test("rangesOverlap: exact overlap", () => {
  assert.equal(rangesOverlap(d("2026-10-20T09:00"), d("2026-10-20T13:00"), d("2026-10-20T09:00"), d("2026-10-20T13:00")), true);
});

test("rangesOverlap: partial overlap", () => {
  assert.equal(rangesOverlap(d("2026-10-20T09:00"), d("2026-10-20T13:00"), d("2026-10-20T11:00"), d("2026-10-20T15:00")), true);
});

test("rangesOverlap: nested overlap (new inside old)", () => {
  assert.equal(rangesOverlap(d("2026-10-20T09:00"), d("2026-10-20T13:00"), d("2026-10-20T10:00"), d("2026-10-20T12:00")), true);
});

test("rangesOverlap: nested overlap (old inside new)", () => {
  assert.equal(rangesOverlap(d("2026-10-20T10:00"), d("2026-10-20T12:00"), d("2026-10-20T09:00"), d("2026-10-20T13:00")), true);
});

test("rangesOverlap: same start time", () => {
  assert.equal(rangesOverlap(d("2026-10-20T09:00"), d("2026-10-20T11:00"), d("2026-10-20T09:00"), d("2026-10-20T13:00")), true);
});

test("rangesOverlap: same end time", () => {
  assert.equal(rangesOverlap(d("2026-10-20T09:00"), d("2026-10-20T13:00"), d("2026-10-20T11:00"), d("2026-10-20T13:00")), true);
});

test("rangesOverlap: does not treat touching endpoints as overlap", () => {
  assert.equal(rangesOverlap(d("2026-10-20T09:00"), d("2026-10-20T10:00"), d("2026-10-20T10:00"), d("2026-10-20T11:00")), false);
});

test("deriveTripState: future assignment is BOOKED", () => {
  const now = d("2026-10-20T08:00");
  assert.equal(deriveTripState(d("2026-10-20T09:00"), d("2026-10-20T13:00"), now), "BOOKED");
});

test("deriveTripState: active assignment is ON_TRIP", () => {
  const now = d("2026-10-20T10:00");
  assert.equal(deriveTripState(d("2026-10-20T09:00"), d("2026-10-20T13:00"), now), "ON_TRIP");
});

test("deriveTripState: no assignment is IDLE", () => {
  assert.equal(deriveTripState(null, null), "IDLE");
});

test("status transitions: valid transitions allowed", () => {
  assert.equal(canTransition("PENDING", "APPROVED"), true);
  assert.equal(canTransition("PENDING", "REJECTED"), true);
  assert.equal(canTransition("PENDING", "CANCELLED"), true);
  assert.equal(canTransition("APPROVED", "ASSIGNED"), true);
  assert.equal(canTransition("APPROVED", "PENDING"), true);
  assert.equal(canTransition("APPROVED", "CANCELLED"), true);
  assert.equal(canTransition("ASSIGNED", "ON_TRIP"), true);
  assert.equal(canTransition("ASSIGNED", "CANCELLED"), true);
  assert.equal(canTransition("ON_TRIP", "COMPLETED"), true);
  assert.equal(canTransition("REJECTED", "PENDING"), true);
  assert.equal(canTransition("CANCELLED", "PENDING"), true);
});

test("status transitions: invalid transitions rejected", () => {
  assert.equal(canTransition("PENDING", "ON_TRIP"), false);
  assert.equal(canTransition("COMPLETED", "CANCELLED"), false);
  assert.equal(canTransition("REJECTED", "ASSIGNED"), false);
  assert.equal(canTransition("ON_TRIP", "CANCELLED"), false);
  assert.equal(canTransition("CANCELLED", "APPROVED"), false);
});

test("status transitions: terminal statuses have no outbound transitions", () => {
  assert.deepEqual(STATUS_TRANSITIONS[REQUEST_STATUS.COMPLETED], []);
});
