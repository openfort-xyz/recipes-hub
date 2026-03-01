interface ErrorStateProps {
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function ErrorState({
  title,
  message,
  actionLabel,
  onAction,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-red-700 bg-zinc-800 p-8 text-center shadow-xl">
        <h1 className="text-2xl font-semibold text-red-400">{title}</h1>
        <p className="text-sm text-zinc-300">{message}</p>
        {actionLabel && onAction ? (
          <button
            className="w-full rounded bg-red-600 py-3 text-center font-medium text-white transition-colors hover:bg-red-500"
            onClick={onAction}
            type="button"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}
