interface PaymentConfig {
  scheme: string;
  network: string;
  resource: string;
  description: string;
  mimeType: string;
  maxAmountRequired: string;
  maxTimeoutSeconds?: number;
  asset: string;
  extra: {
    name: string;
    version: string;
  };
}

interface PaywallConfig {
  payToAddress: string;
  rpcUrl: string;
  payment: PaymentConfig;
}

interface ShieldConfig {
  publishableKey: string;
  secretKey: string;
  encryptionShare: string;
}

interface OpenfortConfig {
  secretKey: string;
  walletSecret: string;
  walletId: string;
  delegatedAccountId: string;
  policyId: string;
  shield: ShieldConfig;
}

export interface Config {
  port: number;
  allowedOrigins: string[];
  paywall: PaywallConfig;
  openfort: OpenfortConfig;
}

function parseOrigins(rawOrigins?: string): string[] {
  if (!rawOrigins) return [];
  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function toNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function resolveRpcUrl(explicit: string | undefined, network: string): string {
  if (explicit) return explicit;
  if (network === "base-sepolia") return "https://sepolia.base.org";
  if (network === "base") return "https://mainnet.base.org";
  return "";
}

export function loadConfig(): Config {
  const network = process.env.X402_NETWORK ?? "";
  return {
    port: toNumber(process.env.PORT) ?? 3001,
    allowedOrigins: parseOrigins(process.env.CORS_ORIGINS),
    paywall: {
      payToAddress: process.env.PAY_TO_ADDRESS ?? "",
      rpcUrl: resolveRpcUrl(process.env.X402_RPC_URL, network),
      payment: {
        scheme: "exact",
        network,
        resource: process.env.X402_RESOURCE ?? "",
        description: process.env.X402_DESCRIPTION ?? "",
        mimeType: process.env.X402_MIME_TYPE ?? "",
        maxAmountRequired: process.env.X402_MAX_AMOUNT ?? "",
        maxTimeoutSeconds: toNumber(process.env.X402_TIMEOUT),
        asset: process.env.X402_ASSET_ADDRESS ?? "",
        extra: {
          name: process.env.X402_ASSET_NAME ?? "",
          version: process.env.X402_ASSET_VERSION ?? "",
        },
      },
    },
    openfort: {
      secretKey: process.env.OPENFORT_SECRET_KEY ?? "",
      walletSecret: process.env.OPENFORT_WALLET_SECRET ?? "",
      walletId: process.env.OPENFORT_BACKEND_WALLET_ID ?? "",
      delegatedAccountId:
        process.env.OPENFORT_DELEGATED_ACCOUNT_ID?.trim() ?? "",
      policyId: process.env.OPENFORT_POLICY_ID ?? "",
      shield: {
        publishableKey: process.env.OPENFORT_SHIELD_PUBLISHABLE_KEY ?? "",
        secretKey: process.env.OPENFORT_SHIELD_SECRET_KEY ?? "",
        encryptionShare: process.env.OPENFORT_SHIELD_ENCRYPTION_SHARE ?? "",
      },
    },
  };
}
