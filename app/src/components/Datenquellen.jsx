import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

const SP_SOURCES = [
  { name: 'Brand Analytics',           key: 'brand',         desc: 'Umsatz, Bestellungen, Sessions täglich' },
  { name: 'Verkäufe & Traffic',        key: 'traffic',       desc: 'ASIN-Level: Sessions, Buy Box, Bestellrate' },
  { name: 'Search Catalog Performance',key: 'searchcatalog', desc: 'Impressions, Klicks, CVR pro ASIN' },
  { name: 'Search Query Performance',  key: 'searchquery',   desc: 'Keyword-Level: Volumen, Purchase Share' },
  { name: 'Repeat Purchase',           key: 'repeat',        desc: 'Wiederkaufsrate pro ASIN' },
  { name: 'Market Basket',             key: 'basket',        desc: 'Cross-Sell Kombinationen' },
]

const ADS_SOURCES = [
  { name: 'Ad Campaigns',  key: 'campaigns',   desc: 'Kampagnen, Budget, Status' },
  { name: 'Keywords',      key: 'keywords',    desc: 'Keyword Bids und Match Types' },
  { name: 'Search Terms',  key: 'searchterms', desc: 'Spend, Sales, ACoS pro Query' },
]

export default function Datenquellen({ data, uploadedFiles, onUpload }) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef()

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb    = XLSX.read(e.target.result, { type: 'array', cellDates: true })
        const rows  = {}
        wb.SheetNames.forEach(s => { rows[s] = XLSX.utils.sheet_to_json(wb.Sheets[s], { defval: null }) })
        onUpload({ name: file.name, size: file.size, sheets: rows, uploadedAt: new Date() })
      } catch {
        onUpload({ name: file.name, size: file.size, error: true, uploadedAt: new Date() })
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.csv'))) handleFile(file)
  }

  const fmtSize = b => b > 1024*1024 ? `${(b/1024/1024).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`

  return (
    <div>
      {/* SP API */}
      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title" style={{marginBottom:'1rem'}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'var(--green)',display:'inline-block'}}/>
            Amazon SP API
          </span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:10}}>
          {SP_SOURCES.map(s => {
            const count = data?.[s.key] ? Object.values(data[s.key])[0]?.length ?? 0 : 0
            return (
              <div key={s.key} className="source-card">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--tx)',marginBottom:3}}>{s.name}</div>
                    <div style={{fontSize:11,color:'var(--tx3)'}}>{s.desc}</div>
                  </div>
                  <span className="badge badge-green">{count.toLocaleString('de-DE')} Zeilen</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Ads API */}
      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title" style={{marginBottom:'1rem'}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'var(--ac)',display:'inline-block'}}/>
            Amazon Ads API
          </span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:10}}>
          {ADS_SOURCES.map(s => {
            const adsData = data?.ads
            const count = s.key === 'campaigns'   ? (adsData?.campaigns?.length ?? 0)
                        : s.key === 'keywords'    ? (adsData?.Keywords?.length ?? 0)
                        : (adsData?.SearchTerms?.length ?? 0)
            return (
              <div key={s.key} className="source-card">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--tx)',marginBottom:3}}>{s.name}</div>
                    <div style={{fontSize:11,color:'var(--tx3)'}}>{s.desc}</div>
                  </div>
                  <span className="badge badge-blue">{count.toLocaleString('de-DE')} Zeilen</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Upload */}
      <div className="card">
        <div className="card-title" style={{marginBottom:'1rem'}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'#8B5CF6',display:'inline-block'}}/>
            Eigene Dateien hochladen
          </span>
        </div>
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:12}}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p style={{fontSize:14,fontWeight:600,color:'var(--tx)',marginBottom:4}}>CSV oder Excel hochladen</p>
          <p style={{fontSize:12,color:'var(--tx3)'}}>Drag & Drop oder klicken zum Auswählen · .xlsx, .csv</p>
          <input ref={inputRef} type="file" accept=".xlsx,.csv" style={{display:'none'}} onChange={e => handleFile(e.target.files[0])} />
        </div>

        {uploadedFiles.length > 0 && (
          <div style={{marginTop:'1rem'}}>
            <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',color:'var(--tx3)',marginBottom:8}}>
              Hochgeladene Dateien
            </div>
            {uploadedFiles.map((f,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:'var(--sur2)',borderRadius:'var(--r)',marginBottom:6,border:'1px solid var(--bdr)'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ac)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--tx)'}}>{f.name}</div>
                    <div style={{fontSize:11,color:'var(--tx3)'}}>
                      {f.error ? 'Fehler beim Laden' : `${fmtSize(f.size)} · ${f.uploadedAt?.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}`}
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {f.error
                    ? <span className="badge badge-red">Fehler</span>
                    : <span className="badge badge-green">{Object.values(f.sheets??{}).reduce((s,r)=>s+r.length,0).toLocaleString('de-DE')} Zeilen</span>
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
