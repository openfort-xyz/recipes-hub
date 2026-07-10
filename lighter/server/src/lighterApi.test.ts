import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LighterApiError, requestFaucet, withRetry } from "./lighterApi.js";
import type { Config } from "./config.js";

describe("withRetry", () => {
  it("returns immediately on first success without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, 3, 5);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries after failures and returns the eventual success", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("flaky 1"))
      .mockRejectedValueOnce(new Error("flaky 2"))
      .mockResolvedValueOnce("ok");
    const result = await withRetry(fn, 3, 5);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws the last error once all attempts are exhausted", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("flaky 1"))
      .mockRejectedValueOnce(new Error("flaky 2"))
      .mockRejectedValueOnce(new Error("flaky 3 — final"));
    await expect(withRetry(fn, 3, 5)).rejects.toThrow("flaky 3 — final");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not sleep after the final attempt", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));
    const start = Date.now();
    await expect(withRetry(fn, 1, 5000)).rejects.toThrow("always fails");
    // A single attempt should fail fast — no backoff sleep should occur after the only attempt.
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

describe("requestFaucet (mocked flaky upstream)", () => {
  const config: Config = {
    port: 3008,
    allowedOrigins: [],
    openfort: { secretKey: "", shield: { publishableKey: "", secretKey: "", encryptionShare: "" } },
    lighter: {
      apiBaseUrl: "https://testnet.zklighter.elliot.ai",
      chainId: 300,
      accountIndex: null,
      apiKeyPrivateKey: null,
      apiKeyIndex: 2,
    },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function jsonResponse(body: unknown, ok = true) {
    return { ok, json: () => Promise.resolve(body) } as Response;
  }

  it("succeeds after transient failures (matches observed live flakiness)", async () => {
    // Mirrors the live probe sequence from this session: 29500, 200-ok, 29500, 29500, 29500 —
    // here the mock recovers on the 2nd attempt, well within the 3-attempt budget.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ code: 29500, message: "internal server error" }, false))
      .mockResolvedValueOnce(jsonResponse({ code: 200, message: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    const promise = requestFaucet(config, "0x1234567890123456789012345678901234567890");
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after 3 attempts and reports the attempt count", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: 29500, message: "internal server error" }, false));
    vi.stubGlobal("fetch", fetchMock);

    // Attach the assertion (which internally attaches a rejection handler) before advancing
    // timers, so the rejection is never briefly "unhandled" between the two awaits.
    const assertion = expect(requestFaucet(config, "0x1234567890123456789012345678901234567890")).rejects.toMatchObject(
      { message: expect.stringContaining("after 3 attempts") },
    );
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("preserves the Lighter error code through retries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: 29500, message: "internal server error" }, false));
    vi.stubGlobal("fetch", fetchMock);

    const assertion = expect(requestFaucet(config, "0x1234567890123456789012345678901234567890")).rejects.toMatchObject(
      { code: 29500 },
    );
    await vi.runAllTimersAsync();
    await assertion;
  });
});
