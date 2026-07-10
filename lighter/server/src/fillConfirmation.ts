const DEFAULT_POLL_INTERVAL_MS = 750;
const DEFAULT_TIMEOUT_MS = 8000;
const MIN_INITIAL_WAIT_MS = 300;
const MAX_INITIAL_WAIT_MS = 5000;

export interface FillConfirmationTrade {
  size: string;
  price: string;
}

interface TradeLookupRow {
  tx_hash: string;
  size: string;
  price: string;
}

export interface WaitForFillOptions {
  txHash: string;
  /** Fetches recent trades to search for a match — injectable so tests can mock delay/timeout. */
  fetchTrades: () => Promise<TradeLookupRow[]>;
  initialWaitMs?: number;
  pollIntervalMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * sendTx's response carries no fill status (verified live, see FRICTION_LOG.md) — a submitted IOC
 * order either shows up in /api/v1/trades once matched, or never appears there at all if it
 * expired unmatched. There is no "confirmed no match" signal, only "absent so far", so this polls
 * the authoritative trade record for a bounded window and returns null on timeout rather than
 * ever claiming a definite non-fill.
 */
export async function waitForFillConfirmation(options: WaitForFillOptions): Promise<FillConfirmationTrade | null> {
  const {
    txHash,
    fetchTrades,
    initialWaitMs = 0,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    sleep = defaultSleep,
    now = Date.now,
  } = options;

  if (initialWaitMs > 0) {
    await sleep(initialWaitMs);
  }

  const deadline = now() + timeoutMs;
  do {
    try {
      const trades = await fetchTrades();
      const match = trades.find((t) => t.tx_hash === txHash);
      if (match) {
        return { size: match.size, price: match.price };
      }
    } catch {
      // Transient fetch error — keep polling until the deadline instead of failing the whole
      // confirmation on one bad request.
    }
    if (now() < deadline) {
      await sleep(pollIntervalMs);
    }
  } while (now() < deadline);

  return null;
}

/**
 * predicted_execution_time_ms is a Unix ms timestamp (not a duration — verified live, see
 * FRICTION_LOG.md), so the wait before the first poll is however long remains until that instant,
 * clamped to a sane range in case Lighter ever omits the field or returns something implausible.
 */
export function computeInitialWaitMs(predictedExecutionTimeMs: number | undefined, nowMs: number): number {
  if (predictedExecutionTimeMs === undefined) {
    return MIN_INITIAL_WAIT_MS;
  }
  const untilPredicted = predictedExecutionTimeMs - nowMs;
  return Math.min(Math.max(untilPredicted, MIN_INITIAL_WAIT_MS), MAX_INITIAL_WAIT_MS);
}
