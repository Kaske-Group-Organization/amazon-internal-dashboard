import { useFilters } from '../context/FilterContext.jsx'

export default function FilterBar({ onExport, exportLabel = 'CSV exportieren' }) {
  const { dateFrom, setDateFrom, dateTo, setDateTo, asinFilter, setAsinFilter } = useFilters()
  const hasFilter = dateFrom || dateTo || asinFilter
  const clear = () => { setDateFrom(''); setDateTo(''); setAsinFilter('') }

  return (
    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'10px 14px',marginBottom:'1rem'}}>
      <div style={lw}>
        <span style={ls}>Von</span>
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={inp}/>
      </div>
      <div style={lw}>
        <span style={ls}>Bis</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={inp}/>
      </div>
      <div style={{...lw,flex:1,minWidth:180}}>
        <span style={ls}>ASIN / Produkt</span>
        <input type="text" placeholder="z.B. B0010J8ZB6 oder Pflasterlöser" value={asinFilter} onChange={e=>setAsinFilter(e.target.value)} style={{...inp,width:'100%'}}/>
      </div>
      {hasFilter && <button onClick={clear} style={clearBtn}>✕ Filter löschen</button>}
      {onExport  && <button onClick={onExport} style={exportBtn}>↓ {exportLabel}</button>}
    </div>
  )
}

const lw={display:'flex',flexDirection:'column',gap:2}
const ls={fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em',color:'var(--text3)'}
const inp={fontSize:13,padding:'5px 8px',borderRadius:6,border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text)',outline:'none'}
const clearBtn={fontSize:12,padding:'6px 10px',borderRadius:6,border:'1px solid var(--border2)',background:'transparent',color:'var(--text2)',cursor:'pointer',marginTop:14}
const exportBtn={fontSize:12,padding:'6px 12px',borderRadius:6,border:'none',background:'var(--blue)',color:'#fff',cursor:'pointer',fontWeight:500,marginTop:14}
