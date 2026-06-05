import Link from "next/link";
import OpenfortLogo from "@/features/openfort/components/logo";
import { HamburgerMenu } from "./hamburger-menu";
import OpenfortConnectButton from "@/features/openfort/components/connect-button";

export default function Header() {
  return (
    <div className="absolute top-0 flex items-center justify-between w-full py-2">
      <div className="pl-4 h-[40px] flex items-center gap-3">
        <Link href="/">
          <OpenfortLogo />
        </Link>
      </div>
      <div className="hidden md:flex gap-2 pr-4">
        <OpenfortConnectButton />
      </div>
      <div className="md:hidden pr-4 w-48">
        <HamburgerMenu>
          <OpenfortConnectButton compact className="w-full" />
        </HamburgerMenu>
      </div>
    </div>
  );
}
