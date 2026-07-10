import { describe, expect, it } from "vitest";
import { LighterApiError } from "./lighterApi.js";
import { requireMarket, type Market } from "./markets.js";

const ETH: Market = {
  marketIndex: 0,
  symbol: "ETH",
  marketType: "perp",
  sizeDecimals: 4,
  priceDecimals: 2,
  minBaseAmount: "0.0050",
  minQuoteAmount: "10.000000",
  price: "1803.19",
};

const LIT_USDC: Market = {
  marketIndex: 2049,
  symbol: "LIT/USDC",
  marketType: "spot",
  sizeDecimals: 0,
  priceDecimals: 4,
  minBaseAmount: "50",
  minQuoteAmount: "10.000000",
  price: "0.0001",
};

describe("requireMarket", () => {
  it("returns the matching market when present", () => {
    expect(requireMarket([ETH, LIT_USDC], 0)).toBe(ETH);
    expect(requireMarket([ETH, LIT_USDC], 2049)).toBe(LIT_USDC);
  });

  it("throws a clear LighterApiError for an unknown market index", () => {
    expect(() => requireMarket([ETH, LIT_USDC], 999)).toThrow(LighterApiError);
    expect(() => requireMarket([ETH, LIT_USDC], 999)).toThrow(/Unknown or inactive market index 999/);
  });

  it("throws for an empty market list (e.g. upstream returned nothing active)", () => {
    expect(() => requireMarket([], 0)).toThrow(LighterApiError);
  });
});
