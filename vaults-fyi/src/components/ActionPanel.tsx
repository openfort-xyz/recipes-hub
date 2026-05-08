import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { sdk } from "../lib/vaultsFyi";
import type { VaultOption } from "../hooks/useDepositOptions";
import { useExecuteAction } from "../hooks/useExecuteAction";
import { Card } from "./Card";

const NETWORK = "base";
const DEFAULT_AMOUNT = "1000000"; // 1 USDC, 6 decimals

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
        query: { assetAddress: selected.asset.address, amount },
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
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 bg-neutral-800 text-white text-sm rounded-lg px-3 py-2 border border-neutral-700"
          placeholder="Amount in base units (1000000 = 1 USDC)"
        />
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
