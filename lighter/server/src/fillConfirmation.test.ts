import { describe, expect, it, vi } from "vitest";
import { computeInitialWaitMs, waitForFillConfirmation } from "./fillConfirmation.js";

/** A virtual clock + sleep pair so tests run instantly with no real waiting, while still
 * exercising the same "advance time, re-check deadline" logic the real setTimeout-based sleep
 * would drive. */
function createVirtualClock(startMs = 0) {
  let clock = startMs;
  const now = () => clock;
  const sleep = async (ms: number) => {
    clock += ms;
  };
  return { now, sleep, advance: (ms: number) => (clock += ms) };
}

describe("waitForFillConfirmation", () => {
  it("returns the trade immediately if it's already present on the first poll", async () => {
    const { now, sleep } = createVirtualClock();
    const fetchTrades = vi.fn().mockResolvedValue([{ tx_hash: "abc", size: "0.01", price: "1800.00" }]);

    const result = await waitForFillConfirmation({ txHash: "abc", fetchTrades, now, sleep });

    expect(result).toEqual({ size: "0.01", price: "1800.00" });
    expect(fetchTrades).toHaveBeenCalledTimes(1);
  });

  it("finds a trade that only appears after a delay — the exact race this replaces a single fixed-delay check for", async () => {
    const { now, sleep } = createVirtualClock();
    const fetchTrades = vi
      .fn()
      .mockResolvedValueOnce([]) // not visible yet
      .mockResolvedValueOnce([]) // still not visible
      .mockResolvedValueOnce([{ tx_hash: "abc", size: "0.02", price: "1801.50" }]); // now it lands

    const result = await waitForFillConfirmation({
      txHash: "abc",
      fetchTrades,
      pollIntervalMs: 500,
      timeoutMs: 8000,
      now,
      sleep,
    });

    expect(result).toEqual({ size: "0.02", price: "1801.50" });
    expect(fetchTrades).toHaveBeenCalledTimes(3);
  });

  it("returns null (never a false negative claim) once the timeout elapses with no match", async () => {
    const { now, sleep } = createVirtualClock();
    const fetchTrades = vi.fn().mockResolvedValue([]);

    const result = await waitForFillConfirmation({
      txHash: "abc",
      fetchTrades,
      pollIntervalMs: 1000,
      timeoutMs: 3000,
      now,
      sleep,
    });

    expect(result).toBeNull();
    // ~3 polls fit in a 3000ms budget at 1000ms spacing.
    expect(fetchTrades.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("ignores a transient fetchTrades failure and keeps polling until it finds the match", async () => {
    const { now, sleep } = createVirtualClock();
    const fetchTrades = vi
      .fn()
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce([{ tx_hash: "abc", size: "0.03", price: "1802.00" }]);

    const result = await waitForFillConfirmation({
      txHash: "abc",
      fetchTrades,
      pollIntervalMs: 500,
      timeoutMs: 8000,
      now,
      sleep,
    });

    expect(result).toEqual({ size: "0.03", price: "1802.00" });
    expect(fetchTrades).toHaveBeenCalledTimes(2);
  });

  it("does not match a trade with a different tx_hash", async () => {
    const { now, sleep } = createVirtualClock();
    const fetchTrades = vi.fn().mockResolvedValue([{ tx_hash: "someone-elses-tx", size: "1", price: "1" }]);

    const result = await waitForFillConfirmation({
      txHash: "abc",
      fetchTrades,
      pollIntervalMs: 500,
      timeoutMs: 1000,
      now,
      sleep,
    });

    expect(result).toBeNull();
  });

  it("waits initialWaitMs before the first poll", async () => {
    const { now, sleep } = createVirtualClock();
    const fetchTrades = vi.fn().mockResolvedValue([{ tx_hash: "abc", size: "0.01", price: "1800.00" }]);

    await waitForFillConfirmation({ txHash: "abc", fetchTrades, initialWaitMs: 500, now, sleep });

    expect(now()).toBeGreaterThanOrEqual(500);
  });
});

describe("computeInitialWaitMs", () => {
  it("returns the minimum wait when predictedExecutionTimeMs is undefined", () => {
    expect(computeInitialWaitMs(undefined, 1_000_000)).toBe(300);
  });

  it("waits until the predicted timestamp when it's a small delay in the future", () => {
    expect(computeInitialWaitMs(1_000_800, 1_000_000)).toBe(800);
  });

  it("clamps to the minimum when the predicted timestamp is already in the past", () => {
    expect(computeInitialWaitMs(999_000, 1_000_000)).toBe(300);
  });

  it("clamps to the maximum when the predicted timestamp is implausibly far out", () => {
    expect(computeInitialWaitMs(1_100_000, 1_000_000)).toBe(5000);
  });
});
