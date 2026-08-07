import type { ReactNode } from 'react'

interface PhoneFrameProps {
  width?: number
  height?: number
  borderRadius?: number
  borderWidth?: number
  contentPadding?: string
  children: ReactNode
}

function StatusBar({ scale }: { scale: number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `8px ${Math.round(20 * scale)}px 4px`,
        fontSize: `${(0.72 * scale).toFixed(2)}rem`,
        fontWeight: 600,
        color: 'var(--demo-ink-700)',
        flexShrink: 0,
      }}
    >
      <span>9:41</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg
          viewBox="0 0 20 14"
          style={{ width: Math.round(16 * scale), height: Math.round(11 * scale) }}
        >
          <rect x="0" y="10" width="3" height="4" rx="0.5" fill="var(--demo-ink-500)" />
          <rect x="5" y="7" width="3" height="7" rx="0.5" fill="var(--demo-ink-500)" />
          <rect x="10" y="4" width="3" height="10" rx="0.5" fill="var(--demo-ink-500)" />
          <rect x="15" y="0" width="3" height="14" rx="0.5" fill="var(--demo-ink-500)" />
        </svg>
        <svg
          viewBox="0 0 28 14"
          style={{ width: Math.round(22 * scale), height: Math.round(11 * scale) }}
        >
          <rect
            x="0"
            y="1"
            width="24"
            height="12"
            rx="2"
            fill="none"
            stroke="var(--demo-ink-500)"
            strokeWidth="1.5"
          />
          <rect x="2.5" y="3.5" width="17" height="7" rx="1" fill="var(--demo-ink-500)" />
          <rect x="25" y="4" width="2.5" height="6" rx="1" fill="var(--demo-ink-500)" />
        </svg>
      </div>
    </div>
  )
}

export function PhoneFrame({
  width = 320,
  height = 600,
  borderRadius = 32,
  borderWidth = 6,
  contentPadding = '0',
  children,
}: PhoneFrameProps) {
  const scale = width / 375

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        borderRadius,
        border: `${borderWidth}px solid var(--demo-bezel)`,
        background: 'var(--demo-surface)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(15,23,42,.12), 0 8px 24px rgba(15,23,42,.06)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 90,
          height: 24,
          background: 'var(--demo-bezel)',
          borderRadius: 20,
          zIndex: 10,
        }}
      />
      <StatusBar scale={scale} />
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: contentPadding }}>
        {children}
      </div>
    </div>
  )
}
