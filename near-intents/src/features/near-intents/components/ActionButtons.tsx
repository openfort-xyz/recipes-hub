"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SwapStep } from "@/features/near-intents/hooks/use-swap-controller";

interface ActionButtonsProps {
  step: SwapStep;
  isQuoting: boolean;
  isDepositing: boolean;
  isTerminal: boolean;
  onGetQuote: () => void;
  onConfirm: () => void;
  onBack: () => void;
  onReset: () => void;
}

export default function ActionButtons({
  step,
  isQuoting,
  isDepositing,
  isTerminal,
  onGetQuote,
  onConfirm,
  onBack,
  onReset,
}: ActionButtonsProps) {
  if (step === "form") {
    return (
      <div className="w-full max-w-md">
        <Button
          onClick={onGetQuote}
          disabled={isQuoting}
          className="h-12 w-full text-lg font-semibold"
        >
          {isQuoting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparing deposit…
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    );
  }

  if (step === "quote") {
    return (
      <div className="flex w-full max-w-md flex-col gap-3">
        <Button
          onClick={onConfirm}
          disabled={isDepositing}
          className="h-12 w-full text-lg font-semibold"
        >
          {isDepositing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirm in wallet…
            </>
          ) : (
            "Confirm & Send Deposit"
          )}
        </Button>
        <Button
          onClick={onBack}
          variant="outline"
          disabled={isDepositing}
          className="h-12 w-full text-lg"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    );
  }

  // tracking
  return (
    <div className="w-full max-w-md">
      <Button
        onClick={onReset}
        variant={isTerminal ? "default" : "outline"}
        disabled={!isTerminal}
        className="h-12 w-full text-lg font-semibold"
      >
        {isTerminal ? "Start New Swap" : "Swap in progress…"}
      </Button>
    </div>
  );
}
