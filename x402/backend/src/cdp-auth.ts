import { generateJwt } from "@coinbase/cdp-sdk/auth";

/**
 * Build a Bearer JWT for CDP REST API auth using the official SDK.
 * Use the API key ID and Secret from the Create API key modal at
 * https://portal.cdp.coinbase.com (Secret API Keys). Ed25519 recommended.
 * @see https://docs.cdp.coinbase.com/api-reference/v2/authentication
 */
export async function getCdpJwt(options: {
  requestMethod: string;
  requestHost: string;
  requestPath: string;
  keyId: string;
  keySecret: string;
}): Promise<string> {
  const { requestMethod, requestHost, requestPath, keyId, keySecret } = options;
  if (!keyId || !keySecret) {
    throw new Error(
      "CDP_API_KEY_ID and CDP_API_KEY_SECRET are required for CDP facilitator. Create a Secret API Key at https://portal.cdp.coinbase.com/projects/api-keys.",
    );
  }
  return generateJwt({
    apiKeyId: keyId,
    apiKeySecret: keySecret,
    requestMethod,
    requestHost,
    requestPath,
    expiresIn: 120,
  });
}
