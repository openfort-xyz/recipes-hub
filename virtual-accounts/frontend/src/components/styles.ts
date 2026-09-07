import type { CSSProperties } from 'react'

export const fontStack = "'Manrope', 'Helvetica Neue', Arial, sans-serif"
export const monoStack = "'Space Grotesk', 'Manrope', sans-serif"

export const card: CSSProperties = {
  background: 'var(--demo-surface)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--demo-border)',
  padding: 22,
  boxShadow: 'var(--demo-shadow)',
  animation: 'va-rise .4s ease both',
}

export const primaryBtn: CSSProperties = {
  background: '#FC3927',
  color: '#fff',
  borderRadius: 'var(--radius-md)',
  padding: '10px 18px',
  fontWeight: 600,
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

export const secondaryBtn: CSSProperties = {
  ...primaryBtn,
  background: 'var(--demo-surface-muted)',
  color: 'var(--demo-ink-900)',
  border: '1px solid var(--demo-border)',
}

export const input: CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid var(--demo-border)',
  borderRadius: 'var(--radius-md)',
  fontFamily: monoStack,
  fontSize: '0.95rem',
  fontWeight: 500,
  background: 'var(--demo-surface)',
  color: 'var(--demo-ink-900)',
  outline: 'none',
}

export const label: CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--demo-ink-500)',
  fontFamily: fontStack,
}

export const muted: CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--demo-ink-500)',
  fontFamily: fontStack,
  lineHeight: 1.5,
  margin: 0,
}

export const errorText: CSSProperties = {
  color: '#dc2626',
  fontSize: '0.85rem',
  fontFamily: fontStack,
  margin: 0,
}
