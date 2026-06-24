import { useState } from 'react'

const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const DAYS_DE   = ['Mo','Di','Mi','Do','Fr','Sa','So']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}
function toDateStr(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}
function parseDate(s) {
  if (!s) return null
  const [y,m,d] = s.split('-').map(Number)
  return new Date(y, m-1, d)
}

export default function DateRangePicker({ dateFrom, dateTo, onChange, onClose }) {
  const now = new Date()
  const [viewYear,  setViewYear]  = useState(dateFrom ? parseDate(dateFrom).getFullYear()  : now.getFullYear())
  const [viewMonth, setViewMonth] = useState(dateFrom ? parseDate(dateFrom).getMonth()     : now.getMonth())
  const [selecting, setSelecting] = useState('from') // 'from' | 'to'
  const [hovered,   setHovered]   = useState(null)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1) }
    else setViewMonth(m => m-1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1) }
    else setViewMonth(m => m+1)
  }

  const handleDay = (dateStr) => {
    if (selecting === 'from') {
      onChange(dateStr, dateTo && dateStr > dateTo ? '' : dateTo)
      setSelecting('to')
    } else {
      if (dateStr < dateFrom) {
        onChange(dateStr, dateFrom)
      } else {
        onChange(dateFrom, dateStr)
      }
      setSelecting('from')
      onClose()
    }
  }

  const isInRange = (dateStr) => {
    const from = dateFrom
    const to   = selecting === 'to' && hovered ? (hovered > dateFrom ? hovered : dateFrom) : dateTo
    if (!from || !to) return false
    return dateStr > from && dateStr < to
  }
  const isStart = (dateStr) => dateStr === dateFrom
  const isEnd   = (dateStr) => dateStr === dateTo

  const daysInMonth  = getDaysInMonth(viewYear, viewMonth)
  const firstDayOfMonth = getFirstDayOfMonth(viewYear, viewMonth)

  const cells = []
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const fmtBtn = (s) => {
    if (!s) return null
    const [y,m,d] = s.split('-').map(Number)
    return `${d}. ${MONTHS_DE[m-1].slice(0,3)} ${y}`
  }

  return (
    <div style={{
      position:'absolute', top:'calc(100% + 8px)', right:0,
      background:'var(--sur)', border:'1px solid var(--bdr)',
      borderRadius:'var(--r)', boxShadow:'var(--shadow-lg)',
      padding:'1rem', width:300, zIndex:200,
    }}>
      {/* Selected range display */}
      <div style={{display:'flex',gap:8,marginBottom:'1rem'}}>
        <div
          onClick={() => setSelecting('from')}
          style={{
            flex:1, padding:'6px 10px', borderRadius:'var(--r)',
            border:`1px solid ${selecting==='from'?'var(--ac)':'var(--bdr2)'}`,
            fontSize:12, cursor:'pointer', color: dateFrom?'var(--tx)':'var(--tx3)',
            background: selecting==='from'?'var(--blue-bg)':'var(--sur2)',
            boxShadow: selecting==='from'?'0 0 0 2px rgba(0,131,173,.15)':'none',
          }}
        >
          <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.5px',color:'var(--tx3)',marginBottom:2}}>Von</div>
          {fmtBtn(dateFrom) ?? 'Startdatum'}
        </div>
        <div style={{display:'flex',alignItems:'center',color:'var(--tx3)',fontSize:16}}>→</div>
        <div
          onClick={() => setSelecting('to')}
          style={{
            flex:1, padding:'6px 10px', borderRadius:'var(--r)',
            border:`1px solid ${selecting==='to'?'var(--ac)':'var(--bdr2)'}`,
            fontSize:12, cursor:'pointer', color: dateTo?'var(--tx)':'var(--tx3)',
            background: selecting==='to'?'var(--blue-bg)':'var(--sur2)',
            boxShadow: selecting==='to'?'0 0 0 2px rgba(0,131,173,.15)':'none',
          }}
        >
          <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.5px',color:'var(--tx3)',marginBottom:2}}>Bis</div>
          {fmtBtn(dateTo) ?? 'Enddatum'}
        </div>
      </div>

      {/* Month navigation */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.75rem'}}>
        <button onClick={prevMonth} style={navBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:600,color:'var(--tx)'}}>
          {MONTHS_DE[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} style={navBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Day headers */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:4}}>
        {DAYS_DE.map(d => (
          <div key={d} style={{textAlign:'center',fontSize:10,fontWeight:600,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'.4px',padding:'4px 0'}}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`}/>
          const dateStr = toDateStr(viewYear, viewMonth, d)
          const start  = isStart(dateStr)
          const end    = isEnd(dateStr)
          const inRange = isInRange(dateStr)
          const isHover = selecting==='to' && hovered === dateStr

          return (
            <button
              key={dateStr}
              onClick={() => handleDay(dateStr)}
              onMouseEnter={() => setHovered(dateStr)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width:'100%', aspectRatio:'1', border:'none', cursor:'pointer',
                borderRadius: start||end ? '50%' : inRange ? '0' : '50%',
                background: start||end ? 'var(--ac)'
                          : inRange    ? 'rgba(0,131,173,0.12)'
                          : isHover    ? 'var(--sur2)'
                          : 'transparent',
                color: start||end ? '#fff' : 'var(--tx)',
                fontSize: 12,
                fontFamily: "'Source Sans 3',sans-serif",
                fontWeight: start||end ? 700 : 400,
                transition: 'all .1s',
              }}
            >
              {d}
            </button>
          )
        })}
      </div>

      {/* Presets */}
      <div style={{borderTop:'1px solid var(--bdr)',marginTop:'0.75rem',paddingTop:'0.75rem',display:'flex',flexWrap:'wrap',gap:6}}>
        {[
          ['Heute',       () => { const t=new Date().toISOString().slice(0,10); onChange(t,t); onClose() }],
          ['Diese Woche', () => {
            const t=new Date(), mon=new Date(t); mon.setDate(t.getDate()-((t.getDay()||7)-1))
            onChange(mon.toISOString().slice(0,10), t.toISOString().slice(0,10)); onClose()
          }],
          ['30 Tage',     () => { const t=new Date(),f=new Date(); f.setDate(t.getDate()-30); onChange(f.toISOString().slice(0,10),t.toISOString().slice(0,10)); onClose() }],
          ['2025',        () => { onChange('2025-01-01','2025-12-31'); onClose() }],
          ['2026',        () => { onChange('2026-01-01','2026-12-31'); onClose() }],
        ].map(([label, fn]) => (
          <button key={label} onClick={fn} style={{
            fontSize:11, padding:'3px 10px', borderRadius:999,
            border:'1px solid var(--bdr2)', background:'var(--sur2)',
            color:'var(--tx2)', cursor:'pointer', fontFamily:"'Source Sans 3',sans-serif",
            transition:'all .15s',
          }}
          onMouseEnter={e => { e.target.style.background='var(--ac)'; e.target.style.color='#fff'; e.target.style.borderColor='var(--ac)' }}
          onMouseLeave={e => { e.target.style.background='var(--sur2)'; e.target.style.color='var(--tx2)'; e.target.style.borderColor='var(--bdr2)' }}
          >{label}</button>
        ))}
        {(dateFrom||dateTo) && (
          <button onClick={() => { onChange('',''); onClose() }} style={{
            fontSize:11, padding:'3px 10px', borderRadius:999,
            border:'1px solid var(--red-bg)', background:'var(--red-bg)',
            color:'var(--red)', cursor:'pointer', fontFamily:"'Source Sans 3',sans-serif",
          }}>✕ Löschen</button>
        )}
      </div>
    </div>
  )
}

const navBtn = {
  background:'none', border:'none', cursor:'pointer',
  color:'var(--tx2)', display:'flex', alignItems:'center',
  padding:4, borderRadius:'50%', transition:'all .15s',
}
