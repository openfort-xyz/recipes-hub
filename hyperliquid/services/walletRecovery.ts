import { getShieldRecoveryBaseUrl } from "../utils/config";

// If you want to use AUTOMATIC embedded wallet recovery, an encryption session is required.
// https://www.openfort.io/docs/products/embedded-wallet/react-native/quickstart/automatic.


// If you're looking for an example on how to set up your backend to host recovery endpoint,
// check out: https://github.com/openfort-xyz/openfort-backend-quickstart

export async function getEncryptionSessionFromEndpoint(): Promise<string> {
  const baseUrl = getShieldRecoveryBaseUrl();

  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const endpoint = `${cleanBaseUrl}/api/protected-create-encryption-session`;

  const response = await fetch(endpoint, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("[WALLET RECOVERY] Failed to fetch wallet recovery session");
  }
  const data = await response.json();
  return data.session as string;
}
