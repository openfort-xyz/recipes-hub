"use client";

import type { Route } from "@lifi/sdk";
import { formatAmount } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowLeft } from "lucide-react";

interface RouteDisplayProps {
  routes: Route[];
  selectedRoute: Route | null;
  toTokenSymbol?: string;
  onRouteSelect: (route: Route) => void;
  onBackToForm: () => void;
}

export default function RouteDisplay({
  routes,
  selectedRoute,
  toTokenSymbol,
  onRouteSelect,
  onBackToForm,
}: RouteDisplayProps) {
  if (routes.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">
            Available Routes ({routes.length})
          </CardTitle>
          <button
            onClick={onBackToForm}
            className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </CardHeader>
      <CardContent className="max-h-[600px] overflow-y-auto">
        <div className="space-y-4">
          {routes.map((route, index) => {
            const isSelected = selectedRoute?.id === route.id;
            const estimatedTime = Math.ceil(
              route.steps.reduce(
                (acc, step) => acc + (step.estimate.executionDuration || 0),
                0
              ) / 60
            );

            return (
              <div
                key={route.id}
                onClick={() => onRouteSelect(route)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-lg"
                    : "border-border bg-muted/40 hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent text-accent-foreground"
                      }`}
                    >
                      <span className="font-bold text-sm">{index + 1}</span>
                    </div>
                    <span className="font-medium">Route {index + 1}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="px-3 py-1 bg-muted rounded-full">
                      <span className="text-sm text-muted-foreground">
                        ~{estimatedTime} min
                      </span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      You get:
                    </span>
                    <span className="font-medium">
                      {formatAmount(route.toAmount, route.toToken.decimals)}{" "}
                      {toTokenSymbol || route.toToken.symbol}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Steps:
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {route.steps.length} step
                      {route.steps.length > 1 ? "s" : ""} via{" "}
                      {route.steps.map((step) => step.tool).join(" → ")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Gas cost:
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ~${route.gasCostUSD || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
