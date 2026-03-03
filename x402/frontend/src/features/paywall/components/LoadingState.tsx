import { Spinner } from './Spinner'

interface LoadingStateProps {
  title: string
  subtitle?: string
}

export function LoadingState({ title, subtitle }: LoadingStateProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle ? <p className="text-sm text-zinc-400">{subtitle}</p> : null}
        <Spinner />
      </div>
    </div>
  )
}
