import { useCallback, useEffect, useState } from "react";
import { getNativeBalance, getTokenBalance } from "@/lib/erc20";
import { type Account, type Balance, type Card, type Onboarding, gnosisPay, session, tokenFor } from "@/lib/gnosisPay";
import { GnosisPayApiError } from "@/lib/session";

// "signed-out": no Gnosis Pay session yet. "register": signed in with SIWE but no Gnosis Pay user.
export type Phase = { status: "signed-out" } | { status: "register" } | Onboarding;

export type Wallet = { xdai: bigint; token: bigint };

export function useGnosisPay(owner: string) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      if (!session.isSignedIn() && !(await session.resume())) return setPhase({ status: "signed-out" });
      let onboarding: Onboarding;
      try {
        onboarding = await gnosisPay.getOnboarding();
      } catch (e) {
        if (e instanceof GnosisPayApiError && e.status === 404) return setPhase({ status: "register" });
        throw e;
      }
      setPhase(onboarding);
      if (onboarding.status !== "completed" && onboarding.status !== "action_verify_phone") return;

      const [acc, balances, cardList] = await Promise.all([
        gnosisPay.getAccount(),
        gnosisPay.getBalances(),
        gnosisPay.listCards(),
      ]);
      const token = tokenFor(acc);
      const [xdai, tokenBalance] = await Promise.all([getNativeBalance(owner), getTokenBalance(token.address, owner)]);
      setAccount(acc);
      setBalance(balances.find((b) => b.currency === acc.nativeCurrency) ?? null);
      setCards(cardList);
      setWallet({ xdai, token: tokenBalance });
    } catch (e: any) {
      setError(e?.message ?? "Failed to load Gnosis Pay data.");
    }
  }, [owner]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; this recipe's data layer is custom hooks, not a query library.
    void reload();
  }, [reload]);

  return { phase, account, balance, cards, wallet, error, reload };
}
