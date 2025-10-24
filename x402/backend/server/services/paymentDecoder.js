export function decodePaymentHeader(paymentHeader) {
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
