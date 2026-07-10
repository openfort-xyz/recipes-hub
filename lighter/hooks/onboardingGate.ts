import type { AccountResponse, LighterServerConfig } from "../services/lighterServerClient";

// Pure logic, deliberately separated from useLighterOnboarding.ts's React/fetch wiring so it has
// no runtime dependency on react-native (whose Flow syntax vitest can't parse) and can carry a
// regression test on its own — see onboardingGate.test.ts and FRICTION_LOG.md's split-brain
// entry for why that regression test exists.

export type OnboardingStep = "deposit" | "registerApiKey" | "activateServer" | "ready";

export function accountsMismatch(account: AccountResponse["account"], serverConfig: LighterServerConfig | null): boolean {
  return Boolean(account && serverConfig?.serverWalletConfigured && serverConfig.accountIndex !== account.index);
}

export function deriveStep(
  account: AccountResponse["account"],
  apiKeys: AccountResponse["apiKeys"],
  serverConfig: LighterServerConfig | null,
): OnboardingStep {
  if (!account) return "deposit";
  if (apiKeys.length === 0) return "registerApiKey";
  if (!serverConfig?.serverWalletConfigured) return "activateServer";
  // Not enough that SOME key is configured — it has to be signing for THIS account, or trades
  // silently execute on whatever account the server env is actually pinned to (see
  // FRICTION_LOG.md's split-brain entry).
  if (accountsMismatch(account, serverConfig)) return "activateServer";
  return "ready";
}
