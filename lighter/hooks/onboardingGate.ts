import type { AccountResponse, LighterServerConfig } from "../services/lighterServerClient";

// Pure logic, deliberately separated from useLighterOnboarding.ts's React/fetch wiring so it has
// no runtime dependency on react-native (whose Flow syntax vitest can't parse) and can carry a
// regression test on its own — see onboardingGate.test.ts.

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
  // "activateServer" used to be a normal step the operator walked through by hand (copy printed
  // credentials into server/.env.local, restart). Now that a ChangePubKey submit makes the server
  // adopt the fresh key immediately (see server/src/orders.ts's adoptServerKey), this branch is
  // reached and left within the same poll interval in the happy path — it stays here only as a
  // safety net for genuine anomalies (a hand-edited env file, a second server instance, a lost
  // adoption after a restart), not because the logic itself changed.
  if (!serverConfig?.serverWalletConfigured) return "activateServer";
  // Not enough that SOME key is configured — it has to be signing for THIS account, or trades
  // silently execute on whatever account the server env is actually pinned to.
  if (accountsMismatch(account, serverConfig)) return "activateServer";
  return "ready";
}
