import assert from "node:assert/strict";
import { test } from "node:test";
import { utcDate } from "../lib/api.ts";
import { recentShipments } from "../lib/shipments.ts";

test("Home chooses newest five before truncation without mutating API order", () => {
  const records = [2, 7, 1, 6, 3, 5, 4].map(day => ({
    id: String(day), createdAt: `2026-10-${String(day).padStart(2, "0")}T12:00:00.000Z`,
  }));
  assert.deepEqual(recentShipments(records).map(s => s.id), ["7", "6", "5", "4", "3"]);
  assert.deepEqual(records.map(s => s.id), ["2", "7", "1", "6", "3", "5", "4"]);
});

test("UTC pickup calendar stays aligned at Chicago rollover with injected time", () => {
  const now = new Date("2026-10-31T01:00:00.000Z");
  assert.equal(new Intl.DateTimeFormat("en-US", {timeZone: "America/Chicago", day: "2-digit"}).format(now), "30");
  assert.equal(utcDate(0, now), "2026-10-31");
  assert.equal(utcDate(1, now), "2026-11-01");
  assert.equal(utcDate(366, now), "2027-11-01");
  assert.equal(now.toISOString(), "2026-10-31T01:00:00.000Z");
  assert.equal(utcDate(1, new Date("2026-12-31T23:59:59Z")), "2027-01-01");
});
