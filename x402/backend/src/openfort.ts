import { Openfort } from "@openfort/openfort-node";
import type { EvmAccount } from "@openfort/openfort-node";
import type { Address } from "viem";

/**
 * Creates an Openfort client. For backend wallet sign operations (e.g. signing transaction
 * intents), pass OPENFORT_WALLET_SECRET so the SDK can authenticate with X-Wallet-Auth.
 */
export function createOpenfortClient(
  secretKey: string,
  walletSecret?: string,
): Openfort | null {
  if (!secretKey) {
    console.warn(
      "⚠️  OPENFORT_SECRET_KEY missing. Shield session route will respond with an error.",
    );
    return null;
  }
  if (walletSecret) {
    return new Openfort(secretKey, { walletSecret });
  }
  return new Openfort(secretKey);
}

export async function resolveBackendWalletAddress(
  client: Openfort,
  walletId: string,
): Promise<Address | null> {
  try {
    const account = await client.accounts.evm.backend.get({ id: walletId });
    return account.address;
  } catch (error) {
    console.error("Failed to resolve backend wallet address:", error);
    return null;
  }
}

export async function getBackendWalletAccount(
  client: Openfort,
  walletId: string,
): Promise<EvmAccount | null> {
  try {
    return await client.accounts.evm.backend.get({ id: walletId });
  } catch (error) {
    console.error("Failed to get backend wallet account:", error);
    return null;
  }
}
