import Constants from "expo-constants";

function isPlaceholder(value?: string): boolean {
  if (!value) return true;
  return (
    value === "YOUR_PROJECT_PUBLISHABLE_KEY" ||
    value === "YOUR_SHIELD_PUBLISHABLE_KEY" ||
    value === "YOUR_GAS_SPONSORSHIP_POLICY_ID" ||
    value === "https://your-recovery-endpoint.example.com"
  );
}

export function getPublishableKey(): string {
  const value = Constants.expoConfig?.extra?.openfortPublishableKey as string | undefined;
  if (isPlaceholder(value)) {
    throw new Error(
      "[CONFIG] Missing Openfort publishable key. Set OPENFORT_PUBLISHABLE_KEY in .env or update app.config.js extra.openfortPublishableKey."
    );
  }
  return value as string;
}

export function getShieldPublishableKey(): string {
  const value = Constants.expoConfig?.extra?.openfortShieldPublishableKey as string | undefined;
  if (isPlaceholder(value)) {
    throw new Error(
      "[CONFIG] Missing Openfort Shield publishable key. Set OPENFORT_SHIELD_PUBLISHABLE_KEY in .env or update app.config.js extra.openfortShieldPublishableKey."
    );
  }
  return value as string;
}

export function getEthereumProviderPolicyId(): string | undefined {
  const value = Constants.expoConfig?.extra?.openfortEthereumProviderPolicyId as string | undefined;
  if (isPlaceholder(value)) {
    console.warn(
      "[CONFIG] No gas sponsorship policy configured (OPENFORT_ETHEREUM_PROVIDER_POLICY_ID). Gasless actions may be disabled."
    );
    return undefined;
  }
  return value;
}

export function getShieldRecoveryBaseUrl(): string {
  const value = Constants.expoConfig?.extra?.openfortShieldRecoveryBaseUrl as string | undefined;
  if (isPlaceholder(value)) {
    throw new Error(
      "[CONFIG] Missing wallet recovery base URL. Set OPENFORT_SHIELD_RECOVERY_BASE_URL in .env or update app.config.js extra.openfortShieldRecoveryBaseUrl."
    );
  }
  return value as string;
}


