import { cn } from "@/lib/utils";
import OpenfortLogo from "@/features/openfort/components/logo";
import NearLogo from "./near-logo";

type CoBrandVariant = "default" | "compact";

interface CoBrandLogosProps {
  variant?: CoBrandVariant;
  className?: string;
}

const VARIANT_CONFIG: Record<
  CoBrandVariant,
  {
    openfort: { width: number; height: number; className?: string };
    near: string;
    wrapper: string;
    cross: string;
  }
> = {
  default: {
    openfort: { width: 140, height: 32 },
    near: "text-xl",
    wrapper: "gap-4",
    cross: "text-2xl md:text-3xl font-semibold text-muted-foreground",
  },
  compact: {
    openfort: {
      width: 110,
      height: 26,
      className: "h-6 w-auto text-foreground",
    },
    near: "text-sm",
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
      <NearLogo className={config.near} />
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
          This recipe pairs Openfort&apos;s embedded wallets with NEAR
          Intents&apos; 1Click API. Your wallet signs a single deposit on the
          origin chain and a network of solvers settles the swap on the
          destination chain.
        </p>
      </div>
    </section>
  );
}
