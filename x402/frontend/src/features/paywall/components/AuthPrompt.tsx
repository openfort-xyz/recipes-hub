import { OpenfortButton } from '@openfort/react'

export function AuthPrompt() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-zinc-700 bg-zinc-800 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold">Sign in to continue</h1>
        <p className="text-sm text-zinc-400">
          Sign in with Openfort to create a smart account wallet and unlock the
          paywalled content.
        </p>
        <OpenfortButton label="Sign in with Openfort" />
      </div>
    </div>
  )
}
