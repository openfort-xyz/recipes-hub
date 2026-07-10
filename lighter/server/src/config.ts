interface ShieldConfig {
  publishableKey: string;
  secretKey: string;
  encryptionShare: string;
}

interface OpenfortConfig {
  secretKey: string;
  shield: ShieldConfig;
}

interface LighterConfig {
  /** Config-only Robinhood Chain support: point this at https://api.rh.lighter.xyz to switch. */
  apiBaseUrl: string;
  /** L2 signing domain id (mainnet zklighter = 304). Distinct from any L1/EVM chain id. */
  chainId: number;
  marketIndex: number;
  marketSymbol: string;
  /** Empty until the account has completed onboarding (first deposit assigns one). */
  accountIndex: number | null;
  /** Empty until an API key has been generated and registered via ChangePubKey. */
  apiKeyPrivateKey: string | null;
  apiKeyIndex: number;
}

export interface Config {
  port: number;
  allowedOrigins: string[];
  openfort: OpenfortConfig;
  lighter: LighterConfig;
}

function parseOrigins(rawOrigins?: string): string[] {
  if (!rawOrigins) return [];
  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function loadConfig(): Config {
  return {
    port: toNumber(process.env["PORT"], 3008),
    allowedOrigins: parseOrigins(process.env["CORS_ORIGINS"]),
    openfort: {
      secretKey: process.env["OPENFORT_SECRET_KEY"] ?? "",
      shield: {
        publishableKey: process.env["SHIELD_PUBLISHABLE_KEY"] ?? "",
        secretKey: process.env["SHIELD_SECRET_KEY"] ?? "",
        encryptionShare: process.env["SHIELD_ENCRYPTION_SHARE"] ?? "",
      },
    },
    lighter: {
      apiBaseUrl: process.env["LIGHTER_API_BASE_URL"]?.trim() || "https://mainnet.zklighter.elliot.ai",
      chainId: toNumber(process.env["LIGHTER_CHAIN_ID"], 304),
      marketIndex: toNumber(process.env["LIGHTER_MARKET_INDEX"], 0), // 0 = ETH perp on mainnet
      marketSymbol: process.env["LIGHTER_MARKET_SYMBOL"]?.trim() || "ETH",
      accountIndex: toNullableNumber(process.env["LIGHTER_ACCOUNT_INDEX"]),
      apiKeyPrivateKey: process.env["LIGHTER_API_KEY_PRIVATE_KEY"]?.trim() || null,
      apiKeyIndex: toNumber(process.env["LIGHTER_API_KEY_INDEX"], 2), // 0/1 are commonly used by the web UI
    },
  };
}
