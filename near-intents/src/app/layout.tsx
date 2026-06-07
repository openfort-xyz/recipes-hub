import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppProviders from "./providers";
import Header from "@/components/header";
import Footer from "@/components/footer";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Openfort × NEAR Intents Swap Recipe",
  description:
    "An Openfort embedded wallet experience powered by NEAR Intents' 1Click API. Swap tokens across chains with a single deposit and real-time settlement tracking.",
};

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
