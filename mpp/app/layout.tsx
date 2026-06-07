import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MPP Agent Demo | Openfort',
  description:
    'Demo showcasing MPP (Machine Payments Protocol) with Openfort backend wallets. Create AI agents, fund them, and execute autonomous HTTP 402 payments.',
  openGraph: {
    title: 'MPP Agent Demo | Openfort',
    description: 'MPP payment protocol demo with Openfort backend wallets.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>{children}</body>
    </html>
  )
}
