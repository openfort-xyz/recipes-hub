import type { CSSProperties } from 'react'

/** Maps the demo design tokens into the `--pd-*` names the screens use. Spread
 * onto the root container so descendants resolve `var(--pd-…)`. */
export const vars: Record<string, string> = {
  '--pd-ink-900': 'var(--demo-ink-900)',
  '--pd-ink-700': 'var(--demo-ink-700)',
  '--pd-ink-500': 'var(--demo-ink-500)',
  '--pd-ink-400': 'var(--demo-ink-400)',
  '--pd-ink-300': 'var(--demo-ink-300)',
  '--pd-surface': 'var(--demo-surface)',
  '--pd-surface-soft': 'var(--demo-surface-soft)',
  '--pd-surface-muted': 'var(--demo-surface-muted)',
  '--pd-brand': '#FC3927',
  '--pd-success': '#10b981',
  '--pd-private': '#6366f1',
  '--pd-chip-bg': 'var(--demo-chip-bg)',
  '--pd-chip-border': 'var(--demo-chip-border)',
}

export const fontStack = "'Manrope', 'Helvetica Neue', Arial, sans-serif"
export const monoStack = "'Space Grotesk', 'Manrope', sans-serif"

export const panelCard: CSSProperties = {
  background: 'var(--pd-surface)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--demo-border)',
  padding: 22,
  boxShadow: 'var(--demo-shadow)',
}

export const primaryBtn: CSSProperties = {
  background: 'var(--pd-brand)',
  color: '#fff',
  borderRadius: 'var(--radius-md)',
  padding: '10px 18px',
  fontWeight: 600,
  boxShadow: '0 16px 40px rgba(15,23,42,.08)',
  border: 'none',
  fontFamily: fontStack,
  fontSize: '0.9rem',
  cursor: 'pointer',
  width: '100%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
}
