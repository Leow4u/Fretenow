import { ApiFailure, type Draft } from "./api.ts";

/** A response belongs to the draft revision that requested it. */
export class QuoteRequest {
  private revision = 0;

  invalidate() {
    this.revision += 1;
  }

  async run<T>(load: () => Promise<T>): Promise<T | undefined> {
    const requestedRevision = ++this.revision;
    const result = await load();
    return requestedRevision === this.revision ? result : undefined;
  }
}

/** Capture the exact request before sending, including an uncertain retry. */
export class BookingAttempt {
  private intent?: { key: string; body: string };

  get pending() {
    return this.intent !== undefined;
  }

  request(rateId: string, draft: Draft) {
    return (this.intent ??= {
      key: crypto.randomUUID(),
      body: JSON.stringify({ rateId, draft }),
    });
  }

  clear() {
    this.intent = undefined;
  }

  reject(error: unknown) {
    if (
      error instanceof ApiFailure &&
      error.status >= 400 &&
      error.status < 500 &&
      ["RATE_EXPIRED", "DRAFT_CHANGED", "VALIDATION"].includes(error.code)
    ) {
      this.clear();
      return true;
    }
    return false;
  }
}
