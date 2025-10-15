import { Providers } from "@/components/Providers"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
    title: "Openfort + Permissionless + 7702",
    description:
        "A demo of Openfort with Permissionless SDK for sending UserOperations"
}

export default function RootLayout({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className="dark">
            <head>
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <link rel="icon" href="/favicon.ico" />
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
