import { useMemo, useRef } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js'
import { useFilters, fmtDate, fmtMonth } from '../context/FilterContext.jsx'
import { downloadCSV, downloadExcel, downloadPDF, downloadChartPNG } from '../utils/export.js'
import { useSortable } from '../utils/sort.jsx'
import InfoTooltip from './InfoTooltip.jsx'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const fmt = (n,d=0) => n==null||isNaN(n)?'–':new Intl.NumberFormat('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)
const eur = n => `€${fmt(n)}`

function valToDateStr(val) {
  if (!val) return null
  if (val instanceof Date) {
    if (isNaN(val)) return null
    return `${val.getFullYear()}-${String(val.getMonth()+1).padStart(2,'0')}-${String(val.getDate()).padStart(2,'0')}`
  }
  if (typeof val === 'number') {
    const d = new Date(Math.round((val-25569)*86400*1000))
    if (isNaN(d)) return null
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
  }
  if (typeof val === 'string') {
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) {
      const [d,m,y] = val.split('.')
      return `${y}-${m}-${d}`
    }
    return val.slice(0,10)
  }
  return null
}

const PDF_COLS = [
  {key:'asin',label:'ASIN'},{key:'titel',label:'Produktname'},{key:'zeitraum',label:'Zeitraum'},
  {key:'revenue',label:'Umsatz (€)'},{key:'orders',label:'Bestellungen'},{key:'sessions',label:'Sessions'},
  {key:'rate',label:'Bestellrate %'},{key:'buybox',label:'Buy Box %'},
]

const KPI_INFO = {
  revenue:   'Quelle: Brand Analytics (SP-API)\nSumme des Produktumsatzes im gewählten Zeitraum.',
  orders:    'Quelle: Brand Analytics (SP-API)\nAnzahl der aufgegebenen Bestellungen.',
  units:     'Quelle: Brand Analytics (SP-API)\nAnzahl der bestellten Einheiten.',
  sessions:  'Quelle: Brand Analytics (SP-API)\nEinzigartige Besucher-Sessions.',
  pageviews: 'Quelle: Brand Analytics (SP-API)\nGesamtanzahl der Seitenaufrufe.',
  cvr:       'Quelle: Brand Analytics (SP-API)\nBestellungen ÷ Sessions × 100',
}

