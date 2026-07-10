import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "./config.js";
import { generateApiKey, loadSigner } from "../signer/signer.js";

vi.mock("./envFile.js", () => ({
  updateEnvLocal: vi.fn().mockResolvedValue(undefined),
}));

// Imported after the mock so adoptServerKey picks up the mocked updateEnvLocal — real file I/O
// against .env.local is already covered by envFile.test.ts; this file is only responsible for
// the config hot-swap / signing-client re-creation / self-test-reset logic around it.
import { adoptServerKey, getServerKeyValidity, selfTestServerKey } from "./orders.js";
import { updateEnvLocal } from "./envFile.js";

function makeConfig(): Config {
  return {
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
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as Response;
}

// adoptServerKey fires its post-adoption self-test in the background (see orders.ts) rather than
// awaiting it — flush pending microtasks so it settles before the next test runs, otherwise a
// leftover background promise can mutate shared self-test state after its own test has finished.
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

beforeAll(async () => {
  await loadSigner();
}, 30_000);

describe("adoptServerKey", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: 200, nonce: 1, tx_hash: "0xtxhash" })));
  });

  afterEach(async () => {
    await flushMicrotasks();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("hot-swaps the config in place so subsequent reads see the new key immediately", async () => {
    const config = makeConfig();
    const { privateKey } = generateApiKey();
    await adoptServerKey(config, { accountIndex: 179, apiKeyIndex: 3, apiKeyPrivateKey: privateKey });

    expect(config.lighter.accountIndex).toBe(179);
    expect(config.lighter.apiKeyIndex).toBe(3);
    expect(config.lighter.apiKeyPrivateKey).toBe(privateKey);
  });

  it("persists the new credentials via updateEnvLocal", async () => {
    const config = makeConfig();
    const { privateKey } = generateApiKey();
    await adoptServerKey(config, { accountIndex: 179, apiKeyIndex: 3, apiKeyPrivateKey: privateKey });

    expect(updateEnvLocal).toHaveBeenCalledWith({
      LIGHTER_ACCOUNT_INDEX: "179",
      LIGHTER_API_KEY_INDEX: "3",
      LIGHTER_API_KEY_PRIVATE_KEY: privateKey,
    });
  });

  it("keeps the in-memory adoption even when persisting to .env.local fails", async () => {
    vi.mocked(updateEnvLocal).mockRejectedValueOnce(new Error("disk full"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const config = makeConfig();
    const { privateKey } = generateApiKey();

    await expect(
      adoptServerKey(config, { accountIndex: 179, apiKeyIndex: 3, apiKeyPrivateKey: privateKey }),
    ).resolves.toBeUndefined();

    expect(config.lighter.accountIndex).toBe(179);
    expect(config.lighter.apiKeyPrivateKey).toBe(privateKey);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("will NOT survive a restart"), expect.anything());
    errorSpy.mockRestore();
  });

  it("logs exactly one adoption line naming the account", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const config = makeConfig();
    const { privateKey } = generateApiKey();

    await adoptServerKey(config, { accountIndex: 179, apiKeyIndex: 3, apiKeyPrivateKey: privateKey });

    expect(warnSpy).toHaveBeenCalledWith("[lighter-server] adopted new trading key for account 179");
    warnSpy.mockRestore();
  });

  it("re-creates the signing client for the new key rather than reusing one built for the old key", async () => {
    const config = makeConfig();
    const first = generateApiKey();
    const second = generateApiKey();

    await adoptServerKey(config, { accountIndex: 179, apiKeyIndex: 2, apiKeyPrivateKey: first.privateKey });
    await flushMicrotasks();
    // A self-test using the OLD key's client would sign with the wrong key — proving this
    // succeeds without error is enough to show ensureSigningClient built a fresh client each time
    // (createSigningClient is a real WASM call which throws on a malformed/mismatched key).
    await adoptServerKey(config, { accountIndex: 179, apiKeyIndex: 2, apiKeyPrivateKey: second.privateKey });

    expect(config.lighter.apiKeyPrivateKey).toBe(second.privateKey);
  });

  it("clears a stale self-test verdict from before adoption instead of leaking it onto the new key", async () => {
    const config = makeConfig();
    // lighter-go's CreateClient rejects account index 0 outright — use a different placeholder
    // account for the "prior key" than the one being adopted below.
    config.lighter.accountIndex = 178;
    config.lighter.apiKeyPrivateKey = generateApiKey().privateKey;

    // Poison the shared self-test verdict as if a PRIOR key had just failed the self-test.
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ code: 200, nonce: 1 }))
        .mockResolvedValueOnce(jsonResponse({ code: 21120, message: "invalid signature" }, false)),
    );
    await selfTestServerKey(config);
    expect(getServerKeyValidity()).toBe("invalid");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: 200, nonce: 1, tx_hash: "0xtxhash" })));
    const { privateKey } = generateApiKey();
    await adoptServerKey(config, { accountIndex: 179, apiKeyIndex: 3, apiKeyPrivateKey: privateKey });
    await flushMicrotasks();

    expect(getServerKeyValidity()).toBe("valid");
  });
});
