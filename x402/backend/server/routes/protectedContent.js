import { createPaymentRequiredResponse } from "../services/paymentRequirements.js";
import { decodePaymentHeader } from "../services/paymentDecoder.js";

export async function handleProtectedContent(req, res, { paywall }) {
  const paymentHeader = req.headers["x-payment"];
  const transactionHash = req.headers["x-transaction-hash"];

  if (!paymentHeader && !transactionHash) {
    res.writeHead(402, { "Content-Type": "application/json" });
    res.end(JSON.stringify(createPaymentRequiredResponse(paywall)));
    return;
  }

  if (transactionHash) {
    console.log("Transaction hash received:", transactionHash);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      success: true,
      message: "Payment accepted via on-chain transaction! Here's your protected content.",
      transactionHash,
      content: {
        title: "Premium Content Unlocked",
        data: "This is the protected content you paid for!",
        timestamp: new Date().toISOString(),
      },
    }));
    return;
  }

  try {
    const paymentData = decodePaymentHeader(paymentHeader);
    console.log("Payment received:", paymentData);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      success: true,
      message: "Payment accepted! Here's your protected content.",
      content: {
        title: "Premium Content Unlocked",
        data: "This is the protected content you paid for!",
        timestamp: new Date().toISOString(),
      },
    }));
  } catch (error) {
    console.error("Payment validation error:", error);
    res.writeHead(402, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "Invalid payment",
      x402Version: 1,
    }));
  }
}
