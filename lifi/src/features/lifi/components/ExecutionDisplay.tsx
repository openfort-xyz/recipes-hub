"use client";

import type { RouteExtended } from "@lifi/sdk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, AlertCircle, Eye, Loader2 } from "lucide-react";
import { getExplorerUrl } from "@/lib/utils";
import type { ExecutionProgress } from "@/features/lifi/types";

interface ExecutionDisplayProps {
  activeRoute: RouteExtended | null;
  isExecuting: boolean;
  isRouteCompleted: boolean;
  executionProgress: ExecutionProgress[];
  onStopRoute: () => void;
  onBackToForm: () => void;
}

export default function ExecutionDisplay({
  activeRoute,
  isExecuting,
  isRouteCompleted,
  executionProgress,
  onStopRoute,
  onBackToForm,
}: ExecutionDisplayProps) {
  if (!activeRoute) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DONE":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "FAILED":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "ACTION_REQUIRED":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DONE":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "FAILED":
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case "PENDING":
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case "ACTION_REQUIRED":
        return <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />;
      default:
        return <Eye className="w-5 h-5 text-blue-400" />;
    }
  };

  const getOverallStatus = () => {
    if (isRouteCompleted) return "COMPLETED";
    if (isExecuting) return "EXECUTING";
    return "STOPPED";
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "EXECUTING":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "STOPPED":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const overallStatus = getOverallStatus();
  const overallStatusClasses = getOverallStatusColor(overallStatus);

  return (
    <div className="w-full max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center space-x-2">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-primary-foreground"
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
              </div>
              <span>Route Execution</span>
            </CardTitle>
            <span
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${overallStatusClasses}`}
            >
              {overallStatus}
            </span>
            <button
              onClick={onBackToForm}
              className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Route ID */}
          <div className="bg-muted/40 rounded-lg px-4 py-3 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-xs text-muted-foreground">Route ID:</span>
                <span className="font-mono text-xs bg-background px-2 py-1 rounded border">
                  {activeRoute.id.slice(0, 8)}...{activeRoute.id.slice(-8)}
                </span>
              </div>

              {/* Status Badge */}
              {isRouteCompleted && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">Completed</span>
                </div>
              )}

              {/* Quick Stop Button */}
              {isExecuting && (
                <button
                  onClick={onStopRoute}
                  className="px-3 py-1.5 text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                >
                  Stop
                </button>
              )}
            </div>

            {/* New Swap Button - shown when route is completed or stopped */}
            {(isRouteCompleted || !isExecuting) && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <button
                  onClick={onBackToForm}
                  className="px-3 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors cursor-pointer"
                >
                  Start New Swap
                </button>
              </div>
            )}
          </div>

          {/* Execution Progress History */}
          {executionProgress.length > 0 && (
            <div className="bg-muted/40 rounded-lg p-4 border border-border">
              <div className="mb-4">
                <h4 className="text-sm font-medium">Execution History</h4>
                <span className="text-xs text-muted-foreground">
                  {executionProgress.filter((p) => p.status === "DONE").length} /{" "}
                  {executionProgress.length} steps complete
                </span>
              </div>
              <div className="space-y-3">
                {executionProgress.map((progress, index) => {
                  const explorerUrl =
                    progress.explorerLink ||
                    getExplorerUrl(progress.txHash!, progress.chainId);

                  return (
                    <div
                      key={index}
                      className="bg-background rounded-lg p-3 border border-border"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getStatusIcon(progress.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">
                                Step {progress.stepIndex + 1}
                              </span>
                              <span className="text-xs text-muted-foreground bg-accent px-2 py-1 rounded-full">
                                {progress.stepType}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                progress.status
                              )}`}
                            >
                              {progress.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {progress.message}
                          </p>
                          {progress.txHash && (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-muted-foreground">
                                  Transaction:
                                </span>
                                {explorerUrl ? (
                                  <a
                                    href={explorerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-xs text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 transition-colors cursor-pointer"
                                  >
                                    {progress.txHash.slice(0, 10)}...
                                    {progress.txHash.slice(-8)}
                                  </a>
                                ) : (
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {progress.txHash.slice(0, 10)}...
                                    {progress.txHash.slice(-8)}
                                  </span>
                                )}
                                {explorerUrl && (
                                  <svg
                                    className="w-3 h-3 text-primary/60"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
