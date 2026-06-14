import { useCallback, useEffect, useMemo, useState } from "react";
import { CARD_TOKEN } from "@/lib/constants";
import { getNativeBalance, getTokenBalance } from "@/lib/erc20";
import {
  type AccountQueryResult,
  type CardStage,
  getCardStage,
  getRelayer,
  isPaymasterActive,
  predictCardAccount,
} from "@/lib/gnosisPay";
import type { Eip1193Provider } from "@/lib/eip1193";

export type Balances = { relayerXdai: bigint; relayerToken: bigint; cardToken: bigint };
export type Allowance = AccountQueryResult["allowance"];

export function useCardAccount(provider: Eip1193Provider, owner: string) {
  const account = useMemo(() => predictCardAccount(owner), [owner]);
  const sponsored = isPaymasterActive();
  const [relayer, setRelayer] = useState<string | null>(null);
  const [stage, setStage] = useState<CardStage | null>(null);
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      // The relayer (Pimlico smart account when sponsored, else the EOA) holds the
      // EURe and pays gas, so balances are read against it.
      const relayerAddress = await getRelayer(provider, owner);
      const [card, relayerXdai, relayerToken, cardToken] = await Promise.all([
        getCardStage(account),
        getNativeBalance(relayerAddress),
        getTokenBalance(CARD_TOKEN.address, relayerAddress),
        getTokenBalance(CARD_TOKEN.address, account),
      ]);
      setRelayer(relayerAddress);
      setStage(card.stage);
      setAllowance(card.allowance);
      setBalances({ relayerXdai, relayerToken, cardToken });
    } catch (e: any) {
      setError(e?.message ?? "Failed to load account data.");
    } finally {
      setLoading(false);
    }
  }, [account, owner, provider]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { account, relayer, sponsored, stage, allowance, balances, loading, error, reload };
}
