import Constants from "expo-constants";
import type { SiweParams } from "./session";

function read(key: string): string | undefined {
  return Constants.expoConfig?.extra?.[key] as string | undefined;
}

function isPlaceholder(value?: string): boolean {
  if (!value) return true;
  return value === "YOUR_PROJECT_PUBLISHABLE_KEY" || value === "YOUR_SHIELD_PUBLISHABLE_KEY";
}

export function getPublishableKey(): string {
  const value = read("openfortPublishableKey");
  if (isPlaceholder(value)) {
    throw new Error(
      "[CONFIG] Missing Openfort publishable key. Set OPENFORT_PROJECT_PUBLISHABLE_KEY in .env."
    );
  }
  return value as string;
}

export function getShieldPublishableKey(): string {
  const value = read("openfortShieldPublishableKey");
  if (isPlaceholder(value)) {
    throw new Error(
      "[CONFIG] Missing Openfort Shield publishable key. Set OPENFORT_SHIELD_PUBLISHABLE_KEY in .env."
    );
  }
  return value as string;
}

// Optional: undefined disables gas sponsorship (wallet pays xDAI directly).
export function getFeeSponsorshipId(): string | undefined {
  const value = read("openfortFeeSponsorshipId");
  return value ? value : undefined;
}

// "sandbox" (default) or "production". Production credentials need a Gnosis Pay partnership.
export function getGnosisPayApiUrl(): string {
  return read("gnosisPayEnv") === "production"
    ? "https://core.prod.gnosispay.com/user-api"
    : "https://core.sandbox.gnosispay.in/user-api";
}

// SIWE params. Gnosis Pay rejects (403) a domain it has not whitelisted for your partner account.
export function getSiweParams(): SiweParams {
  const domain = read("gnosisPaySiweDomain");
  if (!domain) throw new Error("[CONFIG] Missing GNOSIS_PAY_SIWE_DOMAIN. Use the domain Gnosis Pay whitelisted for you.");
  return {
    domain,
    uri: read("gnosisPaySiweUri") || `https://${domain}`,
    appName: read("gnosisPayAppName") || "Openfort Gnosis Pay",
  };
}

export function getGnosisRpcUrl(): string {
  return read("gnosisRpcUrl") || "https://rpc.gnosischain.com";
}
