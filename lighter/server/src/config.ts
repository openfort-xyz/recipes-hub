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
  /**
   * Config-only network switch. Verified live endpoints (source: lighter-python's
   * endpoint_profiles.py, cross-checked against each base URL's own /api/v1/layer1BasicInfo):
   *   - https://testnet.zklighter.elliot.ai        (zkLighter testnet, chainId 300) — default
   *   - https://mainnet.zklighter.elliot.ai        (zkLighter mainnet, chainId 304)
   *   - https://api.rh-testnet.lighter.xyz          (Robinhood Chain testnet, chainId 300)
   *   - https://api.rh.lighter.xyz                  (Robinhood Chain mainnet, chainId 466324)
   */
  apiBaseUrl: string;
  /** L2 signing domain id. Distinct from any L1/EVM chain id — see apiBaseUrl comment for values. */
  chainId: number;
  marketIndex: number;
  marketSymbol: string;
  /** Empty until the account has completed onboarding (first deposit/faucet call assigns one). */
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

/**
 * Derives testnet/mainnet purely from the configured base URL string (both zkLighter and
 * Robinhood Chain use "testnet" in their testnet hostnames). Used to gate the faucet route
 * (testnet-only) and to tell the app which onboarding flow to show.
 */
export function isTestnet(apiBaseUrl: string): boolean {
  return apiBaseUrl.includes("testnet");
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
        publishableKey: process.env["OPENFORT_SHIELD_PUBLISHABLE_KEY"] ?? "",
        secretKey: process.env["OPENFORT_SHIELD_SECRET_KEY"] ?? "",
        encryptionShare: process.env["OPENFORT_SHIELD_ENCRYPTION_KEY"] ?? "",
      },
    },
    lighter: {
      apiBaseUrl: process.env["LIGHTER_API_BASE_URL"]?.trim() || "https://testnet.zklighter.elliot.ai",
      chainId: toNumber(process.env["LIGHTER_CHAIN_ID"], 300),
      marketIndex: toNumber(process.env["LIGHTER_MARKET_INDEX"], 0), // 0 = ETH perp on both testnet and mainnet
      marketSymbol: process.env["LIGHTER_MARKET_SYMBOL"]?.trim() || "ETH",
      accountIndex: toNullableNumber(process.env["LIGHTER_ACCOUNT_INDEX"]),
      apiKeyPrivateKey: process.env["LIGHTER_API_KEY_PRIVATE_KEY"]?.trim() || null,
      apiKeyIndex: toNumber(process.env["LIGHTER_API_KEY_INDEX"], 2), // 0/1 are commonly used by the web UI
    },
  };
}
