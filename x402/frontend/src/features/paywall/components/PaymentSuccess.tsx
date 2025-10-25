interface PaymentSuccessProps {
  content: any;
  onReset: () => void;
}

export function PaymentSuccess({ content, onReset }: PaymentSuccessProps) {
  const title = content?.content?.title ?? "Content Unlocked";
  const message = content?.message ?? "Payment accepted! Here's your protected content.";
  const body = content?.content?.data;
  const timestamp = content?.content?.timestamp;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 px-4 text-white">
      <div className="flex w-full max-w-3xl flex-col gap-8 rounded-lg border border-green-700 bg-zinc-800 p-8 shadow-xl">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-semibold text-green-400">Payment Successful!</h1>
          </div>

          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
            <h2 className="mb-3 text-xl font-semibold">{title}</h2>
            <p className="mb-4 text-zinc-300">{message}</p>

            {body ? (
              <div className="space-y-2 rounded-lg bg-zinc-800 p-4">
                <p className="text-sm text-zinc-400">Content:</p>
                <p className="text-white">{body}</p>
                {timestamp ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Unlocked at: {new Date(timestamp).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <button
            className="w-full rounded bg-zinc-700 py-3 text-center font-medium text-white transition-colors hover:bg-zinc-600"
            onClick={onReset}
            type="button"
          >
            Try Another Payment
          </button>
        </div>
      </div>
    </div>
  );
}
