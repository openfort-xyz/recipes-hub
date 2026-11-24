import assert from "node:assert/strict";
import test from "node:test";
import { encodeAbiParameters, encodeEventTopics, erc20Abi, zeroHash } from "viem";
import { verifyOnChainPayment } from "../dist/payment.js";

const asset = `0x${"ab".repeat(20)}`;
const otherAsset = `0x${"cd".repeat(20)}`;
const payToAddress = `0x${"ef".repeat(20)}`;
const payer = `0x${"89".repeat(20)}`;
const payment = { asset, maxAmountRequired: "1000" };
const paywall = { payToAddress, payment };
const rpc = "http://receipt-fixture.invalid";
const hash = (byte) => `0x${byte.repeat(32)}`;

function transfer(address, to = payToAddress, value = 1000n) {
  return {
    address,
    topics: encodeEventTopics({ abi: erc20Abi, eventName: "Transfer", args: { from: payer, to } }),
    data: encodeAbiParameters([{ type: "uint256" }], [value]),
  };
}

function mockReceipt(t, transactionHash, logs) {
  return t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({
    jsonrpc: "2.0",
    id: 0,
    result: {
      transactionHash,
      status: "0x1",
      logs,
    },
  }), { headers: { "content-type": "application/json" } }));
}

test("rejects a missing, malformed, or all-zero hash before looking up a receipt", async (t) => {
  const fetchReceipt = mockReceipt(t, zeroHash, []);
  for (const invalidHash of ["", "0x1234", zeroHash]) {
    await assert.rejects(verifyOnChainPayment(invalidHash, paywall, rpc), {
      code: "INVALID_TRANSACTION_HASH",
    });
  }
  assert.equal(fetchReceipt.mock.callCount(), 0);
});

test("requires a receipt for the transaction being verified", async (t) => {
  mockReceipt(t, hash("11"), [transfer(asset)]);
  await assert.rejects(verifyOnChainPayment(hash("22"), paywall, rpc), { code: "TX_NOT_FOUND" });
});

test("requires a sufficient transfer of the configured asset to the payee", async (t) => {
  const transactionHash = hash("33");
  mockReceipt(t, transactionHash, [
    transfer(otherAsset),
    transfer(asset, payer),
    transfer(asset, payToAddress, 999n),
  ]);
  await assert.rejects(verifyOnChainPayment(transactionHash, paywall, rpc), {
    code: "INSUFFICIENT_PAYMENT",
  });
});

test("accepts the configured asset when its transfer meets the paywall price", async (t) => {
  const transactionHash = hash("44");
  mockReceipt(t, transactionHash, [transfer(otherAsset), transfer(asset)]);
  await verifyOnChainPayment(transactionHash, paywall, rpc);
});
