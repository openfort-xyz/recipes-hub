export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div
        className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-gray-400"
        style={{ animation: 'spin 1s linear infinite' }}
      />
    </div>
  )
}
