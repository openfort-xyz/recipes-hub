// Gnosis Pay User API session: SIWE sign-in plus a rotating access/refresh token pair.
// No imports, so `node --test` can run session.test.ts against it directly.

export type TokenStore = {
  get: () => Promise<string | null>;
  set: (refreshToken: string) => Promise<void>;
  clear: () => Promise<void>;
};

export type SiweParams = { domain: string; uri: string; appName: string };

export class GnosisPayApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export function createSession(baseUrl: string, store: TokenStore, fetchImpl: Fetch = fetch) {
  let accessToken: string | null = null;
  // A refresh token is single use: a second use logs the user out. Share one in-flight refresh.
  let refreshing: Promise<boolean> | null = null;

  async function raw<T>(path: string, init: RequestInit = {}, token: string | null = null): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetchImpl(`${baseUrl}${path}`, { ...init, headers: { ...headers, ...(init.headers as object) } });
    const body = await res.text();
    const json = body ? JSON.parse(body) : {};
    if (!res.ok) throw new GnosisPayApiError(res.status, json.error ?? json.message ?? `HTTP ${res.status}`);
    return json as T;
  }

  async function save(tokens: { accessToken: string; refreshToken: string }) {
    accessToken = tokens.accessToken;
    await store.set(tokens.refreshToken);
  }

  async function refresh(): Promise<boolean> {
    if (!refreshing) {
      refreshing = (async () => {
        const refreshToken = await store.get();
        if (!refreshToken) return false;
        try {
          await save(
            await raw<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
              method: "POST",
              body: JSON.stringify({ refreshToken }),
            })
          );
          return true;
        } catch {
          accessToken = null;
          await store.clear();
          return false;
        }
      })().finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  }

  return {
    /** Restore a session from the stored refresh token. */
    resume: refresh,

    isSignedIn: () => accessToken !== null,

    /** SIWE: fetch the message for `address`, have the wallet sign it, exchange it for tokens. */
    async signIn(address: string, siwe: SiweParams, signMessage: (message: string) => Promise<string>) {
      const query = new URLSearchParams({ domain: siwe.domain, uri: siwe.uri, appName: siwe.appName });
      const { message } = await raw<{ message: string }>(`/auth/siwe/${address}?${query}`);
      const signature = await signMessage(message);
      await save(
        await raw("/auth/siwe", { method: "POST", body: JSON.stringify({ address, signature, message }) })
      );
    },

    /** POST /user returns a new access token carrying the user id; later calls must use it. */
    useAccessToken(token: string) {
      accessToken = token;
    },

    /** Authenticated request; refreshes once on 401 and retries. */
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
      try {
        return await raw<T>(path, init, accessToken);
      } catch (e) {
        if (!(e instanceof GnosisPayApiError) || e.status !== 401 || !(await refresh())) throw e;
        return raw<T>(path, init, accessToken);
      }
    },

    async signOut() {
      const refreshToken = await store.get();
      accessToken = null;
      await store.clear();
      if (refreshToken) {
        await raw("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }).catch(() => {});
      }
    },
  };
}

export type GnosisPaySession = ReturnType<typeof createSession>;
