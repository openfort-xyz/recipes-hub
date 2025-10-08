"use client";

import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { useStatus } from "@openfort/react";

interface ActionButtonsProps {
  isLoading: boolean;
  isExecuting: boolean;
  hasRoutes: boolean;
  hasSelectedRoute: boolean;
  showRouteDisplay: boolean;
  hasActiveRoute: boolean;
  onGetRoutes: () => void;
  onExecuteSwap: () => void;
  onClear: () => void;
  onBackToForm: () => void;
  onShowExecutionDisplay: () => void;
}

export default function ActionButtons({
  isLoading,
  isExecuting,
  hasRoutes,
  hasSelectedRoute,
  showRouteDisplay,
  hasActiveRoute,
  onGetRoutes,
  onExecuteSwap,
  onClear,
  onBackToForm,
  onShowExecutionDisplay,
}: ActionButtonsProps) {
  const { isConnected } = useStatus();

  if (showRouteDisplay) {
    // Route display view - show Execute Swap, View Execution (if active), and Back buttons
    return (
      <div className="w-full max-w-md mb-6">
        <div className="flex flex-col gap-4">
          <Button
            onClick={onExecuteSwap}
            disabled={isLoading || !hasSelectedRoute || isExecuting}
            className="w-full h-12 text-lg font-semibold"
          >
            {isLoading || isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              "Execute Swap"
            )}
          </Button>

          {hasActiveRoute && (
            <Button
              onClick={onShowExecutionDisplay}
              variant="outline"
              className="w-full h-12 text-lg"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              View Execution
            </Button>
          )}

          <Button
            onClick={onBackToForm}
            variant="outline"
            className="w-full h-12 text-lg"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Form view - show Get Routes, View Execution (if active), and Clear buttons
  return (
    <div className="w-full max-w-md mb-6">
      <div className="flex flex-col gap-4">
        {isConnected ? (
          <Button
            onClick={onGetRoutes}
            disabled={isLoading}
            className="w-full h-12 text-lg font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Getting Routes...
              </>
            ) : (
              "Get Routes"
            )}
          </Button>
        ) : (
          <div className="w-full">
            Connect your wallet with Openfort to swap
          </div>
        )}

        {hasActiveRoute && (
          <Button
            onClick={onShowExecutionDisplay}
            variant="outline"
            className="w-full h-12 text-lg"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            View Execution
          </Button>
        )}

        {(hasRoutes || isExecuting) && (
          <Button
            onClick={onClear}
            variant="outline"
            className="w-full h-12 text-lg"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
