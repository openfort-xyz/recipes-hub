'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Logo } from '@/components/Logo'

export default function Home() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateAgent = async () => {
    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/agent/create', { method: 'POST' })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to create agent')
      }

      sessionStorage.setItem('agent', JSON.stringify(data.agent))
      router.push(`/agent/${data.agent.id}/fund`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsCreating(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-[#E2E3F0] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo className="text-slate-900" />
          <div className="flex items-center gap-4">
            <a
              href="https://www.openfort.io/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#FC3627]"
            >
              Docs
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl text-center">
          {/* Floating Openfort mark */}
          <div className="mb-8 flex justify-center">
            <div className="animate-float rounded-3xl bg-[#FFE7E4] p-8">
              <svg
                width="96"
                height="59"
                viewBox="0 0 18 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M9.9528 7.63477H8.04474V11H9.9528V7.63477Z" fill="#FC3627" />
                <path d="M16.0795 11H18V0.00195312L0.00466919 0V11H1.91535V1.90479H16.0795V11Z" fill="#FC3627" />
                <path d="M14.1479 11L14.1583 3.81055H3.83386V11H5.74454V5.71338H12.2398V11H14.1479Z" fill="#FC3627" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Agentic wallets
            <span className="block text-[#FC3627]">powered by Openfort</span>
          </h1>

          {/* Description */}
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600">
            Use Openfort backend wallets to give your AI agent a wallet. Fund it and watch it make autonomous payments
            using the{' '}
            <a
              href="https://machinepayments.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#FC3627] hover:underline"
            >
              MPP protocol
            </a>
            .
          </p>

          {/* Features */}
          <div className="mx-auto mt-10 grid max-w-lg grid-cols-2 gap-4 text-center">
            <div className="rounded-xl border border-[#E2E3F0] bg-white p-4">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE7E4]">
                <svg
                  className="h-5 w-5 text-[#FC3627]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div className="text-sm font-medium text-slate-900">Secure wallets</div>
            </div>
            <div className="rounded-xl border border-[#E2E3F0] bg-white p-4">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE7E4]">
                <svg
                  className="h-5 w-5 text-[#FC3627]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="text-sm font-medium text-slate-900">MPP payments</div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10">
            <button
              type="button"
              onClick={handleCreateAgent}
              disabled={isCreating}
              className="button-primary rounded-xl px-8 py-4 text-lg font-semibold gap-2"
            >
              {isCreating ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating agent...
                </>
              ) : (
                <>
                  Create your AI agent
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E3F0] bg-white/50 py-6">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-slate-500">
          Built with{' '}
          <a href="https://www.openfort.io" className="font-medium text-[#FC3627] hover:underline">
            Openfort
          </a>{' '}
          and{' '}
          <a href="https://machinepayments.dev" className="font-medium text-[#FC3627] hover:underline">
            MPP
          </a>
        </div>
      </footer>
    </div>
  )
}
