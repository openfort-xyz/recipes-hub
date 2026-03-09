"use client";

import {
  OpenfortProvider,
  RecoveryMethod,
  AuthProvider,
} from "@openfort/react";
import type { OpenfortWalletConfig } from "@openfort/react";
import type { PropsWithChildren } from "react";

const _defaultChainId = Number.parseInt(
  process.env.NEXT_PUBLIC_OPENFORT_DEFAULT_CHAIN_ID ?? "11155111",
  10
);
const _feeSponsorshipId = process.env.NEXT_PUBLIC_OPENFORT_FEE_SPONSORSHIP_ID;
const _ethereumFeeSponsorshipId =
  _feeSponsorshipId && Number.isFinite(_defaultChainId)
    ? { [_defaultChainId]: _feeSponsorshipId }
    : _feeSponsorshipId ?? undefined;

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY ?? "";
const SHIELD_KEY = process.env.NEXT_PUBLIC_OPENFORT_SHIELD_PUBLISHABLE_KEY ?? "";

const WALLET_CONFIG: OpenfortWalletConfig = {
  shieldPublishableKey: SHIELD_KEY,
  ethereum: {
    ethereumFeeSponsorshipId: _ethereumFeeSponsorshipId,
  },
  connectOnLogin: true,
};

const UI_CONFIG = {
  walletRecovery: {
    defaultMethod: RecoveryMethod.PASSKEY,
  },
  authProviders: [
    AuthProvider.EMAIL_OTP,
    AuthProvider.GOOGLE,
    AuthProvider.WALLET,
  ],
  mode: "dark" as const,
};

export interface OpenfortProviderBoundaryProps extends PropsWithChildren {
  debugMode?: boolean;
}

export const OpenfortProviderBoundary = ({
  children,
  debugMode = true,
}: OpenfortProviderBoundaryProps) => {
  return (
    <OpenfortProvider
      debugMode={debugMode}
      publishableKey={PUBLISHABLE_KEY}
      walletConfig={WALLET_CONFIG}
      uiConfig={UI_CONFIG}
    >
      {children}
    </OpenfortProvider>
  );
};
