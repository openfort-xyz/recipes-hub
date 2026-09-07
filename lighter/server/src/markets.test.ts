import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LighterApiError } from "./lighterApi.js";
import { requireMarket, type Market } from "./markets.js";
import type { Config } from "./config.js";

const ETH: Market = {
  marketIndex: 0,
  symbol: "ETH",
  marketType: "perp",
  sizeDecimals: 4,
  priceDecimals: 2,
  minBaseAmount: "0.0050",
  minQuoteAmount: "10.000000",
  price: "1803.19",
  hasLiquidity: true,
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
  hasLiquidity: false,
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

describe("getActiveMarkets liquidity", () => {
  const config = {
    port: 3008,
    allowedOrigins: [],
    authToken: "",
    openfort: { secretKey: "", shield: { publishableKey: "", secretKey: "", encryptionShare: "" } },
    lighter: {
      apiBaseUrl: "https://testnet.zklighter.elliot.ai",
      chainId: 300,
      accountIndex: null,
      apiKeyPrivateKey: null,
      apiKeyIndex: 2,
    },
  } as Config;

  const detail = (market_id: number, symbol: string, extra: Record<string, unknown>) => ({
    market_id,
    symbol,
    market_type: "perp",
    status: "active",
    min_base_amount: "0.0050",
    min_quote_amount: "10.000000",
    supported_size_decimals: 4,
    supported_price_decimals: 2,
    supported_quote_decimals: 6,
    mark_price: "100.00",
    ...extra,
  });

  // 0 = trades + a two-sided book (genuinely tradeable)
  // 1 = has traded before but nothing resting now (the LIT/ZORA case a cheap proxy gets wrong)
  // 2 = never traded, no open interest (must be excluded without spending a probe on it)
  const DETAILS = [
    detail(0, "ETH", { last_trade_price: 2488, open_interest: 5.9 }),
    detail(1, "LIT", { last_trade_price: 4.68, open_interest: 0 }),
    detail(2, "DUSK", { last_trade_price: 0, open_interest: 0 }),
  ];

  let probed: number[] = [];

  beforeEach(() => {
    probed = [];
    vi.resetModules(); // the liquidity cache is module state — each test needs a fresh one
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const parsed = new URL(url);
        if (parsed.pathname === "/api/v1/orderBookDetails") {
          return { ok: true, json: async () => ({ code: 200, order_book_details: DETAILS, spot_order_book_details: [] }) };
        }
        const marketId = Number(parsed.searchParams.get("market_id"));
        probed.push(marketId);
        const book =
          marketId === 0
            ? { code: 200, bids: [{ price: "2487" }], asks: [{ price: "2489" }] }
            : { code: 200, bids: [], asks: [] };
        return { ok: true, json: async () => book };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks only markets with a two-sided book as tradeable", async () => {
    const { getActiveMarkets } = await import("./markets.js");
    const markets = await getActiveMarkets(config);
    expect(markets.map((m) => [m.symbol, m.hasLiquidity])).toEqual([
      ["ETH", true],
      ["LIT", false],
      ["DUSK", false],
    ]);
  });

  it("probes only the prefiltered candidates, never every active market", async () => {
    const { getActiveMarkets } = await import("./markets.js");
    await getActiveMarkets(config);
    // DUSK never traded and holds no open interest, so it must cost zero requests.
    expect(probed.sort()).toEqual([0, 1]);
  });

  it("keeps a market visible when its probe errors rather than hiding something tradeable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const parsed = new URL(url);
        if (parsed.pathname === "/api/v1/orderBookDetails") {
          return { ok: true, json: async () => ({ code: 200, order_book_details: DETAILS, spot_order_book_details: [] }) };
        }
        throw new Error("upstream blip");
      }),
    );
    const { getActiveMarkets } = await import("./markets.js");
    const markets = await getActiveMarkets(config);
    expect(markets.find((m) => m.symbol === "ETH")?.hasLiquidity).toBe(true);
    expect(markets.find((m) => m.symbol === "DUSK")?.hasLiquidity).toBe(false);
  });

  it("serves the cached liquidity set on a second call instead of re-probing", async () => {
    const { getActiveMarkets } = await import("./markets.js");
    await getActiveMarkets(config);
    const afterFirst = probed.length;
    await getActiveMarkets(config);
    expect(probed.length).toBe(afterFirst);
  });
});
