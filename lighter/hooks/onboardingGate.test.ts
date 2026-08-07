import { describe, expect, it } from "vitest";
import { accountsMismatch, deriveStep } from "./onboardingGate";
import type { LighterAccount, LighterApiKeyEntry, LighterServerConfig } from "../services/lighterServerClient";

function makeAccount(index: number): LighterAccount {
  return {
    index,
    l1_address: `0x${index.toString().padStart(40, "0")}`,
    status: 1,
    collateral: "10000.000000",
    available_balance: "10000.000000",
    positions: [],
    assets: [],
  };
}

function makeApiKey(accountIndex: number): LighterApiKeyEntry {
  return { account_index: accountIndex, api_key_index: 2, public_key: "0xabc", nonce: 0 };
}

function makeServerConfig(accountIndex: number | null): LighterServerConfig {
  return {
    apiBaseUrl: "https://testnet.zklighter.elliot.ai",
    chainId: 300,
    network: "testnet",
    serverWalletConfigured: accountIndex !== null,
    accountIndex,
    serverKeyInvalid: false,
  };
}

// deriveStep's logic is unchanged by the server's move to auto-adopting ChangePubKey submits —
// only its LIVE reachability changed. "activateServer" used to be a step users walked through by
// hand; now the server adopts a fresh key within the same request that confirms registration, so
// these cases exercise what is now a safety-net path (a hand-edited env, a second server
// instance, a lost adoption after a restart) rather than the everyday happy path. See
// server/src/orders.ts's adoptServerKey and hooks/onboardingGate.ts's inline comment.
describe("deriveStep", () => {
  it("requires a Lighter account before anything else", () => {
    expect(deriveStep(null, [], null)).toBe("deposit");
    expect(deriveStep(null, [makeApiKey(1)], makeServerConfig(1))).toBe("deposit");
  });

  it("requires at least one registered API key", () => {
    expect(deriveStep(makeAccount(178), [], null)).toBe("registerApiKey");
  });

  it("requires the server to have a key configured at all", () => {
    expect(deriveStep(makeAccount(178), [makeApiKey(178)], null)).toBe("activateServer");
    expect(deriveStep(makeAccount(178), [makeApiKey(178)], makeServerConfig(null))).toBe("activateServer");
  });

  it("the split-brain regression: an account with a registered key still isn't ready if the server is configured for a DIFFERENT account", () => {
    // This is exactly the bug: account 178 had zero registered keys and the server was
    // configured for 175 — deriveStep must not return "ready" for either reason alone, and
    // especially not when both are simultaneously wrong.
    expect(deriveStep(makeAccount(178), [makeApiKey(178)], makeServerConfig(175))).toBe("activateServer");
    expect(deriveStep(makeAccount(178), [], makeServerConfig(175))).toBe("registerApiKey");
  });

  it("is ready only when the account has a key AND the server is configured for that exact account", () => {
    expect(deriveStep(makeAccount(178), [makeApiKey(178)], makeServerConfig(178))).toBe("ready");
  });
});

describe("accountsMismatch", () => {
  it("is false with no account", () => {
    expect(accountsMismatch(null, makeServerConfig(175))).toBe(false);
  });

  it("is false when the server isn't configured yet — that's a different failure mode", () => {
    expect(accountsMismatch(makeAccount(178), makeServerConfig(null))).toBe(false);
    expect(accountsMismatch(makeAccount(178), null)).toBe(false);
  });

  it("is true when the server is configured for a different account", () => {
    expect(accountsMismatch(makeAccount(178), makeServerConfig(175))).toBe(true);
  });

  it("is false when the server is configured for exactly this account", () => {
    expect(accountsMismatch(makeAccount(178), makeServerConfig(178))).toBe(false);
  });
});
