import type { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-black/95 font-figtree sm:items-center sm:justify-center">
      <div className="mx-auto flex w-full flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:max-w-md sm:flex-none sm:px-4 sm:py-10">
        <header className="mb-6 text-center sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-balance text-white sm:text-3xl md:text-4xl">
            Openfort <span className="text-neutral-500">×</span> WalletConnect Pay
          </h1>
          <p className="mt-2 text-sm text-neutral-400">Pay a merchant link with your embedded wallet.</p>
        </header>
        {children}
      </div>
    </div>
  )
}
