import type { Config } from "./config.js";

export function decodePaymentHeader(paymentHeader: string): unknown {
  if (!paymentHeader) {
    throw new Error("Missing payment header");
  }
  try {
    const decoded =
      typeof globalThis !== "undefined" && "atob" in globalThis
        ? globalThis.atob(paymentHeader)
        : Buffer.from(paymentHeader, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error("Failed to decode payment header", { cause: error });
  }
}

export function createPaymentRequiredResponse(paywallConfig: Config["paywall"]) {
  return {
    error: "Payment required",
    x402Version: 1,
    paymentRequirements: {
      ...paywallConfig.payment,
      payTo: paywallConfig.payToAddress,
    },
  };
}
