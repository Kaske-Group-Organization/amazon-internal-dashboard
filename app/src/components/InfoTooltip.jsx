import { useState } from 'react'

export default function InfoTooltip({ text, position = 'bottom' }) {
  const [show, setShow] = useState(false)

  const posStyle = position === 'bottom'
    ? { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 }
    : position === 'left'
    ? { top: '50%', right: '100%', transform: 'translateY(-50%)', marginRight: 6 }
    : { top: '50%', left: '100%', transform: 'translateY(-50%)', marginLeft: 6 }

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          width: 14, height: 14, borderRadius: '50%',
          background: 'var(--sur2)', border: '1px solid var(--bdr2)',
          color: 'var(--tx3)', fontSize: 9, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'help', lineHeight: 1, fontFamily: 'sans-serif',
          flexShrink: 0,
        }}
      >
        i
      </span>
      {show && (
        <div style={{
          position: 'absolute',
          ...posStyle,
          background: '#150C41',
          color: '#fff',
          fontSize: 11,
          lineHeight: 1.5,
          padding: '7px 10px',
          borderRadius: 6,
          width: 220,
          zIndex: 500,
          boxShadow: '0 4px 16px rgba(15,12,65,.25)',
          whiteSpace: 'pre-wrap',
          pointerEvents: 'none',
        }}>
          {text}
        </div>
      )}
    </span>
  )
}
