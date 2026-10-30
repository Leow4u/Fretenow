import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiFailure, type Draft } from "../lib/api.ts";
import { BookingAttempt, QuoteRequest } from "../lib/quote-attempt.ts";

const draft: Draft = {
  mode: "LTL",
  origin: {
    name: "Demo",
    address: "120 Example Street",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    country: "US",
  },
  destination: {
    name: "Demo",
    address: "210 Sample Avenue",
    city: "Denver",
    state: "CO",
    postalCode: "80202",
    country: "US",
  },
  pickupDate: "2026-11-02",
  items: [
    {
      description: "Pallet",
      quantity: 1,
      weightLb: 100,
      lengthIn: 48,
      widthIn: 40,
      heightIn: 36,
    },
  ],
  accessorials: [],
};

test("a delayed quote is discarded if the draft changes while awaiting fetch", async () => {
  const request = new QuoteRequest();
  let resolve!: (value: { rates: string[] }) => void;
  const pendingFetch = new Promise<{ rates: string[] }>((done) => {
    resolve = done;
  });
  const pendingQuote = request.run(() => pendingFetch);
  request.invalidate(); // Same transition called by every editable draft field.
  resolve({ rates: ["old-draft-rate"] });
  assert.equal(await pendingQuote, undefined);
  assert.deepEqual(
    await request.run(async () => ({ rates: ["new-draft-rate"] })),
    { rates: ["new-draft-rate"] },
  );
});

test("definitive expired or changed-draft rejection releases booking for editing and requoting", async () => {
  for (const [status, code] of [
    [409, "RATE_EXPIRED"],
    [409, "DRAFT_CHANGED"],
    [400, "VALIDATION"],
  ] as const) {
    const attempt = new BookingAttempt();
    const original = attempt.request("expired-rate", draft);
    const rejectedFetch = async () => {
      throw new ApiFailure(status, code, "Request rejected before booking");
    };
    try {
      await rejectedFetch();
      assert.fail("Expected definitive response");
    } catch (error) {
      assert.equal(attempt.reject(error), true);
    }
    assert.equal(attempt.pending, false);
    const fresh = attempt.request("new-rate", { ...draft, mode: "FTL" });
    assert.notEqual(fresh.key, original.key);
    assert.equal(JSON.parse(fresh.body).rateId, "new-rate");
  }
});

test("unknown transport or 500 outcome retains exact body and UUID on retry", () => {
  for (const error of [
    new TypeError("Connection lost"),
    new ApiFailure(500, "INTERNAL_ERROR", "Unknown outcome"),
  ]) {
    const attempt = new BookingAttempt();
    const original = attempt.request("original-rate", draft);
    assert.equal(attempt.reject(error), false);
    assert.equal(attempt.pending, true);
    const retry = attempt.request("other-rate", { ...draft, mode: "FTL" });
    assert.deepEqual(retry, original);
    assert.equal(JSON.parse(retry.body).draft.mode, "LTL");
  }
});
