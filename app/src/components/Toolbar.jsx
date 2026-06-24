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
const IconX        = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>

export default function Toolbar({ pageTitle = 'Übersicht', onExport }) {
  const { dateFrom, setDateFrom, dateTo, setDateTo, asinFilter, setAsinFilter } = useFilters()
  const [showDate,    setShowDate]    = useState(false)
  const [showSearch,  setShowSearch]  = useState(false)
  const [showFilter,  setShowFilter]  = useState(false)
  const [showExport,  setShowExport]  = useState(false)
  const [localAsin,   setLocalAsin]   = useState('')
  const [localName,   setLocalName]   = useState('')
  const pickerRef = useRef()
  const filterRef = useRef()
  const exportRef = useRef()

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowDate(false)
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false)
      if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const dateLabel = dateFrom || dateTo
    ? `${fmtDate(dateFrom) ?? '...'} – ${fmtDate(dateTo) ?? '...'}`
    : null

  const hasFilter = asinFilter.trim()

  const applyFilter = () => {
    setAsinFilter(localAsin || localName)
    setShowFilter(false)
  }
  const clearFilter = () => {
    setLocalAsin('')
    setLocalName('')
    setAsinFilter('')
    setShowFilter(false)
  }

  const openFilter = () => {
    const current = asinFilter.trim()
    const isAsin = /^B[0-9A-Z]{9}$/i.test(current)
    setLocalAsin(isAsin ? current : '')
    setLocalName(!isAsin ? current : '')
    setShowFilter(true)
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
            <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--tx3)',display:'flex'}}
              onClick={() => { setAsinFilter(''); setShowSearch(false) }}>
              <IconX/>
            </button>
          )}
        </div>
      ) : (
        <button className="toolbar-icon-btn" onClick={() => setShowSearch(true)} title="Suchen">
          <IconSearch/>
        </button>
      )}

      {/* Date Picker */}
      <div className="toolbar-section" ref={pickerRef}>
        <button
          className={`toolbar-date-btn ${dateLabel ? 'active' : ''}`}
          onClick={() => { setShowDate(!showDate); setShowFilter(false); setShowExport(false) }}
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

      {/* Filter */}
      <div className="toolbar-section" ref={filterRef}>
        <button
          className="toolbar-icon-btn"
          title="Filter"
          onClick={() => { setShowFilter(!showFilter); setShowDate(false); setShowExport(false) }}
          style={hasFilter ? {borderColor:'var(--ac)',color:'var(--ac)',background:'var(--blue-bg)'} : {}}
        >
          <IconFilter/>
          {hasFilter && <span style={{position:'absolute',top:4,right:4,width:7,height:7,borderRadius:'50%',background:'var(--ac)',border:'2px solid #fff'}}/>}
        </button>

        {showFilter && (
          <div className="toolbar-dropdown" style={{right:0,left:'auto',minWidth:300}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--tx)',marginBottom:12,fontFamily:"'Sora',sans-serif"}}>
              Tabellenfilter
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div>
                <label style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',color:'var(--tx3)',display:'block',marginBottom:4}}>
                  ASIN
                </label>
                <input
                  type="text"
                  placeholder="z.B. B0010J8ZB6"
                  value={localAsin}
                  onChange={e => { setLocalAsin(e.target.value); setLocalName('') }}
                  style={{width:'100%',padding:'7px 10px',borderRadius:'var(--r)',border:'1px solid var(--bdr2)',fontSize:13,fontFamily:"'Source Sans 3',sans-serif",outline:'none',color:'var(--tx)'}}
                  onFocus={e => e.target.style.borderColor='var(--ac)'}
                  onBlur={e => e.target.style.borderColor='var(--bdr2)'}
                />
              </div>

              <div style={{textAlign:'center',fontSize:11,color:'var(--tx3)'}}>oder</div>

              <div>
                <label style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',color:'var(--tx3)',display:'block',marginBottom:4}}>
                  Produktname
                </label>
                <input
                  type="text"
                  placeholder="z.B. Pflasterlöser"
                  value={localName}
                  onChange={e => { setLocalName(e.target.value); setLocalAsin('') }}
                  style={{width:'100%',padding:'7px 10px',borderRadius:'var(--r)',border:'1px solid var(--bdr2)',fontSize:13,fontFamily:"'Source Sans 3',sans-serif",outline:'none',color:'var(--tx)'}}
                  onFocus={e => e.target.style.borderColor='var(--ac)'}
                  onBlur={e => e.target.style.borderColor='var(--bdr2)'}
                  onKeyDown={e => e.key === 'Enter' && applyFilter()}
                />
              </div>
            </div>

            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button
                onClick={applyFilter}
                style={{flex:1,padding:'8px',borderRadius:'var(--r)',border:'none',background:'var(--ac)',color:'#fff',fontFamily:"'Source Sans 3',sans-serif",fontSize:13,fontWeight:600,cursor:'pointer'}}
              >
                Anwenden
              </button>
              {(localAsin || localName || asinFilter) && (
                <button
                  onClick={clearFilter}
                  style={{padding:'8px 12px',borderRadius:'var(--r)',border:'1px solid var(--bdr2)',background:'var(--sur2)',color:'var(--tx2)',fontFamily:"'Source Sans 3',sans-serif",fontSize:13,cursor:'pointer'}}
                >
                  Löschen
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export */}
      <div className="toolbar-section" ref={exportRef}>
        <button
          className="toolbar-icon-btn"
          title="Exportieren"
          onClick={() => { setShowExport(!showExport); setShowDate(false); setShowFilter(false) }}
        >
          <IconDownload/>
        </button>

        {showExport && (
          <div className="toolbar-dropdown" style={{right:0,left:'auto',minWidth:180,padding:'0.5rem'}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',color:'var(--tx3)',padding:'6px 8px',marginBottom:4}}>
              Export Format
            </div>
            {[
              { label:'CSV herunterladen',   icon:'📄', fn: () => onExport?.('csv')   },
              { label:'Excel herunterladen', icon:'📊', fn: () => onExport?.('excel') },
              { label:'PDF drucken / speichern', icon:'🖨️', fn: () => onExport?.('pdf') },
            ].map(({ label, icon, fn }) => (
              <button
                key={label}
                onClick={() => { fn(); setShowExport(false) }}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  width:'100%', padding:'8px 10px', border:'none',
                  background:'transparent', cursor:'pointer', borderRadius:6,
                  fontSize:13, color:'var(--tx)', fontFamily:"'Source Sans 3',sans-serif",
                  textAlign:'left', transition:'all .1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background='var(--sur2)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                <span>{icon}</span>{label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
