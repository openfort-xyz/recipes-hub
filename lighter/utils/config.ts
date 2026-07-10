import Constants from "expo-constants";

const PLACEHOLDER_VALUES = new Set([
  "YOUR_PROJECT_PUBLISHABLE_KEY",
  "YOUR_SHIELD_PUBLISHABLE_KEY",
  "YOUR_GAS_SPONSORSHIP_POLICY_ID",
  "https://your-recovery-endpoint.example.com",
  "",
]);

function getExtraValue<T = string>(key: string): T | undefined {
  return Constants.expoConfig?.extra?.[key] as T | undefined;
}

function ensureValue(value: string | undefined, message: string): string {
  if (!value || PLACEHOLDER_VALUES.has(value)) {
    throw new Error(message);
  }
  return value;
}

export function getPublishableKey(): string {
  return ensureValue(
    getExtraValue<string>("openfortPublishableKey"),
    "[CONFIG] Missing Openfort publishable key. Set OPENFORT_PUBLISHABLE_KEY in .env.",
  );
}

export function getShieldPublishableKey(): string {
  return ensureValue(
    getExtraValue<string>("openfortShieldPublishableKey"),
    "[CONFIG] Missing Openfort Shield publishable key. Set SHIELD_PUBLISHABLE_KEY in .env.",
  );
}

export function getShieldRecoveryBaseUrl(): string {
  return ensureValue(
    getExtraValue<string>("openfortShieldRecoveryBaseUrl"),
    "[CONFIG] Missing wallet recovery base URL. Set OPENFORT_SHIELD_RECOVERY_BASE_URL in .env.",
  );
}

export function getFeeSponsorshipId(): string | undefined {
  const value = getExtraValue<string>("openfortFeeSponsorshipId");
  if (!value || PLACEHOLDER_VALUES.has(value)) {
    console.warn("[CONFIG] No gas sponsorship configured (OPENFORT_FEE_SPONSORSHIP_ID). Mainnet gas is real ETH.");
    return undefined;
  }
  return value;
}

export function getLighterServerBaseUrl(): string {
  return ensureValue(
    getExtraValue<string>("lighterServerBaseUrl"),
    "[CONFIG] Missing Lighter recipe server URL. Set LIGHTER_SERVER_BASE_URL in .env.",
  );
}

export function getLighterMarketSymbol(): string {
  return getExtraValue<string>("lighterMarketSymbol") ?? "ETH";
}

export function getLighterDepositContractAddress(): `0x${string}` {
  return ensureValue(
    getExtraValue<string>("lighterDepositContractAddress"),
    "[CONFIG] Missing Lighter deposit contract address.",
  ) as `0x${string}`;
}

export function getUsdcContractAddress(): `0x${string}` {
  return ensureValue(getExtraValue<string>("usdcContractAddress"), "[CONFIG] Missing USDC contract address.") as `0x${string}`;
}
