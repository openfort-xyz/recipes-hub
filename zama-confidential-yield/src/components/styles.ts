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
}

export const fontStack =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Manrope', 'Helvetica Neue', Arial, sans-serif"
export const monoStack = "'SF Mono', 'Space Grotesk', ui-monospace, monospace"

/** iOS-style filled list card. */
export const iosCard: CSSProperties = {
  background: 'var(--pd-surface)',
  borderRadius: 18,
  border: '1px solid var(--demo-border)',
  padding: 16,
  boxShadow: '0 1px 2px rgba(15,23,42,.04)',
}

/** iOS section label (small, uppercase, muted) above a card group. */
export const sectionLabel: CSSProperties = {
  margin: '0 0 8px 6px',
  fontFamily: fontStack,
  fontSize: '0.72rem',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--pd-ink-400)',
}

export const card: CSSProperties = {
  background: 'var(--pd-surface)',
  borderRadius: 16,
  border: '1px solid var(--demo-border)',
  padding: 20,
  boxShadow: 'var(--demo-shadow)',
}

export const primaryBtn: CSSProperties = {
  background: 'var(--pd-brand)',
  color: '#fff',
  borderRadius: 'var(--radius-md)',
  padding: '10px 18px',
  fontWeight: 600,
  border: 'none',
  fontFamily: fontStack,
  fontSize: '0.9rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
}

export const ghostBtn: CSSProperties = {
  background: 'var(--pd-surface-soft)',
  color: 'var(--pd-ink-900)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 14px',
  fontWeight: 600,
  border: '1px solid var(--demo-border)',
  fontFamily: fontStack,
  fontSize: '0.85rem',
  cursor: 'pointer',
}

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--demo-border)',
  borderRadius: 'var(--radius-md)',
  fontFamily: monoStack,
  fontSize: '0.95rem',
  fontWeight: 500,
  background: 'var(--pd-surface)',
  color: 'var(--pd-ink-900)',
  outline: 'none',
  boxSizing: 'border-box',
}

export const label: CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--pd-ink-700)',
  fontFamily: fontStack,
  marginBottom: 6,
}

export const chip = (color: string): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: fontStack,
  fontSize: '0.72rem',
  fontWeight: 600,
  color,
  background: `color-mix(in srgb, ${color} 12%, transparent)`,
  border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
  borderRadius: 999,
  padding: '3px 9px',
})
