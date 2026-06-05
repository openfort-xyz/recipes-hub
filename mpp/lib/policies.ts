/**
 * Format a cent amount as a USD string (e.g. 10 -> "$0.10").
 */
export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