export default function Overview({ data, onExport }) {
  const { filterByDate, dateFrom, dateTo, asinFilter, getTitle, getShortTitle } = useFilters()
  const revenueRef  = useRef()
  const sessionsRef = useRef()

  const rawBrand   = data.brand?.['Brand Analytics'] ?? []
  const rawTraffic = data.traffic?.['Nach ASIN']     ?? []

  const brand = useMemo(() =>
    filterByDate(rawBrand, 'startDate')
  , [rawBrand, filterByDate])

  // Filtere Traffic-Zeilen VOR der Aggregation
  const trafficFiltered = useMemo(() => {
    let rows = rawTraffic

    // ASIN-Filter: exakter Match für ASIN-Format, sonst substring
    if (asinFilter.trim()) {
      const terms = asinFilter.trim()
        .split(/[\n,\s]+/)
        .map(s => s.trim().toUpperCase())
        .filter(s => s.length >= 2)
      if (terms.length) {
        rows = rows.filter(r => {
          const asin = (r['Child ASIN'] || r['Parent ASIN'] || '').toString().toUpperCase().trim()
          return terms.some(t => /^B[0-9A-Z]{9}$/i.test(t) ? asin === t : asin.includes(t))
        })
      }
    }

    // Datumsfilter mit Überlappungslogik:
    // Zeile einschließen wenn Von <= dateTo UND Bis >= dateFrom
    if (dateFrom || dateTo) {
      rows = rows.filter(r => {
        const von = valToDateStr(r['Von'])
        const bis = valToDateStr(r['Bis'])
        // Wenn beide fehlen: einschließen
        if (!von && !bis) return true
        // Bis muss >= dateFrom sein
        if (dateFrom && bis && bis < dateFrom) return false
        // Von muss <= dateTo sein
        if (dateTo && von && von > dateTo) return false
        return true
      })
    }

    return rows
  }, [rawTraffic, asinFilter, dateFrom, dateTo])

  // Aggregiere nach ASIN
  const asinRaw = useMemo(() => {
    const map = {}
    trafficFiltered.forEach(r => {
      const asin = r['Child ASIN'] || r['Parent ASIN'] || '–'
      if (asin === '–') return
      if (!map[asin]) map[asin] = { asin, revenue:0, orders:0, sessions:0, buybox:[], rate:[], bisValues:[] }
      map[asin].revenue  += Number(r['Umsatz (EUR)'])||0
      map[asin].orders   += Number(r['Bestellungen'])||0
      map[asin].sessions += Number(r['Sessions'])||0
      if (r['Buy Box %']   != null) map[asin].buybox.push(Number(r['Buy Box %']))
      if (r['Bestellrate %']!= null) map[asin].rate.push(Number(r['Bestellrate %']))
      if (r['Bis']) map[asin].bisValues.push(valToDateStr(r['Bis']))
    })
    return Object.values(map).map(a => ({
      ...a,
      titel:    getTitle(a.asin),
      buybox:   a.buybox.length ? +(a.buybox.reduce((s,v)=>s+v,0)/a.buybox.length).toFixed(1) : null,
      rate:     a.rate.length   ? +(a.rate.reduce((s,v)=>s+v,0)/a.rate.length).toFixed(1)     : null,
      // Neuestes Bis-Datum als Zeitraumangabe
      zeitraum: a.bisValues.length
        ? fmtMonth(a.bisValues.sort().reverse()[0])
        : '–',
    }))
  }, [trafficFiltered, getTitle])

  const { sorted: asinTotals, Th } = useSortable(asinRaw, 'revenue', 'desc')

  const totals = useMemo(() => {
    const revenue   = brand.reduce((s,r)=>s+(Number(r.orderedProductSalesAmount)||0),0)
    const orders    = brand.reduce((s,r)=>s+(Number(r.totalOrderItems)||0),0)
    const sessions  = brand.reduce((s,r)=>s+(Number(r.browserSessions)||0),0)
    const pageviews = brand.reduce((s,r)=>s+(Number(r.browserPageViews)||0),0)
    const units     = brand.reduce((s,r)=>s+(Number(r.unitsOrdered)||0),0)
    const cvr       = sessions>0?orders/sessions*100:0
    return { revenue, orders, sessions, pageviews, units, cvr }
  }, [brand])

  const chartData = useMemo(() => {
    const s = [...brand].sort((a,b)=>new Date(a.startDate)-new Date(b.startDate))
    return {
      labels: s.map(r=>fmtDate(r.startDate)),
      datasets:[{
        label:'Umsatz (€)', data:s.map(r=>Number(r.orderedProductSalesAmount)||0),
        borderColor:'#0083AD', backgroundColor:'rgba(0,131,173,0.07)',
        fill:true, tension:.4, pointRadius:0, borderWidth:2,
      }]
    }
  }, [brand])

  const sessionsChart = useMemo(() => {
    const s = [...brand].sort((a,b)=>new Date(a.startDate)-new Date(b.startDate))
    return {
      labels: s.map(r=>fmtDate(r.startDate)),
      datasets:[
        {label:'Sessions',      data:s.map(r=>Number(r.browserSessions)||0),  borderColor:'#0083AD', tension:.4, pointRadius:0, borderWidth:2},
        {label:'Seitenaufrufe', data:s.map(r=>Number(r.browserPageViews)||0), borderColor:'#00FFE5', tension:.4, pointRadius:0, borderWidth:2, borderDash:[4,3]},
      ]
    }
  }, [brand])

  const opts  = {responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:10},maxTicksLimit:10}},y:{ticks:{font:{size:10}}}}}
  const opts2 = {...opts,plugins:{legend:{display:true,labels:{boxWidth:10,font:{size:11}}}}}

  const exportData = asinTotals.map(a=>({'ASIN':a.asin,'Produktname':a.titel,'Zeitraum':a.zeitraum,'Umsatz (€)':a.revenue,'Bestellungen':a.orders,'Sessions':a.sessions,'Bestellrate %':a.rate??'','Buy Box %':a.buybox??''}))

  useMemo(()=>{ if(onExport) onExport.current=(format)=>{
    if(format==='csv')   downloadCSV(exportData,'uebersicht.csv')
    if(format==='excel') downloadExcel(exportData,'uebersicht.xlsx','Übersicht')
    if(format==='pdf')   downloadPDF('Top ASINs',asinTotals,PDF_COLS)
  }},[asinTotals])

  const kpis = [
    {label:'Umsatz gesamt',  val:eur(totals.revenue),    info:KPI_INFO.revenue  },
    {label:'Bestellungen',   val:fmt(totals.orders),      info:KPI_INFO.orders   },
    {label:'Einheiten',      val:fmt(totals.units),       info:KPI_INFO.units    },
    {label:'Sessions',       val:fmt(totals.sessions),    info:KPI_INFO.sessions },
    {label:'Seitenaufrufe',  val:fmt(totals.pageviews),   info:KPI_INFO.pageviews},
    {label:'Conversionrate', val:`${fmt(totals.cvr,1)}%`, info:KPI_INFO.cvr      },
  ]

  return (
    <div>
      <div className="kpi-grid">
        {kpis.map(k=>(
          <div key={k.label} className="kpi">
            <div className="kpi-label" style={{display:'flex',alignItems:'center'}}>
              {k.label}<InfoTooltip text={k.info}/>
            </div>
            <div className="kpi-val">{k.val}</div>
          </div>
        ))}
      </div>

      <div className="card-grid">
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <div className="card-title" style={{margin:0}}>Umsatz täglich</div>
              <InfoTooltip text={'Quelle: Brand Analytics (SP-API)\nTäglicher Umsatz.'} position="right"/>
            </div>
            <button className="chart-btn" onClick={()=>downloadChartPNG(revenueRef,'umsatz.png')}>↓ PNG</button>
          </div>
          <div className="chart-box"><Line ref={revenueRef} data={chartData} options={opts}/></div>
        </div>
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <div className="card-title" style={{margin:0}}>Sessions & Seitenaufrufe</div>
              <InfoTooltip text={'Quelle: Brand Analytics (SP-API)\nSessions = einzigartige Besucher'} position="right"/>
            </div>
            <button className="chart-btn" onClick={()=>downloadChartPNG(sessionsRef,'sessions.png')}>↓ PNG</button>
          </div>
          <div className="chart-box"><Line ref={sessionsRef} data={sessionsChart} options={opts2}/></div>
        </div>
      </div>

      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <div className="card-title" style={{margin:0}}>Top ASINs ({asinTotals.length})</div>
            <InfoTooltip text={'Quelle: Verkäufe & Traffic / Nach ASIN (SP-API)\nDatumsfilter prüft ob der Berichtszeitraum (Von–Bis) den gewählten Zeitraum überschneidet.'} position="right"/>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button className="chart-btn" onClick={()=>downloadCSV(exportData,'uebersicht.csv')}>↓ CSV</button>
            <button className="chart-btn" onClick={()=>downloadExcel(exportData,'uebersicht.xlsx','Übersicht')}>↓ Excel</button>
            <button className="chart-btn" onClick={()=>downloadPDF('Top ASINs',asinTotals,PDF_COLS)}>↓ PDF</button>
          </div>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <Th col="asin"     label="ASIN"/>
                <Th col="titel"    label="Produktname"/>
                <Th col="zeitraum" label="Zeitraum"/>
                <Th col="revenue"  label="Umsatz"/>
                <Th col="orders"   label="Bestellungen"/>
                <Th col="sessions" label="Sessions"/>
                <Th col="rate"     label="Bestellrate"/>
                <Th col="buybox"   label="Buy Box"/>
              </tr>
            </thead>
            <tbody>
              {asinTotals.slice(0,50).map((a,i)=>(
                <tr key={i}>
                  <td><code style={{fontSize:11}}>{a.asin}</code></td>
                  <td style={{maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',fontSize:12}} title={a.titel}>{getShortTitle(a.asin,35)}</td>
                  <td style={{fontSize:12,color:'var(--tx2)'}}>{a.zeitraum}</td>
                  <td><strong>{eur(a.revenue)}</strong></td>
                  <td>{fmt(a.orders)}</td>
                  <td>{fmt(a.sessions)}</td>
                  <td>{a.rate!=null?<span className={`badge ${a.rate>=15?'badge-green':a.rate>=8?'badge-amber':'badge-red'}`}>{a.rate}%</span>:'–'}</td>
                  <td>{a.buybox!=null?<span className={`badge ${a.buybox>=80?'badge-green':a.buybox>=50?'badge-amber':'badge-red'}`}>{a.buybox}%</span>:'–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
