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
    "[CONFIG] Missing Openfort publishable key. Set OPENFORT_PUBLISHABLE_KEY in .env or update app.config.js extra.openfortPublishableKey."
  );
}

export function getShieldPublishableKey(): string {
  return ensureValue(
    getExtraValue<string>("openfortShieldPublishableKey"),
    "[CONFIG] Missing Openfort Shield publishable key. Set OPENFORT_SHIELD_PUBLISHABLE_KEY in .env or update app.config.js extra.openfortShieldPublishableKey."
  );
}

export function getShieldRecoveryBaseUrl(): string {
  return ensureValue(
    getExtraValue<string>("openfortShieldRecoveryBaseUrl"),
    "[CONFIG] Missing wallet recovery base URL. Set OPENFORT_SHIELD_RECOVERY_BASE_URL in .env or update app.config.js extra.openfortShieldRecoveryBaseUrl."
  );
}

export function getFeeSponsorshipId(): string | undefined {
  const value = getExtraValue<string>("openfortFeeSponsorshipId");
  if (!value || PLACEHOLDER_VALUES.has(value)) {
    console.warn(
      "[CONFIG] No gas sponsorship policy configured (OPENFORT_FEE_SPONSORSHIP_ID). Gasless actions may be disabled."
    );
    return undefined;
  }
  return value;
}
