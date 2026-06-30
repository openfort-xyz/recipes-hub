import type { CSSProperties, ReactNode } from 'react'
import { fontStack } from './styles'

/** iOS status bar: time + signal / wifi / battery glyphs. */
function StatusBar() {
  return (
    <div style={statusBar}>
      <span style={{ fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.02em' }}>9:41</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg viewBox="0 0 18 12" style={{ width: 17, height: 11 }} aria-hidden>
          <rect x="0" y="8" width="3" height="4" rx="0.6" fill="currentColor" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="0.6" fill="currentColor" />
          <rect x="10" y="3" width="3" height="9" rx="0.6" fill="currentColor" />
          <rect x="15" y="0.5" width="3" height="11.5" rx="0.6" fill="currentColor" />
        </svg>
        <svg viewBox="0 0 16 12" style={{ width: 16, height: 11 }} aria-hidden>
          <path
            d="M8 2.6c2 0 3.9.8 5.3 2.1l1.1-1.2A9.4 9.4 0 0 0 8 1 9.4 9.4 0 0 0 1.6 3.5l1.1 1.2A7.5 7.5 0 0 1 8 2.6Zm0 3.1c1.2 0 2.3.5 3.1 1.3l1.1-1.2A6 6 0 0 0 8 4.6 6 6 0 0 0 3.8 5.8l1.1 1.2A4.4 4.4 0 0 1 8 5.7Zm0 3 2-2.1A3 3 0 0 0 8 9Z"
            fill="currentColor"
          />
        </svg>
        <svg viewBox="0 0 26 12" style={{ width: 24, height: 11 }} aria-hidden>
          <rect
            x="0.5"
            y="0.5"
            width="21"
            height="11"
            rx="3"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.4"
          />
          <rect x="2" y="2" width="16" height="8" rx="1.6" fill="currentColor" />
          <rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor" fillOpacity="0.5" />
        </svg>
      </div>
    </div>
  )
}

/** An iPhone-15-ish chrome: bezel, Dynamic Island, status bar, scrollable body. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div style={bezel}>
      <div style={island} />
      <div style={screen}>
        <StatusBar />
        <div style={body}>{children}</div>
      </div>
    </div>
  )
}

const bezel: CSSProperties = {
  position: 'relative',
  width: 390,
  height: 800,
  maxHeight: '92vh',
  borderRadius: 56,
  padding: 11,
  background: 'linear-gradient(160deg, #2a2a2e, #050506)',
  boxShadow:
    '0 40px 90px rgba(15,23,42,.34), 0 12px 30px rgba(15,23,42,.22), inset 0 0 2px rgba(255,255,255,.25)',
  flexShrink: 0,
}
const screen: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  borderRadius: 46,
  overflow: 'hidden',
  background: 'var(--demo-bg)',
  display: 'flex',
  flexDirection: 'column',
}
const island: CSSProperties = {
  position: 'absolute',
  top: 23,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 120,
  height: 33,
  background: '#000',
  borderRadius: 20,
  zIndex: 20,
}
const statusBar: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 28px 6px',
  color: 'var(--demo-ink-900)',
  fontFamily: fontStack,
  flexShrink: 0,
}
const body: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  padding: '8px 16px 28px',
  WebkitOverflowScrolling: 'touch',
}
