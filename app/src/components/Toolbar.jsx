import { useState, useRef, useEffect } from 'react'
import { useFilters } from '../context/FilterContext.jsx'
import DateRangePicker from './DateRangePicker.jsx'

const fmtDate = s => {
  if (!s) return null
  const [y,m,d] = s.split('-').map(Number)
  return `${d}. ${['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][m-1]} ${String(y).slice(2)}`
}

const IconSearch   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IconFilter   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
const IconDownload = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconCalendar = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>

export default function Toolbar({ pageTitle = 'Übersicht' }) {
  const { dateFrom, setDateFrom, dateTo, setDateTo, asinFilter, setAsinFilter } = useFilters()
  const [showDate,   setShowDate]   = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const pickerRef = useRef()

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowDate(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const dateLabel = dateFrom || dateTo
    ? `${fmtDate(dateFrom) ?? '...'} – ${fmtDate(dateTo) ?? '...'}`
    : null

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
            <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--tx3)',display:'flex'}}
              onClick={() => { setAsinFilter(''); setShowSearch(false) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      ) : (
        <button className="toolbar-icon-btn" onClick={() => setShowSearch(true)} title="Suchen"><IconSearch/></button>
      )}

      {/* Date picker */}
      <div className="toolbar-section" ref={pickerRef}>
        <button
          className={`toolbar-date-btn ${dateLabel ? 'active' : ''}`}
          onClick={() => setShowDate(!showDate)}
        >
          <IconCalendar/>
          <span>{dateLabel ?? 'Zeitraum'}</span>
        </button>
        {showDate && (
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(from, to) => { setDateFrom(from); setDateTo(to) }}
            onClose={() => setShowDate(false)}
          />
        )}
      </div>

      <button className="toolbar-icon-btn" title="Filter"><IconFilter/></button>
      <button className="toolbar-icon-btn" title="CSV herunterladen"><IconDownload/></button>
    </div>
  )
}
