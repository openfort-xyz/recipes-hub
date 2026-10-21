import assert from "node:assert/strict";
import { test } from "node:test";
import { createSession } from "./session.ts";

function memoryStore(initial: string | null) {
  let value = initial;
  return { get: async () => value, set: async (v: string) => void (value = v), clear: async () => void (value = null) };
}

const json = (status: number, body: object) => new Response(JSON.stringify(body), { status });

test("concurrent 401s share one refresh and retry with the rotated token", async () => {
  const calls: string[] = [];
  let refreshes = 0;
  const store = memoryStore("r1");
  const session = createSession("https://api", store, async (url, init) => {
    calls.push(url);
    if (url.endsWith("/auth/refresh")) {
      refreshes++;
      assert.equal(JSON.parse(String(init?.body)).refreshToken, "r1");
      return json(200, { success: true, accessToken: "a2", refreshToken: "r2" });
    }
    const auth = (init?.headers as Record<string, string>).Authorization;
    return auth === "Bearer a2" ? json(200, { ok: true }) : json(401, { success: false, error: "expired" });
  });

  const results = await Promise.all([session.request("/user/onboarding"), session.request("/user/account")]);
  assert.deepEqual(results, [{ ok: true }, { ok: true }]);
  assert.equal(refreshes, 1);
  assert.equal(await store.get(), "r2");
});

test("a failed refresh clears the stored token and surfaces the 401", async () => {
  const store = memoryStore("stale");
  const session = createSession("https://api", store, async () => json(401, { success: false, error: "Unauthorized" }));
  await assert.rejects(session.request("/user"), { status: 401 });
  assert.equal(await store.get(), null);
});
