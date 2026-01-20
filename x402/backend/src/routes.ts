import type { Request, Response } from "express";
import type { Openfort } from "@openfort/openfort-node";
import type { Config } from "./config.js";
import { decodePaymentHeader, createPaymentRequiredResponse } from "./payment.js";

export async function handleHealth(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    status: "ok",
    message: "x402 demo server is running",
  });
}

/**
 * Creates an encryption session for AUTOMATIC embedded wallet recovery.
 * This endpoint is required when using automatic wallet recovery with Openfort Shield.
 *
 * @see https://www.openfort.io/docs/products/embedded-wallet/react-native/quickstart/automatic
 * @see https://github.com/openfort-xyz/openfort-backend-quickstart
 */
export async function handleShieldSession(
  _req: Request,
  res: Response,
  openfortClient: Openfort | null,
  shieldConfig: Config["openfort"]["shield"]
): Promise<void> {
  const hasShieldConfig = Boolean(
    shieldConfig.publishableKey &&
    shieldConfig.secretKey &&
    shieldConfig.encryptionShare
  );

  if (!openfortClient || !hasShieldConfig) {
    res.status(500).json({
      error: "Openfort Shield configuration is missing.",
    });
    return;
  }

  try {
    const sessionId = await openfortClient.createEncryptionSession(
      shieldConfig.publishableKey,
      shieldConfig.secretKey,
      shieldConfig.encryptionShare,
    );
    res.status(200).json({ session: sessionId });
  } catch (error) {
    console.error("Shield session error:", error);
    res.status(500).json({
      error: "Failed to create encryption session",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function handleProtectedContent(
  req: Request,
  res: Response,
  paywall: Config["paywall"]
): Promise<void> {
  const paymentHeader = req.headers["x-payment"] as string | undefined;
  const transactionHash = req.headers["x-transaction-hash"] as string | undefined;

  if (!paymentHeader && !transactionHash) {
    res.status(402).json(createPaymentRequiredResponse(paywall));
    return;
  }

  if (transactionHash) {
    console.log("Transaction hash received:", transactionHash);
    res.status(200).json({
      success: true,
      message: "Payment accepted via on-chain transaction! Here's your protected content.",
      transactionHash,
      content: {
        title: "Premium Content Unlocked",
        data: "This is the protected content you paid for!",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  try {
    const paymentData = decodePaymentHeader(paymentHeader!);
    console.log("Payment received:", paymentData);
    res.status(200).json({
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
    res.status(402).json({
      error: "Invalid payment",
      x402Version: 1,
    });
  }
}
