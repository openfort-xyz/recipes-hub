import type { Config } from "./config.js";
import { LighterApiError, getOrderBookDetails } from "./lighterApi.js";

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
}

/**
 * Returns every currently active market (perp + spot) with live pricing, sourced fresh from
 * Lighter on each call — no local caching, so this always reflects the true tradeable set
 * (testnet has exactly 5 today: ETH/BTC/SOL perps + ETH/USDC, LIT/USDC spot, but nothing here
 * hardcodes that list).
 */
export async function getActiveMarkets(config: Config): Promise<Market[]> {
  const details = await getOrderBookDetails(config);
  return details
    .filter((detail) => detail.status === "active")
    .map((detail) => ({
      marketIndex: detail.market_id,
      symbol: detail.symbol,
      marketType: detail.market_type,
      sizeDecimals: detail.supported_size_decimals,
      priceDecimals: detail.supported_price_decimals,
      minBaseAmount: detail.min_base_amount,
      minQuoteAmount: detail.min_quote_amount,
      price: detail.mark_price ?? String(detail.last_trade_price ?? "0"),
    }));
}

/**
 * Validates a market index against the live active-market list before any order/orderbook
 * request uses it — Lighter's own error for an invalid market_id is not always a clean 400
 * (see FRICTION_LOG.md for other endpoints' inconsistent error specificity), so this recipe
 * checks up front and fails with an unambiguous message.
 */
export function requireMarket(markets: Market[], marketIndex: number): Market {
  const market = markets.find((m) => m.marketIndex === marketIndex);
  if (!market) {
    throw new LighterApiError(`Unknown or inactive market index ${marketIndex}.`, undefined, 400);
  }
  return market;
}
