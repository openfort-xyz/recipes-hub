import { getShieldRecoveryBaseUrl } from "../utils/config";

// If you want to use AUTOMATIC embedded wallet recovery, an encryption session is required.
// https://www.openfort.io/docs/products/embedded-wallet/react-native/quickstart/automatic.
//
// This recipe's own server/ (see server/src/routes.ts) exposes the same
// /api/protected-create-encryption-session route that
// https://github.com/openfort-xyz/openfort-backend-quickstart documents, so
// OPENFORT_SHIELD_RECOVERY_BASE_URL can point straight at it.

export async function getEncryptionSessionFromEndpoint(): Promise<string> {
  const baseUrl = getShieldRecoveryBaseUrl();
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const endpoint = `${cleanBaseUrl}/api/protected-create-encryption-session`;

  const response = await fetch(endpoint, { method: "POST" });
  if (!response.ok) {
    throw new Error("[WALLET RECOVERY] Failed to fetch wallet recovery session");
  }
  const data = await response.json();
  return data.session as string;
}
