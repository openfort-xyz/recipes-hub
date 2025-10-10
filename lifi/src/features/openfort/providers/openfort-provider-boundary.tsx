"use client";

import {
  OpenfortProvider,
  RecoveryMethod,
  type OpenfortProviderProps,
  AuthProvider,
} from "@openfort/react";
import type { PropsWithChildren } from "react";

const getDefaultChainConfig = () => {
  const defaultChainId = Number.parseInt(
    process.env.NEXT_PUBLIC_OPENFORT_DEFAULT_CHAIN_ID ?? "11155111",
    10
  );
  const policyId = process.env.NEXT_PUBLIC_OPENFORT_POLICY_ID;
  const ethereumProviderPolicyId =
    policyId && Number.isFinite(defaultChainId)
      ? { [defaultChainId]: policyId }
      : policyId ?? undefined;

  return {
    defaultChainId,
    publishableKey: process.env.NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY ?? "",
    shieldPublishableKey:
      process.env.NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY ?? "",
    ethereumProviderPolicyId,
  };
};

export interface OpenfortProviderBoundaryProps extends PropsWithChildren {
  debugMode?: OpenfortProviderProps["debugMode"];
}

export const OpenfortProviderBoundary = ({
  children,
  debugMode = true,
}: OpenfortProviderBoundaryProps) => {
  const {
    defaultChainId,
    publishableKey,
    shieldPublishableKey,
    ethereumProviderPolicyId,
  } = getDefaultChainConfig();

  return (
    <OpenfortProvider
      debugMode={debugMode}
      publishableKey={publishableKey}
      walletConfig={{
        shieldPublishableKey,
        ethereumProviderPolicyId,
        recoverWalletAutomaticallyAfterAuth: true,
      }}
      uiConfig={{
        initialChainId: Number.isFinite(defaultChainId)
          ? defaultChainId
          : undefined,
        walletRecovery: {
          defaultMethod: RecoveryMethod.PASSKEY,
        },
        authProviders: [
          AuthProvider.EMAIL,
          AuthProvider.GOOGLE,
          AuthProvider.WALLET,
        ],
        mode: "dark",
      }}
    >
      {children}
    </OpenfortProvider>
  );
};
