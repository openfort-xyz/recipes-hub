import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AppProviders from "./providers";
import Header from "@/components/header";
import Footer from "@/components/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Openfort × LI.FI Bridge Recipe",
  description:
    "An Openfort embedded wallet experience powered by LI.FI routing. Bridge tokens across chains with trusted co-branded flows and real-time execution tracking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-muted`}>
        <AppProviders>
          <Header />
          {children}
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
