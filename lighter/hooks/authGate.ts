// Pure logic, deliberately separated from app/index.tsx's React/SDK wiring so it has no runtime
// dependency on react-native (whose Flow syntax vitest can't parse — see onboardingGate.ts for
// the same pattern) and can carry a regression test on its own.

export type AuthScreen = "loading" | "login" | "app";

/**
 * Decides what the app's entry point should render. The policy is explicit-login-only: a cold
 * launch never trusts a session the SDK silently restored from storage, so the screen stays
 * "loading" — never "app" — until the caller has confirmed there's no stale session left to sign
 * out. Once that's settled, a real (freshly authenticated or explicitly signed-in) user reaches
 * "app"; anyone else lands on "login".
 */
export function deriveAuthScreen(params: { isReady: boolean; hasUser: boolean; staleSessionCleared: boolean }): AuthScreen {
  if (!params.isReady || !params.staleSessionCleared) {
    return "loading";
  }
  return params.hasUser ? "app" : "login";
}
