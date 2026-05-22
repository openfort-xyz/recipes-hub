import { useState } from "react";
import { parseUnits } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { sdk } from "../lib/vaultsFyi";
import type { VaultOption } from "../hooks/useDepositOptions";
import { useExecuteAction } from "../hooks/useExecuteAction";
import { Card } from "./Card";

const NETWORK = "base";
const USDC_DECIMALS = 6;
const DEFAULT_AMOUNT = "1"; // 1 USDC

export function ActionPanel({
  userAddress,
  selected,
}: {
  userAddress: string;
  selected: VaultOption;
}) {
  const queryClient = useQueryClient();
  const { running, step, hashes, error, execute, reset } = useExecuteAction();
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [preparing, setPreparing] = useState(false);

  async function handleDeposit() {
    setPreparing(true);
    reset();
    try {
      const { currentActionIndex, actions } = await sdk.getActions({
        path: {
          action: "deposit",
          userAddress,
          network: NETWORK,
          vaultId: selected.vaultId,
        },
        query: {
          assetAddress: selected.asset.address,
          amount: parseUnits(amount.replace(",", "."), USDC_DECIMALS).toString(),
        },
      });
      await execute(currentActionIndex, actions);
      await queryClient.invalidateQueries({ queryKey: ["positions"] });
    } finally {
      setPreparing(false);
    }
  }

  return (
    <Card
      title={`Deposit into ${selected.name}`}
      subtitle={`${selected.protocol.name} · ${(selected.apy["7day"].total * 100).toFixed(2)}% APY · ${selected.address}`}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-neutral-800 text-white text-sm rounded-lg pl-3 pr-16 py-2 border border-neutral-700"
            placeholder="Amount in USDC"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
            USDC
          </span>
        </div>
        <button
          onClick={handleDeposit}
          disabled={preparing || running}
          className="bg-white text-black font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {preparing || running
            ? `Depositing…${step ? ` (${step.current}/${step.total})` : ""}`
            : "Deposit"}
        </button>
      </div>
      {hashes.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs">
          {hashes.map((h) => (
            <li key={h.hash}>
              <a
                href={`https://basescan.org/tx/${h.hash}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline"
              >
                {h.hash}
              </a>{" "}
              <span className="text-neutral-500">({h.name})</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </Card>
  );
}
