import { LighterApiError } from "./lighterApi.js";

// Lighter's signature-verification layer rejects with this SPECIFIC code before it even checks
// whether the referenced order exists — verified live: a throwaway, never-registered key
// produces exactly this code and message on a real
// sendTx call, distinct from the generic 29500 other failure classes return.
export const INVALID_SIGNATURE_CODE = 21120;

// A CancelOrder for an order index this astronomically unlikely to exist. If the signature is
// valid, Lighter rejects it for "order not found" — a different code, reached only after
// signature verification passes. If the signature is invalid, it's rejected at the
// signature-verification layer before that check even runs. Either outcome, this transaction can
// never cancel a real order or move funds — safe to submit as a real self-test on every startup.
export const SELF_TEST_MARKET_INDEX = 0; // ETH perp — always active, no live market lookup needed.
export const SELF_TEST_ORDER_INDEX = 999_999_999;

export type KeySelfTestResult = "valid" | "invalid";

/**
 * Classifies the result of the self-test cancel-order call. Pure so it can be regression-tested
 * without mocking the signing/network stack — see keySelfTest.test.ts.
 */
export function classifySelfTestOutcome(error: unknown): KeySelfTestResult {
  if (error instanceof LighterApiError && error.code === INVALID_SIGNATURE_CODE) {
    return "invalid";
  }
  // Any other outcome (success, "order not found", a network hiccup, rate limiting) doesn't
  // prove the key is bad — treat it as valid rather than false-alarming the operator over an
  // unrelated blip. Only the specific signature-verification rejection is conclusive.
  return "valid";
}
