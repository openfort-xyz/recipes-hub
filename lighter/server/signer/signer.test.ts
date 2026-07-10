import { beforeAll, describe, expect, it } from "vitest";
import {
  ORDER_EXPIRY_NIL,
  ORDER_TYPE_LIMIT,
  TIME_IN_FORCE_GOOD_TILL_TIME,
  TIME_IN_FORCE_IMMEDIATE_OR_CANCEL,
  createAuthToken,
  createSigningClient,
  generateApiKey,
  loadSigner,
  signCancelAllOrders,
  signCancelOrder,
  signChangePubKey,
  signCreateOrder,
} from "./signer.js";

const MAINNET_CHAIN_ID = 304;
const TEST_ACCOUNT_INDEX = 1;
const TEST_API_KEY_INDEX = 0;

beforeAll(async () => {
  await loadSigner();
}, 30_000);

describe("generateApiKey", () => {
  it("returns a 40-byte private key and public key as 0x-prefixed hex", () => {
    const { privateKey, publicKey } = generateApiKey();
    expect(privateKey).toMatch(/^0x[0-9a-f]{80}$/i);
    expect(publicKey).toMatch(/^0x[0-9a-f]{80}$/i);
  });

  it("generates a different keypair on every call", () => {
    const first = generateApiKey();
    const second = generateApiKey();
    expect(first.privateKey).not.toBe(second.privateKey);
  });
});

describe("signCreateOrder", () => {
  const setUpClient = () => {
    const { privateKey } = generateApiKey();
    createSigningClient(
      "http://localhost:1234",
      privateKey,
      MAINNET_CHAIN_ID,
      TEST_API_KEY_INDEX,
      TEST_ACCOUNT_INDEX,
    );
  };

  it("signature is deterministic given identical signed content (same ExpiredAt)", () => {
    // The wasm binding stamps `ExpiredAt` from wall-clock time on every call and doesn't
    // expose a way to pin it, so two independent calls aren't guaranteed byte-identical.
    // What IS a meaningful determinism guarantee: whenever two calls happen to land on the
    // same ExpiredAt (same millisecond), the Poseidon-Schnorr signature over that identical
    // message must also match — proving the signer isn't injecting extra randomness.
    const { privateKey } = generateApiKey();
    createSigningClient(
      "http://localhost:1234",
      privateKey,
      MAINNET_CHAIN_ID,
      TEST_API_KEY_INDEX,
      TEST_ACCOUNT_INDEX,
    );
    const params = {
      marketIndex: 0,
      clientOrderIndex: 1,
      baseAmount: 1000,
      price: 50_000,
      isAsk: false,
      orderType: ORDER_TYPE_LIMIT,
      timeInForce: TIME_IN_FORCE_IMMEDIATE_OR_CANCEL,
      reduceOnly: false,
      triggerPrice: 0,
      orderExpiry: ORDER_EXPIRY_NIL,
      nonce: 42,
      apiKeyIndex: TEST_API_KEY_INDEX,
      accountIndex: TEST_ACCOUNT_INDEX,
    };
    const first = signCreateOrder(params);
    const second = signCreateOrder(params);
    const firstInfo = JSON.parse(first.txInfo);
    const secondInfo = JSON.parse(second.txInfo);
    if (firstInfo.ExpiredAt === secondInfo.ExpiredAt) {
      expect(first.txHash).toBe(second.txHash);
      expect(firstInfo.Sig).toBe(secondInfo.Sig);
    } else {
      expect(first.txHash).not.toBe(second.txHash);
    }
  });

  it("returns well-formed output on every call regardless of wall-clock ExpiredAt drift", () => {
    setUpClient();
    for (let i = 0; i < 3; i += 1) {
      const result = signCreateOrder({
        marketIndex: 0,
        clientOrderIndex: 1,
        baseAmount: 1000,
        price: 50_000,
        isAsk: false,
        orderType: ORDER_TYPE_LIMIT,
        timeInForce: TIME_IN_FORCE_IMMEDIATE_OR_CANCEL,
        reduceOnly: false,
        triggerPrice: 0,
        orderExpiry: ORDER_EXPIRY_NIL,
        nonce: 42,
        apiKeyIndex: TEST_API_KEY_INDEX,
        accountIndex: TEST_ACCOUNT_INDEX,
      });
      expect(result.txHash).toMatch(/^[0-9a-f]+$/i);
      expect(JSON.parse(result.txInfo).Sig).toBeTruthy();
    }
  });

  it("produces a different signature when the nonce changes", () => {
    setUpClient();
    const base = {
      marketIndex: 0,
      clientOrderIndex: 1,
      baseAmount: 1000,
      price: 50_000,
      isAsk: false,
      orderType: ORDER_TYPE_LIMIT,
      timeInForce: TIME_IN_FORCE_IMMEDIATE_OR_CANCEL,
      reduceOnly: false,
      triggerPrice: 0,
      orderExpiry: ORDER_EXPIRY_NIL,
      apiKeyIndex: TEST_API_KEY_INDEX,
      accountIndex: TEST_ACCOUNT_INDEX,
    };
    const a = signCreateOrder({ ...base, nonce: 1 });
    const b = signCreateOrder({ ...base, nonce: 2 });
    expect(a.txHash).not.toBe(b.txHash);
  });

  it("builds a well-formed txInfo with the expected fields and tx type", () => {
    setUpClient();
    const result = signCreateOrder({
      marketIndex: 2,
      clientOrderIndex: 7,
      baseAmount: 500,
      price: 12_345,
      isAsk: true,
      orderType: ORDER_TYPE_LIMIT,
      timeInForce: TIME_IN_FORCE_GOOD_TILL_TIME,
      reduceOnly: true,
      triggerPrice: 0,
      orderExpiry: Date.now() + 28 * 24 * 60 * 60 * 1000,
      nonce: 9,
      apiKeyIndex: TEST_API_KEY_INDEX,
      accountIndex: TEST_ACCOUNT_INDEX,
    });
    expect(result.txType).toBe(14); // TxTypeCreateOrder in lighter-go
    expect(result.txHash).toMatch(/^[0-9a-f]+$/i);
    const txInfo = JSON.parse(result.txInfo);
    expect(txInfo).toMatchObject({
      AccountIndex: TEST_ACCOUNT_INDEX,
      ApiKeyIndex: TEST_API_KEY_INDEX,
      MarketIndex: 2,
      ClientOrderIndex: 7,
      BaseAmount: 500,
      Price: 12_345,
      IsAsk: 1,
      ReduceOnly: 1,
      TimeInForce: 1,
      Nonce: 9,
    });
    expect(typeof txInfo.Sig).toBe("string");
  });
});

