import { cn } from "@/lib/utils";

interface NearLogoProps {
  className?: string;
}

export default function NearLogo({ className }: NearLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold tracking-tight text-foreground",
        className
      )}
    >
      <span className="rounded-md bg-foreground px-1.5 py-0.5 leading-none text-background">
        N
      </span>
      <span className="ml-1.5">NEAR Intents</span>
    </span>
  );
}
