import { useState } from 'react'
import { useFilters } from '../context/FilterContext.jsx'

const fmtDate = d => {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
}

const IconSearch   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IconFilter   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
const IconDownload = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconCalendar = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>

export default function Toolbar({ pageTitle = 'Übersicht' }) {
  const { dateFrom, setDateFrom, dateTo, setDateTo, asinFilter, setAsinFilter } = useFilters()
  const [showDate,   setShowDate]   = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const dateLabel = dateFrom || dateTo
    ? `${fmtDate(dateFrom) ?? '...'} – ${fmtDate(dateTo) ?? '...'}`
    : null

  const setPreset = (months, year) => {
    if (year) { setDateFrom(`${year}-01-01`); setDateTo(`${year}-12-31`) }
    else {
      const to = new Date(), from = new Date()
      from.setMonth(from.getMonth() + months)
      setDateFrom(from.toISOString().slice(0,10))
      setDateTo(to.toISOString().slice(0,10))
    }
    setShowDate(false)
  }

  return (
    <div className="toolbar">
      <span className="toolbar-page-title">{pageTitle}</span>
      <div className="toolbar-spacer"/>

      {/* Search */}
      {showSearch ? (
        <div className="toolbar-search-wrap">
          <IconSearch/>
          <input
            autoFocus
            type="text"
            placeholder="ASIN oder Produkt…"
            value={asinFilter}
            onChange={e => setAsinFilter(e.target.value)}
            onBlur={() => { if (!asinFilter) setShowSearch(false) }}
            className="toolbar-search-input"
          />
          {asinFilter && (
            <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--tx3)'}} onClick={() => { setAsinFilter(''); setShowSearch(false) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      ) : (
        <button className="toolbar-icon-btn" onClick={() => setShowSearch(true)} title="Suchen"><IconSearch/></button>
      )}

      {/* Date Filter */}
      <div className="toolbar-section">
        <button className={`toolbar-date-btn ${dateLabel ? 'active' : ''}`} onClick={() => setShowDate(!showDate)}>
          <IconCalendar/>
          <span>{dateLabel ?? 'Zeitraum'}</span>
        </button>
        {showDate && (
          <div className="toolbar-dropdown" style={{right:0,left:'auto'}}>
            <div className="date-picker-row">
              <div><label>Von</label><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></div>
              <div><label>Bis</label><input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}/></div>
            </div>
            <div className="date-presets">
              <button onClick={()=>setPreset(-1)}>Letzter Monat</button>
              <button onClick={()=>setPreset(-3)}>3 Monate</button>
              <button onClick={()=>setPreset(-6)}>6 Monate</button>
              <button onClick={()=>setPreset(null,2025)}>2025</button>
              <button onClick={()=>setPreset(null,2026)}>2026</button>
            </div>
            {(dateFrom||dateTo) && (
              <button onClick={()=>{setDateFrom('');setDateTo('');setShowDate(false)}}
                style={{marginTop:8,fontSize:12,color:'var(--red)',background:'none',border:'none',cursor:'pointer',fontFamily:'Source Sans 3,sans-serif'}}>
                ✕ Filter löschen
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter */}
      <button className="toolbar-icon-btn" title="Filter"><IconFilter/></button>

      {/* Download */}
      <button className="toolbar-icon-btn" title="CSV herunterladen"><IconDownload/></button>
    </div>
  )
}
