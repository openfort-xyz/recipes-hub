import type { Config } from "./config.js";
import { LighterApiError, getOrderBookDetails, getOrderBookOrders, type LighterOrderBookDetail } from "./lighterApi.js";

export interface Market {
  marketIndex: number;
  symbol: string;
  marketType: "perp" | "spot";
  sizeDecimals: number;
  priceDecimals: number;
  minBaseAmount: string;
  minQuoteAmount: string;
  /** Mark price for perps, last trade price for spot — whichever Lighter reports as "current". */
  price: string;
  /**
   * True only if this market has resting orders on BOTH sides right now, i.e. a marketable order
   * can actually fill. "Active" status alone does not imply this: testnet lists 176 active
   * markets and exactly 3 of them (ETH/BTC/SOL) have a book — every other one takes an order and
   * rejects it with "order book is empty".
   */
  hasLiquidity: boolean;
}

const LIQUIDITY_TTL_MS = 15_000;
let liquidityCache: { at: number; tradeable: Set<number> } | null = null;

/**
 * Which markets can actually fill an order right now.
 *
 * Only the order book proves this, and probing all 176 active markets on every 3s poll is out of
 * the question — so this narrows first on the one bulk call we already made: a market that has
 * never traded AND holds no open interest has no book worth checking. That prefilter cuts 176
 * candidates to ~5, and only those get a book probe. Cheap proxies alone are not enough: LIT and
 * ZORA both report last_trade_price > 0 yet have no resting orders, so trusting the prefilter
 * would put two dead markets back in the list.
 *
 * ponytail: misses a market seeded with a fresh two-sided book that has never traded and shows no
 * open interest. Lighter's testnet maker quotes and trades the same markets, so that combination
 * doesn't occur today; if it ever does, drop the prefilter and probe every active market behind a
 * longer TTL.
 */
async function getTradeableMarketIndexes(config: Config, details: LighterOrderBookDetail[]): Promise<Set<number>> {
  if (liquidityCache && Date.now() - liquidityCache.at < LIQUIDITY_TTL_MS) {
    return liquidityCache.tradeable;
  }
  const candidates = details.filter(
    (detail) => Number(detail.last_trade_price ?? 0) > 0 || Number(detail.open_interest ?? 0) > 0,
  );
  const probes = await Promise.all(
    candidates.map(async (detail) => {
      try {
        const book = await getOrderBookOrders(config, detail.market_id, 1);
        return book.bids.length > 0 && book.asks.length > 0 ? detail.market_id : null;
      } catch {
        // A probe failure is not proof of an empty book — leave the market in rather than hiding
        // something tradeable because one request blipped.
        return detail.market_id;
      }
    }),
  );
  const tradeable = new Set(probes.filter((id): id is number => id !== null));
  liquidityCache = { at: Date.now(), tradeable };
  return tradeable;
}

/**
 * Returns every currently active market (perp + spot) with live pricing and whether it can
 * actually be traded, sourced fresh from Lighter on each call (the liquidity half is cached for
 * LIQUIDITY_TTL_MS). Nothing here hardcodes a market list.
 */
export async function getActiveMarkets(config: Config): Promise<Market[]> {
  const details = (await getOrderBookDetails(config)).filter((detail) => detail.status === "active");
  const tradeable = await getTradeableMarketIndexes(config, details);
  return details.map((detail) => ({
    marketIndex: detail.market_id,
    symbol: detail.symbol,
    marketType: detail.market_type,
    sizeDecimals: detail.supported_size_decimals,
    priceDecimals: detail.supported_price_decimals,
    minBaseAmount: detail.min_base_amount,
    minQuoteAmount: detail.min_quote_amount,
    price: detail.mark_price ?? String(detail.last_trade_price ?? "0"),
    hasLiquidity: tradeable.has(detail.market_id),
  }));
}

/**
 * Validates a market index against the live active-market list before any order/orderbook
 * request uses it — Lighter's own error for an invalid market_id is not always a clean 400
 * (other endpoints' error specificity is inconsistent), so this recipe
 * checks up front and fails with an unambiguous message.
 */
export function requireMarket(markets: Market[], marketIndex: number): Market {
  const market = markets.find((m) => m.marketIndex === marketIndex);
  if (!market) {
    throw new LighterApiError(`Unknown or inactive market index ${marketIndex}.`, undefined, 400);
  }
  return market;
}
