import assert from "node:assert/strict";
import { test } from "node:test";
import { api, utcDate, type Rate } from "../lib/api.ts";

// Use the running real API. This adapter only supplies the browser's relative
// URL resolution, Origin and cookie jar that Node fetch does not provide.
test("web helper integrates with real API bodyless and JSON requests", async (t) => {
  const nativeFetch = globalThis.fetch;
  const baseUrl = process.env.WEB_TEST_API_URL || "http://127.0.0.1:4100";
  const origin = "http://127.0.0.1:3002";
  let cookie = "";

  globalThis.fetch = async (input, options = {}) => {
    const headers = new Headers(options.headers);
    headers.set("Origin", origin);
    if (cookie) headers.set("Cookie", cookie);
    const response = await nativeFetch(new URL(String(input), baseUrl), {
      ...options,
      headers,
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    return response;
  };
  t.after(() => {
    globalThis.fetch = nativeFetch;
  });

  async function bootstrapSession() {
    const response = await nativeFetch(`${baseUrl}/api/demo/session`, {
      method: "POST",
      headers: { Origin: origin },
    });
    assert.equal(response.status, 201);
    cookie = response.headers.get("set-cookie")!.split(";")[0];
  }

  await t.test("demo login accepts the helper's bodyless POST", async () => {
    const session = await api<{ demo: boolean }>("demo/session", {
      method: "POST",
    });
    assert.equal(session.demo, true);
    assert.ok(cookie.startsWith("fretenow_session="));
    const snapshot = await api<{ demo: boolean }>("v1/snapshot");
    assert.equal(snapshot.demo, true);
  });

  await t.test(
    "JSON rate requests still parse through the real API",
    async () => {
      await bootstrapSession();
      const address = {
        name: "Helper regression demo warehouse",
        address: "120 Example Street",
        city: "Austin",
        state: "TX",
        postalCode: "78701",
        country: "US",
      };
      const result = await api<{ rates: Rate[] }>("v1/rates", {
        method: "POST",
        headers: new Headers({ "X-Regression-Test": "web-helper" }),
        body: JSON.stringify({
          mode: "LTL",
          origin: address,
          destination: {
            ...address,
            city: "Denver",
            state: "CO",
            postalCode: "80202",
          },
          pickupDate: utcDate(2),
          items: [
            {
              description: "Regression pallet",
              quantity: 1,
              weightLb: 100,
              lengthIn: 48,
              widthIn: 40,
              heightIn: 36,
            },
          ],
          accessorials: [],
        }),
      });
      assert.equal(result.rates.length, 3);
      assert.ok(result.rates.every((rate) => rate.currency === "USD"));
    },
  );

  await t.test(
    "signout accepts bodyless POST and revokes the cookie",
    async () => {
      await bootstrapSession();
      assert.equal(await api("auth/signout", { method: "POST" }), undefined);
      const response = await nativeFetch(`${baseUrl}/api/auth/session`, {
        headers: { Cookie: cookie },
      });
      assert.equal(response.status, 401);
    },
  );
});
