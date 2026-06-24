import { useState } from 'react'
import { useFilters } from '../context/FilterContext.jsx'

const fmtDate = d => {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
}

export default function Toolbar({ data, uploadedFiles, onUpload }) {
  const { dateFrom, setDateFrom, dateTo, setDateTo, asinFilter, setAsinFilter } = useFilters()
  const [showDate,    setShowDate]    = useState(false)
  const [showSources, setShowSources] = useState(false)
  const [showSearch,  setShowSearch]  = useState(false)

  const dateLabel = dateFrom || dateTo
    ? `${fmtDate(dateFrom) ?? '...'} – ${fmtDate(dateTo) ?? '...'}`
    : 'Zeitraum wählen'

  const setPreset = (months, year) => {
    if (year) {
      setDateFrom(`${year}-01-01`)
      setDateTo(`${year}-12-31`)
    } else {
      const to   = new Date()
      const from = new Date()
      from.setMonth(from.getMonth() + months)
      setDateFrom(from.toISOString().slice(0,10))
      setDateTo(to.toISOString().slice(0,10))
    }
    setShowDate(false)
  }

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <button
          className="toolbar-date-btn"
          onClick={() => { setShowDate(!showDate); setShowSources(false) }}
        >
          📅 {dateLabel}
        </button>
        {showDate && (
          <div className="toolbar-dropdown">
            <div className="date-picker-row">
              <div>
                <label>Von</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label>Bis</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="date-presets">
              <button onClick={() => setPreset(-1)}>Letzter Monat</button>
              <button onClick={() => setPreset(-3)}>3 Monate</button>
              <button onClick={() => setPreset(-6)}>6 Monate</button>
              <button onClick={() => setPreset(null, 2025)}>2025</button>
              <button onClick={() => setPreset(null, 2026)}>2026</button>
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setShowDate(false) }}
                style={{marginTop:8,fontSize:12,color:'#EF4444',background:'none',border:'none',cursor:'pointer'}}
              >
                ✕ Filter löschen
              </button>
            )}
          </div>
        )}
      </div>

      <div className="toolbar-section">
        <button
          className="toolbar-btn"
          onClick={() => { setShowSources(!showSources); setShowDate(false) }}
        >
          ⊞ Datenquellen <span className="toolbar-badge">{2 + uploadedFiles.length}</span>
        </button>
        {showSources && (
          <div className="toolbar-dropdown sources-dropdown">
            <div className="source-group">
              <div className="source-group-title">Amazon SP API</div>
              {['Brand Analytics','Verkäufe & Traffic','Search Catalog','Search Query','Repeat Purchase','Market Basket'].map(s => (
                <div key={s} className="source-item"><span className="source-dot active"/>{s}</div>
              ))}
            </div>
            <div className="source-group">
              <div className="source-group-title">Amazon Ads</div>
              {['Ad Campaigns','Keywords','Search Terms'].map(s => (
                <div key={s} className="source-item"><span className="source-dot active"/>{s}</div>
              ))}
            </div>
            {uploadedFiles.length > 0 && (
              <div className="source-group">
                <div className="source-group-title">Hochgeladene Dateien</div>
                {uploadedFiles.map(f => (
                  <div key={f.name} className="source-item"><span className="source-dot uploaded"/>{f.name}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="toolbar-spacer"/>

      {showSearch ? (
        <div className="toolbar-search-wrap">
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
            <button
              style={{background:'none',border:'none',cursor:'pointer',color:'#94A3B8'}}
              onClick={() => { setAsinFilter(''); setShowSearch(false) }}
            >✕</button>
          )}
        </div>
      ) : (
        <button className="toolbar-icon-btn" onClick={() => setShowSearch(true)} title="Suchen">⊕</button>
      )}

      <label className="toolbar-icon-btn" title="Datei hochladen" style={{cursor:'pointer'}}>
        ↑
        <input
          type="file"
          accept=".xlsx,.csv"
          style={{display:'none'}}
          onChange={e => { if (e.target.files[0]) onUpload(e.target.files[0]) }}
        />
      </label>

      <button className="toolbar-icon-btn" title="Herunterladen">↓</button>
    </div>
  )
}
