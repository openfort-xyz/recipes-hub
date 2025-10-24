import type { IncomingMessage, ServerResponse } from "http";
import type { Openfort } from "@openfort/openfort-node";
import type { Config } from "./config.js";
import { decodePaymentHeader, createPaymentRequiredResponse } from "./payment.js";

export async function handleHealth(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status: "ok",
    message: "x402 demo server is running",
  }));
}

export async function handleShieldSession(
  req: IncomingMessage,
  res: ServerResponse,
  openfortClient: Openfort | null,
  shieldConfig: Config["openfort"]["shield"]
): Promise<void> {
  const hasShieldConfig = Boolean(
    shieldConfig.publishableKey &&
    shieldConfig.secretKey &&
    shieldConfig.encryptionShare
  );

  if (!openfortClient || !hasShieldConfig) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "Openfort Shield configuration is missing.",
    }));
    return;
  }

  try {
    const sessionId = await openfortClient.registerRecoverySession(
      shieldConfig.publishableKey,
      shieldConfig.secretKey,
      shieldConfig.encryptionShare,
    );
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ session: sessionId }));
  } catch (error) {
    console.error("Shield session error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "Failed to create recovery session",
      details: error instanceof Error ? error.message : "Unknown error",
    }));
  }
}

export async function handleProtectedContent(
  req: IncomingMessage,
  res: ServerResponse,
  paywall: Config["paywall"]
): Promise<void> {
  const paymentHeader = req.headers["x-payment"] as string | undefined;
  const transactionHash = req.headers["x-transaction-hash"] as string | undefined;

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
    const paymentData = decodePaymentHeader(paymentHeader!);
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
