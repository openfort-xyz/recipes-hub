export function buildPaymentRequirements(paywallConfig) {
  return {
    ...paywallConfig.payment,
    payTo: paywallConfig.payToAddress,
  };
}

export function createPaymentRequiredResponse(paywallConfig) {
  return {
    error: "Payment required",
    x402Version: 1,
    paymentRequirements: buildPaymentRequirements(paywallConfig),
  };
}