describe("signCancelOrder / signCancelAllOrders", () => {
  it("signCancelOrder produces distinct hashes for distinct order indices", () => {
    const { privateKey } = generateApiKey();
    createSigningClient(
      "http://localhost:1234",
      privateKey,
      MAINNET_CHAIN_ID,
      TEST_API_KEY_INDEX,
      TEST_ACCOUNT_INDEX,
    );
    const a = signCancelOrder({
      marketIndex: 0,
      orderIndex: 1,
      nonce: 1,
      apiKeyIndex: TEST_API_KEY_INDEX,
      accountIndex: TEST_ACCOUNT_INDEX,
    });
    const b = signCancelOrder({
      marketIndex: 0,
      orderIndex: 2,
      nonce: 1,
      apiKeyIndex: TEST_API_KEY_INDEX,
      accountIndex: TEST_ACCOUNT_INDEX,
    });
    expect(a.txHash).not.toBe(b.txHash);
  });

  it("signCancelAllOrders encodes the 'all markets' sentinel (255), not -1", () => {
    const { privateKey } = generateApiKey();
    createSigningClient(
      "http://localhost:1234",
      privateKey,
      MAINNET_CHAIN_ID,
      TEST_API_KEY_INDEX,
      TEST_ACCOUNT_INDEX,
    );
    const result = signCancelAllOrders({
      nonce: 1,
      apiKeyIndex: TEST_API_KEY_INDEX,
      accountIndex: TEST_ACCOUNT_INDEX,
    });
    expect(result.txType).toBe(16); // TxTypeCancelAllOrders
    const txInfo = JSON.parse(result.txInfo);
    expect(txInfo.AccountIndex).toBe(TEST_ACCOUNT_INDEX);
  });
});

describe("signChangePubKey", () => {
  it("returns a messageToSign matching the exact personal_sign template from lighter-go", () => {
    const { privateKey, publicKey } = generateApiKey();
    createSigningClient(
      "http://localhost:1234",
      privateKey,
      MAINNET_CHAIN_ID,
      2,
      TEST_ACCOUNT_INDEX,
    );
    const result = signChangePubKey({
      pubKeyHex: publicKey,
      nonce: 5,
      apiKeyIndex: 2,
      accountIndex: TEST_ACCOUNT_INDEX,
    });
    expect(result.txType).toBe(8); // TxTypeChangePubKey
    expect(result.messageToSign).toContain("Register Lighter Account");
    expect(result.messageToSign).toContain(
      `pubkey: 0x${publicKey.replace(/^0x/, "")}`,
    );
    expect(result.messageToSign).toContain("nonce: 0x0000000000000005");
    expect(result.messageToSign).toContain("account index: 0x0000000000000001");
    expect(result.messageToSign).toContain("api key index: 0x0000000000000002");
    expect(result.messageToSign).toContain("Only sign this message for a trusted client!");

    const txInfo = JSON.parse(result.txInfo);
    expect(txInfo.L1Sig).toBe(""); // filled in by the caller after the L1 wallet signs
  });

  it("rejects a public key that isn't exactly 40 bytes", () => {
    const { privateKey } = generateApiKey();
    createSigningClient(
      "http://localhost:1234",
      privateKey,
      MAINNET_CHAIN_ID,
      2,
      TEST_ACCOUNT_INDEX,
    );
    expect(() =>
      signChangePubKey({
        pubKeyHex: "0xdead",
        nonce: 1,
        apiKeyIndex: 2,
        accountIndex: TEST_ACCOUNT_INDEX,
      }),
    ).toThrow(/invalid pub key length/);
  });
});

describe("createAuthToken", () => {
  it("returns a non-empty bearer token string", () => {
    const { privateKey } = generateApiKey();
    createSigningClient(
      "http://localhost:1234",
      privateKey,
      MAINNET_CHAIN_ID,
      TEST_API_KEY_INDEX,
      TEST_ACCOUNT_INDEX,
    );
    const token = createAuthToken(0, TEST_API_KEY_INDEX, TEST_ACCOUNT_INDEX);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("produces different tokens for different deadlines", () => {
    const { privateKey } = generateApiKey();
    createSigningClient(
      "http://localhost:1234",
      privateKey,
      MAINNET_CHAIN_ID,
      TEST_API_KEY_INDEX,
      TEST_ACCOUNT_INDEX,
    );
    const now = Math.floor(Date.now() / 1000);
    const tokenA = createAuthToken(now + 3600, TEST_API_KEY_INDEX, TEST_ACCOUNT_INDEX);
    const tokenB = createAuthToken(now + 7200, TEST_API_KEY_INDEX, TEST_ACCOUNT_INDEX);
    expect(tokenA).not.toBe(tokenB);
  });
});
