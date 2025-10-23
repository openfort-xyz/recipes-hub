interface StatusBannerProps {
  message: string;
}

export function StatusBanner({ message }: StatusBannerProps) {
  if (!message) {
    return null;
  }
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-300">
      {message}
    </div>
  );
}
