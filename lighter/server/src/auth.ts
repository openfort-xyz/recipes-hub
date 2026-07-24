/**
 * Optional shared-secret auth for the recipe server. When LIGHTER_SERVER_AUTH_TOKEN is unset the
 * server stays open (zero-friction first run on localhost); when set, every route except
 * /api/health requires `Authorization: Bearer <token>`. Set the same value in the app's .env so
 * its requests carry the header. Recommended whenever the server is reachable beyond localhost —
 * it holds a live trading key, and without this anyone on the LAN can place orders.
 */
export function isAuthorized(configuredToken: string, authorizationHeader: string | undefined): boolean {
  if (!configuredToken) return true;
  if (!authorizationHeader) return false;
  return authorizationHeader === `Bearer ${configuredToken}`;
}
