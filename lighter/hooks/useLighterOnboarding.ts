import { useCallback, useEffect, useState } from "react";

import { accountsMismatch, deriveStep, type OnboardingStep } from "./onboardingGate";
import {
  fetchAccount,
  fetchServerConfig,
  requestChangePubKeyMessage,
  submitChangePubKey,
  type AccountResponse,
  type LighterServerConfig,
} from "../services/lighterServerClient";

export type { OnboardingStep } from "./onboardingGate";

export interface OnboardingState {
  step: OnboardingStep;
  account: AccountResponse["account"];
  apiKeys: AccountResponse["apiKeys"];
  serverConfig: LighterServerConfig | null;
  /** True when the server is configured but signing for a DIFFERENT account than this one —
   * e.g. re-onboarded into a new wallet without restarting the server. Distinct from "not
   * configured yet" so the UI can show the right recovery message for each. */
  accountMismatch: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLighterOnboarding(l1Address: string | undefined, pollMs = 2000): OnboardingState {
  const [account, setAccount] = useState<AccountResponse["account"]>(null);
  const [apiKeys, setApiKeys] = useState<AccountResponse["apiKeys"]>([]);
  const [serverConfig, setServerConfig] = useState<LighterServerConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!l1Address) {
      setIsLoading(false);
      return;
    }
    try {
      const [accountResult, configResult] = await Promise.all([fetchAccount(l1Address), fetchServerConfig()]);
      setAccount(accountResult.account);
      setApiKeys(accountResult.apiKeys);
      setServerConfig(configResult);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh onboarding status");
    } finally {
      setIsLoading(false);
    }
  }, [l1Address]);

  useEffect(() => {
    // See useLighterMarkets.ts for why this poll effect is exempted from set-state-in-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const interval = setInterval(refresh, pollMs);
    return () => clearInterval(interval);
  }, [refresh, pollMs]);

  return {
    step: deriveStep(account, apiKeys, serverConfig),
    account,
    apiKeys,
    serverConfig,
    accountMismatch: accountsMismatch(account, serverConfig),
    isLoading,
    error,
    refresh,
  };
}

export interface Eip1193LikeProvider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
}

/**
 * Runs the full ChangePubKey registration: fetch the personal_sign message from the server, sign
 * it with the embedded wallet, submit it. The server adopts the resulting key as its own live
 * trading key before responding — see server/src/orders.ts's adoptServerKey — so there's no
 * follow-up step here; the poll in useLighterOnboarding picks up the change within one interval.
 */
export async function registerLighterApiKey(
  provider: Eip1193LikeProvider,
  walletAddress: `0x${string}`,
  accountIndex: number,
) {
  const { messageToSign } = await requestChangePubKeyMessage(accountIndex);
  const l1Sig = (await provider.request({
    method: "personal_sign",
    params: [messageToSign, walletAddress],
  })) as string;
  return submitChangePubKey(accountIndex, l1Sig);
}
