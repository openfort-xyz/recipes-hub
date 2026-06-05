import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: ReactNode;
  maxWidth?: "sm" | "lg" | "xl";
  className?: string;
}

export function PageLayout({
  children,
  maxWidth = "xl",
  className,
}: PageLayoutProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div
        className={cn(
          "flex w-full flex-col gap-6",
          maxWidthClasses[maxWidth],
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
