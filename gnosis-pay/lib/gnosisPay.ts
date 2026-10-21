import * as SecureStore from "expo-secure-store";
import { Interface } from "ethers";
import { getGnosisPayApiUrl } from "./config";
import { TOKENS_BY_CURRENCY, type SpendableToken } from "./constants";
import { eip1193SendTransaction, type Eip1193Provider } from "./eip1193";
import { createSession } from "./session";

const REFRESH_TOKEN_KEY = "gnosis-pay-refresh-token";

// The refresh token lives in the device keychain; the 15-minute access token only in memory.
export const session = createSession(getGnosisPayApiUrl(), {
  get: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  set: (value) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, value),
  clear: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
});

export type Terms = { type: string; currentVersion: string; name: string; url: string | null; accepted: boolean };
export type SofQuestion = { id: string; question: string; answers: string[] };

// GET /user/onboarding: a tagged union on `status`.
export type Onboarding =
  | { status: "action_accept_tos"; terms: Terms[] }
  | { status: "action_complete_kyc" | "action_kyc_resubmission_requested"; webSdkUrl: string }
  | { status: "action_complete_sof"; questions: SofQuestion[] }
  | {
      status:
        | "waiting_kyc_setup"
        | "kyc_manual_review"
        | "action_create_account"
        | "waiting_account_setup"
        | "action_verify_phone"
        | "completed"
        | "rejected";
    };

export type Account = {
  id: string;
  safeAddress: string | null;
  safeOwnerAddress: string;
  nativeCurrency: string;
  status: string;
};

export type Balance = { currency: string; decimals: number; spendable: string; processingDeposits: string };
export type Card = { id: string; name: string; status: string; last4Digits: string | null; nativeCurrency: string };

const post = (body?: object): RequestInit => ({ method: "POST", body: body ? JSON.stringify(body) : undefined });

export const gnosisPay = {
  getOnboarding: () => session.request<Onboarding>("/user/onboarding"),
  requestEmailOtp: (email: string) => session.request("/email-verification", post({ email })),
  async register(email: string, otp: string) {
    const { accessToken } = await session.request<{ accessToken: string }>("/user", post({ email, otp }));
    session.useAccessToken(accessToken);
  },
  acceptTerms: (terms: Terms[]) =>
    session.request("/user/terms", post({ terms: terms.map((t) => ({ type: t.type, version: t.currentVersion })) })),
  submitSof: (answers: { question: string; answer: string }[]) => session.request("/source-of-funds", post({ answers })),
  // Gnosis Pay deploys the user's Safe (owner = the signed-in wallet) and provisions the account.
  createAccount: () => session.request<{ accountId: string }>("/user/account", post()),
  getAccount: () => session.request<Account>("/user/account"),
  getBalances: async () => (await session.request<{ data: Balance[] }>("/user/balances/v2")).data,
  listCards: async () => (await session.request<{ cards: Card[] }>("/cards")).cards,
  // `phone` is required for the first card (it creates the cardholder).
  createVirtualCard: (cardName: string, phone?: string) =>
    session.request<{ cardId: string }>("/cards/virtual", post({ cardName, phone })),
};

export function tokenFor(account: Account): SpendableToken {
  const token = TOKENS_BY_CURRENCY[account.nativeCurrency];
  if (!token) throw new Error(`No Gnosis Chain token mapped for ${account.nativeCurrency}.`);
  return token;
}

const transferInterface = new Interface(["function transfer(address to, uint256 amount) returns (bool)"]);

/** Fund the card: an ERC-20 transfer from the embedded wallet into the account's Safe. */
export async function fundSafe(provider: Eip1193Provider, owner: string, account: Account, amount: bigint) {
  if (!account.safeAddress) throw new Error("The account Safe is not deployed yet.");
  const data = transferInterface.encodeFunctionData("transfer", [account.safeAddress, amount]);
  return eip1193SendTransaction(provider, owner, { to: tokenFor(account).address, data });
}
