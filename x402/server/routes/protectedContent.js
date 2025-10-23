import { createPaymentRequiredResponse } from "../services/paymentRequirements.js";
import { decodePaymentHeader } from "../services/paymentDecoder.js";

export function registerProtectedContentRoute(app, { paywall }) {
  app.all("/api/protected-content", async c => {
    const paymentHeader = c.req.header("X-PAYMENT");
    const transactionHash = c.req.header("X-TRANSACTION-HASH");

    if (!paymentHeader && !transactionHash) {
      return c.json(createPaymentRequiredResponse(paywall), 402);
    }

    if (transactionHash) {
      console.log("Transaction hash received:", transactionHash);
      return c.json({
        success: true,
        message: "Payment accepted via on-chain transaction! Here's your protected content.",
        transactionHash,
        content: {
          title: "Premium Content Unlocked",
          data: "This is the protected content you paid for!",
          timestamp: new Date().toISOString(),
        },
      });
    }

    try {
      const paymentData = decodePaymentHeader(paymentHeader);
      console.log("Payment received:", paymentData);
      return c.json({
        success: true,
        message: "Payment accepted! Here's your protected content.",
        content: {
          title: "Premium Content Unlocked",
          data: "This is the protected content you paid for!",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Payment validation error:", error);
      return c.json({
        error: "Invalid payment",
        x402Version: 1,
      }, 402);
    }
  });
}
