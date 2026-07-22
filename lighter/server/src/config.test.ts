import { describe, expect, it } from "vitest";
import { isTestnet } from "./config.js";

describe("isTestnet", () => {
  it("detects zkLighter testnet", () => {
    expect(isTestnet("https://testnet.zklighter.elliot.ai")).toBe(true);
  });

  it("detects Robinhood Chain testnet", () => {
    expect(isTestnet("https://api.rh-testnet.lighter.xyz")).toBe(true);
  });

  it("does not flag zkLighter mainnet as testnet", () => {
    expect(isTestnet("https://mainnet.zklighter.elliot.ai")).toBe(false);
  });

  it("does not flag Robinhood Chain mainnet as testnet", () => {
    expect(isTestnet("https://api.rh.lighter.xyz")).toBe(false);
  });
});
