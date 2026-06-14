import Constants from "expo-constants";

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

// Optional: a Pimlico API key enables a sponsored relayer (gasless). When unset,
// the embedded wallet relays its own transactions and pays gas in xDAI.
export function getPimlicoApiKey(): string | undefined {
  const value = read("pimlicoApiKey");
  return value ? value : undefined;
}

// Optional: a Pimlico sponsorship policy id (sp_...). On mainnet (Gnosis is
// mainnet) the paymaster only sponsors with a policy + funded gas tank; pass the
// id here if your API key doesn't already have a default policy bound to it.
export function getPimlicoSponsorshipPolicyId(): string | undefined {
  const value = read("pimlicoSponsorshipPolicyId");
  return value ? value : undefined;
}

export function getGnosisRpcUrl(): string {
  return read("gnosisRpcUrl") || "https://rpc.gnosischain.com";
}
