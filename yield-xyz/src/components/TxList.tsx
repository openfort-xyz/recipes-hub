import type { TxRecord } from '../hooks/useExecuteAction'

/** Explorer links for the hashes an enter/exit produced. Rendered by all three panels. */
export function TxList({ hashes, explorerUrl }: { hashes: TxRecord[]; explorerUrl: string }) {
  if (hashes.length === 0) return null

  return (
    <ul className="mt-4 space-y-1 text-xs">
      {hashes.map((h) => (
        <li key={h.hash}>
          <a
            href={`${explorerUrl}/tx/${h.hash}`}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:underline break-all"
          >
            {h.hash}
          </a>{' '}
          <span className="text-neutral-500">({h.title})</span>
        </li>
      ))}
    </ul>
  )
}
