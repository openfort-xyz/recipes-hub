"use client";

import { getExplorerUrl } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface StatusMessagesProps {
  error: string | null;
  txHash: string | null;
  chainId?: number;
}

export default function StatusMessages({
  error,
  txHash,
  chainId,
}: StatusMessagesProps) {
  return (
    <>
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                  Error
                </h3>
                <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {txHash && (
        <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-green-900 dark:text-green-100">
                  Swap Executed Successfully!
                </h3>
                <p className="text-green-700 dark:text-green-300 mt-1">
                  {txHash === "Execution completed" ? (
                    "Route execution has been completed successfully."
                  ) : (
                    <>
                      Transaction:{" "}
                      {(() => {
                        const explorerUrl = getExplorerUrl(txHash, chainId);
                        if (explorerUrl) {
                          return (
                            <a
                              href={explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer"
                            >
                              {txHash.slice(0, 10)}...{txHash.slice(-8)}
                            </a>
                          );
                        }
                        return txHash;
                      })()}
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
