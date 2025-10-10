import { cn } from "@/lib/utils";
import OpenfortLogo from "@/features/openfort/components/logo";
import LiFiLogo from "./li-fi-logo";

type CoBrandVariant = "default" | "compact";

interface CoBrandLogosProps {
  variant?: CoBrandVariant;
  className?: string;
}

const VARIANT_CONFIG: Record<
  CoBrandVariant,
  {
    openfort: { width: number; height: number; className?: string };
    lifi: { width: number; height: number; className?: string };
    wrapper: string;
    cross: string;
  }
> = {
  default: {
    openfort: { width: 140, height: 32 },
    lifi: { width: 132, height: 48, className: "h-12 w-auto text-foreground" },
    wrapper: "gap-4",
    cross: "text-2xl md:text-3xl font-semibold text-muted-foreground",
  },
  compact: {
    openfort: {
      width: 110,
      height: 26,
      className: "h-6 w-auto text-foreground",
    },
    lifi: { width: 104, height: 38, className: "h-7 w-auto text-foreground" },
    wrapper: "gap-3",
    cross: "text-lg font-semibold text-muted-foreground",
  },
};

export function CoBrandLogos({
  variant = "default",
  className,
}: CoBrandLogosProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center text-foreground",
        config.wrapper,
        className
      )}
    >
      <OpenfortLogo
        width={config.openfort.width}
        height={config.openfort.height}
        className={config.openfort.className}
      />
      <span className={config.cross}>×</span>
      <LiFiLogo
        width={config.lifi.width}
        height={config.lifi.height}
        className={config.lifi.className}
      />
    </div>
  );
}

export function CoBrandHero({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "bg-card text-card-foreground rounded-2xl border border-border px-6 py-5 shadow-sm",
        className
      )}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <CoBrandLogos />
        <p className="text-sm text-muted-foreground max-w-sm">
          This recipe combines Openfort&apos;s embedded wallets with LI.FI&apos;s
          routing engine so your users can bridge and swap across chains with a
          single trusted flow.
        </p>
      </div>
    </section>
  );
}
