"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface OpenfortLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function OpenfortLogo({
  width = 140,
  height = 32,
  className = "",
}: OpenfortLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent flash by showing nothing until mounted
  if (!mounted) {
    return <div style={{ width, height }} />;
  }

  const logoSrc =
    resolvedTheme === "dark"
      ? "/assets/branding/openfort-logo-light.svg"
      : "/assets/branding/openfort-logo-dark.svg";

  return (
    <Image
      src={logoSrc}
      alt="Openfort"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
