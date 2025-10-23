import type { Address, Hex } from "viem";

import type { SupportedNetwork } from "./networks";

export interface PaymentRequirements {
  scheme: "exact";
  network: SupportedNetwork;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  outputSchema?: Record<string, unknown>;
  payTo: Address;
  maxTimeoutSeconds: number;
  asset: Address;
  extra?: {
    name?: string;
    version?: string;
  };
}

export interface ExactEvmPayloadAuthorization {
  from: Address;
  to: Address;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: Hex;
}

export interface ExactEvmPayload {
  signature: Hex;
  authorization: ExactEvmPayloadAuthorization;
}

export interface PaymentPayload {
  x402Version: number;
  scheme: "exact";
  network: SupportedNetwork;
  payload: ExactEvmPayload;
}

export interface UnsignedPaymentPayload {
  x402Version: number;
  scheme: "exact";
  network: SupportedNetwork;
  payload: {
    signature: undefined;
    authorization: ExactEvmPayloadAuthorization;
  };
}
