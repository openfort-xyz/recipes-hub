import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppProviders from "./providers";
import Header from "@/components/header";
import Footer from "@/components/footer";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Openfort × LI.FI Bridge Recipe",
  description:
    "An Openfort embedded wallet experience powered by LI.FI routing. Bridge tokens across chains with trusted co-branded flows and real-time execution tracking.",
};

// The Openfort provider needs a publishable key at render time, so pages are
// rendered on demand rather than statically prerendered at build.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} bg-muted`}>
        <AppProviders>
          <Header />
          {children}
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
