"use client";

import { useState } from "react";
import { Menu, X, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface HamburgerMenuProps {
  children: React.ReactNode;
  className?: string;
}

export function HamburgerMenu({ children, className }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const toggleMenu = () => setIsOpen(!isOpen);
  const handleThemeChange = (newTheme: string) => setTheme(newTheme);

  return (
    <div className={cn("relative", className)}>
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleMenu}
        className="md:hidden p-2"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-background border rounded-md shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="flex flex-col p-2 space-y-1">
            {/* Navigation Items */}
            <div className="flex flex-col space-y-1">{children}</div>

            {/* Divider */}
            <div className="border-t my-2" />

            {/* Theme Switcher */}
            <div className="px-2 py-1">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Theme
              </div>
              <div className="flex flex-col space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleThemeChange("light")}
                  className={cn(
                    "justify-start h-8 px-2 text-sm",
                    theme === "light" && "bg-accent text-accent-foreground"
                  )}
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleThemeChange("dark")}
                  className={cn(
                    "justify-start h-8 px-2 text-sm",
                    theme === "dark" && "bg-accent text-accent-foreground"
                  )}
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleThemeChange("system")}
                  className={cn(
                    "justify-start h-8 px-2 text-sm",
                    theme === "system" && "bg-accent text-accent-foreground"
                  )}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  System
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
