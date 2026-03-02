import type { Openfort } from "@openfort/openfort-node";
import type { Request, Response } from "express";
import { getAddress, isAddress } from "viem";
import type { Config } from "./config.js";
import {
  getBackendWalletAccount,
  resolveBackendWalletAddress,
} from "./openfort.js";
import {
  type PaymentRequirements,
  FacilitatorError,
  PaymentVerificationError,
  createBackendWalletPayment,
  createPaymentRequiredResponse,
  decodePaymentHeader,
  NETWORK_CHAIN_ID,
  parsePaymentPayload,
  settleWithFacilitator,
  submitTransferWithAuthorizationGasless,
  tryUpgradeBackendWalletToDelegated,
  toErrorJson,
  verifyOffChainPayment,
  verifyOnChainPayment,
  verifyWithFacilitator,
} from "./payment.js";
import type { SupportedNetwork } from "./payment.js";

function sendPaymentError(res: Response, error: unknown, errorLabel = "Failed to sign payment"): void {
  console.error(JSON.stringify({ context: "backend-wallet", ...toErrorJson(error) }));
  if (error instanceof PaymentVerificationError) {
    res.status(402).json({ code: error.code, message: error.message });
    return;
  }
  const details = error instanceof Error ? error.message : "Unknown error";
  const isAccountExists = typeof details === "string" && details.toLowerCase().includes("account already exist");
  res.status(500).json({
    error: errorLabel,
    details: isAccountExists
      ? `${details} (set OPENFORT_DELEGATED_ACCOUNT_ID in .env.local to skip upgrade)`
      : details,
  });
}

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
    console.error(JSON.stringify({ context: "Shield session", ...toErrorJson(error) }));
    res.status(500).json({
      error: "Failed to create encryption session",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function handleProtectedContent(
  req: Request,
  res: Response,
  paywall: Config["paywall"],
  facilitatorUrl: string,
  facilitatorAuth?: { keyId: string; keySecret: string },
): Promise<void> {
  // V1: X-PAYMENT; V2: PAYMENT-SIGNATURE (Migration Guide)
  const paymentHeader = (req.headers["x-payment"] ?? req.headers["payment-signature"]) as
    | string
    | undefined;
  const transactionHash = req.headers["x-transaction-hash"] as string | undefined;

  if (!paymentHeader && !transactionHash) {
    res.status(402).json(createPaymentRequiredResponse(paywall));
    return;
  }

  if (transactionHash) {
    try {
      await verifyOnChainPayment(transactionHash, paywall, paywall.rpcUrl);
      const walletType = (req.headers["x-wallet-type"] as string) || "embedded";
      console.log(`x402 tx | wallet: ${walletType} | gas: on-chain`);
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
    } catch (error) {
      if (error instanceof PaymentVerificationError) {
        res.status(402).json({ code: error.code, message: error.message });
      } else {
        console.error(JSON.stringify({ context: "Payment verification (tx hash)", ...toErrorJson(error) }));
        res.status(500).json({ error: "Internal server error" });
      }
    }
    return;
  }

  const header = paymentHeader ?? "";
  if (facilitatorUrl) {
    try {
      const raw = decodePaymentHeader(header);
      const payment = parsePaymentPayload(raw);
      const verifyResult = await verifyWithFacilitator(
        facilitatorUrl,
        payment,
        paywall,
        facilitatorAuth,
      );
      if (!verifyResult.isValid) {
        res.status(402).json({
          code: "FACILITATOR_VERIFY_INVALID",
          message: "Payment verification failed",
        });
        return;
      }
      const settleResult = await settleWithFacilitator(
        facilitatorUrl,
        payment,
        paywall,
        facilitatorAuth,
      );
      const walletType = (req.headers["x-wallet-type"] as string) || "embedded";
      console.log(`x402 tx | wallet: ${walletType} | gas: facilitator`);
      res.status(200).json({
        success: true,
        message: "Payment accepted via facilitator! Here's your protected content.",
        transactionHash: settleResult.transaction,
        content: {
          title: "Premium Content Unlocked",
          data: "This is the protected content you paid for!",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof FacilitatorError || error instanceof PaymentVerificationError) {
        const code = error instanceof FacilitatorError ? error.code : (error as PaymentVerificationError).code;
        res.status(402).json({ code, message: error.message });
      } else {
        console.error(JSON.stringify({ context: "Payment verification (facilitator)", ...toErrorJson(error) }));
        res.status(500).json({ error: "Internal server error" });
      }
    }
    return;
  }

  try {
    await verifyOffChainPayment(header, paywall);
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
    if (error instanceof PaymentVerificationError) {
      res.status(402).json({ code: error.code, message: error.message });
    } else {
      console.error(JSON.stringify({ context: "Payment verification (off-chain)", ...toErrorJson(error) }));
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

// ---- Backend wallet (Option B) test routes ----

function buildPaymentRequirementsFromPaywall(paywall: Config["paywall"]): PaymentRequirements {
  return {
    x402Version: paywall.payment.x402Version,
    scheme: "exact",
    network: paywall.payment.network as PaymentRequirements["network"],
    maxAmountRequired: paywall.payment.maxAmountRequired,
    resource: paywall.payment.resource,
    description: paywall.payment.description,
    mimeType: paywall.payment.mimeType,
    payTo: getAddress(paywall.payToAddress),
    maxTimeoutSeconds: paywall.payment.maxTimeoutSeconds ?? 300,
    asset: getAddress(paywall.payment.asset),
    extra: paywall.payment.extra,
  };
}

export async function handleBackendWalletStatus(
  _req: Request,
  res: Response,
  openfortClient: Openfort | null,
  env: Config,
): Promise<void> {
  const hasWalletConfig =
    Boolean(env.openfort.walletSecret && env.openfort.walletId.trim()) &&
    Boolean(env.paywall.payToAddress?.trim());
  let payerAddress: string | undefined;
  if (openfortClient && env.openfort.walletId.trim()) {
    const address = await resolveBackendWalletAddress(
      openfortClient,
      env.openfort.walletId.trim(),
    );
    payerAddress = address ?? undefined;
  }
  const configured = hasWalletConfig && Boolean(payerAddress);
  const facilitatorAvailable =
    Boolean(env.openfort.facilitatorUrl?.trim()) &&
    Boolean(env.openfort.facilitatorApiKeyId?.trim()) &&
    Boolean(env.openfort.facilitatorApiKeySecret?.trim());
  const openfortPolicyAvailable = Boolean(
    env.openfort.delegatedAccountId?.trim(),
  );

  res.status(200).json({
    configured,
    payerAddress: payerAddress ?? undefined,
    payToAddress: env.paywall.payToAddress?.trim() || undefined,
    network: env.paywall.payment.network || undefined,
    maxAmountRequired: env.paywall.payment.maxAmountRequired || undefined,
    facilitatorAvailable,
    openfortPolicyAvailable,
  });
}

export async function handleBackendWalletCreate(
  _req: Request,
  res: Response,
  openfortClient: Openfort | null,
  env: Config,
): Promise<void> {
  if (!openfortClient || !env.openfort.walletSecret) {
    res.status(400).json({
      error: "Backend wallet creation requires OPENFORT_SECRET_KEY and OPENFORT_WALLET_SECRET in server env.",
    });
    return;
  }
  try {
    const account = await openfortClient.accounts.evm.backend.create();
    let delegatedAccountId: string | undefined;
    const network = env.paywall.payment.network as SupportedNetwork | undefined;
    const chainId = network && network in NETWORK_CHAIN_ID ? NETWORK_CHAIN_ID[network] : 84532;
    const rpcUrl = env.paywall.rpcUrl?.trim();
    if (rpcUrl && env.openfort.secretKey) {
      const upgraded = await tryUpgradeBackendWalletToDelegated(
        openfortClient,
        account.id,
        chainId,
        rpcUrl,
        env.openfort.secretKey,
      );
      if (upgraded) delegatedAccountId = upgraded.delegatedAccountId;
    }
    res.status(201).json({
      id: account.id,
      address: account.address,
      ...(delegatedAccountId && { delegatedAccountId }),
    });
  } catch (error) {
    sendPaymentError(res, error, "Failed to create backend wallet");
  }
}

/**
 * Upgrades the configured backend EOA to a Delegated Account (EIP-7702) for gasless transactions.
 * Requires OPENFORT_BACKEND_WALLET_ID. Use after creating a wallet if gas sponsorship is needed.
 */
export async function handleBackendWalletUpgrade(
  _req: Request,
  res: Response,
  openfortClient: Openfort | null,
  env: Config,
): Promise<void> {
  const walletId = env.openfort.walletId?.trim();
  if (!openfortClient || !env.openfort.walletSecret || !walletId) {
    res.status(400).json({
      error: "Backend wallet not configured. Set OPENFORT_WALLET_SECRET and OPENFORT_BACKEND_WALLET_ID.",
    });
    return;
  }
  const rpcUrl = env.paywall.rpcUrl?.trim();
  if (!rpcUrl) {
    res.status(400).json({ error: "Paywall RPC URL not set (X402_RPC_URL or network)." });
    return;
  }
  const network = env.paywall.payment.network as SupportedNetwork | undefined;
  const chainId = network && network in NETWORK_CHAIN_ID ? NETWORK_CHAIN_ID[network] : 84532;
  try {
    const result = await tryUpgradeBackendWalletToDelegated(
      openfortClient,
      walletId,
      chainId,
      rpcUrl,
      env.openfort.secretKey,
    );
    if (result) {
      res.status(200).json({ delegatedAccountId: result.delegatedAccountId });
      return;
    }
    res.status(501).json({
      error: "Upgrade not available",
      message:
        "Backend EOA → Delegated Account upgrade is not supported by the current Openfort SDK/API. Use @openfort/openfort-node 0.9+ and ensure the API supports PATCH /v2/accounts/backend/{id} or backend.update().",
    });
  } catch (error) {
    sendPaymentError(res, error, "Failed to upgrade backend wallet");
  }
}

export async function handleBackendWalletTestPayment(
  req: Request,
  res: Response,
  openfortClient: Openfort | null,
  env: Config,
): Promise<void> {
  const { walletId, walletSecret } = env.openfort;

  if (!openfortClient || !walletId || !walletSecret) {
    res.status(400).json({
      error: "Backend wallet not configured. Set OPENFORT_WALLET_SECRET and OPENFORT_BACKEND_WALLET_ID in backend/.env.local and restart.",
    });
    return;
  }
  const payToRaw = env.paywall.payToAddress?.trim();
  if (!payToRaw) {
    res.status(400).json({ error: "PAY_TO_ADDRESS not set in backend/.env.local." });
    return;
  }
  if (!isAddress(payToRaw)) {
    res.status(400).json({
      error: "Invalid PAY_TO_ADDRESS in backend/.env.local (must be a valid EVM address).",
    });
    return;
  }

  const gasMode = req.query.gasMode === "facilitator" || req.query.gasMode === "openfort-policy"
    ? (req.query.gasMode as "facilitator" | "openfort-policy")
    : undefined;
  const facilitatorConfigured =
    Boolean(env.openfort.facilitatorUrl?.trim()) &&
    Boolean(env.openfort.facilitatorApiKeyId?.trim()) &&
    Boolean(env.openfort.facilitatorApiKeySecret?.trim());

  try {
    const account = await getBackendWalletAccount(openfortClient, walletId);
    if (!account) {
      res.status(500).json({ error: "Failed to load backend wallet account." });
      return;
    }

    const requirements = buildPaymentRequirementsFromPaywall(env.paywall);
    const paymentHeader = await createBackendWalletPayment(account, requirements);

    if (gasMode === "facilitator" && facilitatorConfigured) {
      res.status(200).json({ paymentHeader });
      return;
    }

    const policyId = env.openfort.policyId?.trim() ?? "";
    const hasDelegatedAccount = Boolean(env.openfort.delegatedAccountId?.trim());
    if (hasDelegatedAccount) {
      try {
        const raw = decodePaymentHeader(paymentHeader);
        const payment = parsePaymentPayload(raw);
        const asset = getAddress(env.paywall.payment.asset);
        const transactionHash = await submitTransferWithAuthorizationGasless(
          openfortClient,
          walletId.trim(),
          policyId,
          payment,
          asset,
          env.paywall.rpcUrl,
          env.openfort.secretKey,
          env.openfort.delegatedAccountId || undefined,
        );
        await verifyOnChainPayment(transactionHash, env.paywall, env.paywall.rpcUrl);
        console.log("x402 tx | wallet: backend | gas: openfort");
        res.status(200).json({
          success: true,
          transactionHash,
          message: "Payment accepted! Backend wallet x402 flow complete (gas sponsored).",
          content: {
            title: "Premium Content Unlocked",
            data: "This is the protected content you paid for!",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      } catch (gaslessError) {
        const isAccountTypeError =
          gaslessError instanceof PaymentVerificationError &&
          gaslessError.code === "TX_BROADCAST_FAILED" &&
          (gaslessError.message.includes("Account type not supported") ||
            gaslessError.message.includes("account type"));
        if (isAccountTypeError) {
          res.status(200).json({ paymentHeader });
          return;
        }
        throw gaslessError;
      }
    }

    res.status(200).json({ paymentHeader });
  } catch (error) {
    sendPaymentError(res, error);
  }
}
