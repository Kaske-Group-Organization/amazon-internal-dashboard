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

const PDF_COLS = [
  {key:'asin',label:'ASIN'},{key:'titel',label:'Produktname'},{key:'letztesMonat',label:'Monat'},
  {key:'revenue',label:'Umsatz (€)'},{key:'orders',label:'Bestellungen'},{key:'sessions',label:'Sessions'},
  {key:'rate',label:'Bestellrate %'},{key:'buybox',label:'Buy Box %'},
]

const KPI_INFO = {
  revenue:    'Quelle: Brand Analytics (SP-API)\nSumme des gesamten Produktumsatzes im gewählten Zeitraum inkl. B2B.',
  orders:     'Quelle: Brand Analytics (SP-API)\nAnzahl der aufgegebenen Bestellungen (Bestelleinheiten, nicht Artikel).',
  units:      'Quelle: Brand Analytics (SP-API)\nAnzahl der bestellten Einheiten (kann > Bestellungen sein bei Multi-Qty).',
  sessions:   'Quelle: Brand Analytics (SP-API)\nEinzigarte Besucher-Sessions auf deinen Amazon-Produktseiten.',
  pageviews:  'Quelle: Brand Analytics (SP-API)\nGesamtanzahl der Seitenaufrufe (ein Besucher kann mehrere Seiten aufrufen).',
  cvr:        'Quelle: Brand Analytics (SP-API)\nBerechnung: Bestellungen ÷ Sessions × 100\nZeigt wie viele Besucher tatsächlich kaufen.',
}

export default function Overview({ data, onExport }) {
  const { filterByDate, filterByAsin, getTitle, getShortTitle } = useFilters()
  const revenueRef  = useRef()
  const sessionsRef = useRef()

  const rawBrand   = data.brand?.['Brand Analytics'] ?? []
  const rawTraffic = data.traffic?.['Nach ASIN']     ?? []

  const brand   = useMemo(() => filterByDate(rawBrand, 'startDate'), [rawBrand, filterByDate])
  const traffic = useMemo(() => filterByDate(filterByAsin(rawTraffic, ['Child ASIN','Parent ASIN']), 'Von'), [rawTraffic, filterByDate, filterByAsin])

  const totals = useMemo(() => {
    const revenue   = brand.reduce((s,r)=>s+(Number(r.orderedProductSalesAmount)||0),0)
    const orders    = brand.reduce((s,r)=>s+(Number(r.totalOrderItems)||0),0)
    const sessions  = brand.reduce((s,r)=>s+(Number(r.browserSessions)||0),0)
    const pageviews = brand.reduce((s,r)=>s+(Number(r.browserPageViews)||0),0)
    const units     = brand.reduce((s,r)=>s+(Number(r.unitsOrdered)||0),0)
    const cvr       = sessions>0?orders/sessions*100:0
    return { revenue, orders, sessions, pageviews, units, cvr }
  }, [brand])

  const asinRaw = useMemo(() => {
    const map = {}
    traffic.forEach(r => {
      const asin = r['Child ASIN']||r['Parent ASIN']||'–'
      if (!map[asin]) map[asin] = { asin, revenue:0, orders:0, sessions:0, buybox:[], rate:[], months:[] }
      map[asin].revenue  += Number(r['Umsatz (EUR)'])||0
      map[asin].orders   += Number(r['Bestellungen'])||0
      map[asin].sessions += Number(r['Sessions'])||0
      if (r['Buy Box %']!=null)     map[asin].buybox.push(Number(r['Buy Box %']))
      if (r['Bestellrate %']!=null) map[asin].rate.push(Number(r['Bestellrate %']))
      if (r['Von']) map[asin].months.push(r['Von'])
    })
    return Object.values(map).filter(a=>a.asin!=='–').map(a=>({
      ...a,
      titel:        getTitle(a.asin),
      buybox:       a.buybox.length ? +(a.buybox.reduce((s,v)=>s+v,0)/a.buybox.length).toFixed(1) : null,
      rate:         a.rate.length   ? +(a.rate.reduce((s,v)=>s+v,0)/a.rate.length).toFixed(1)     : null,
      letztesMonat: a.months.length ? fmtMonth(a.months[a.months.length-1]) : '–',
    }))
  }, [traffic, getTitle])

  const { sorted: asinTotals, Th } = useSortable(asinRaw, 'revenue', 'desc')

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
        { label:'Sessions',      data:s.map(r=>Number(r.browserSessions)||0),  borderColor:'#0083AD', tension:.4, pointRadius:0, borderWidth:2 },
        { label:'Seitenaufrufe', data:s.map(r=>Number(r.browserPageViews)||0), borderColor:'#00FFE5', tension:.4, pointRadius:0, borderWidth:2, borderDash:[4,3] },
      ]
    }
  }, [brand])

  const opts  = {responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:10},maxTicksLimit:10}},y:{ticks:{font:{size:10}}}}}
  const opts2 = {...opts,plugins:{legend:{display:true,labels:{boxWidth:10,font:{size:11}}}}}

  const exportData = asinTotals.map(a=>({'ASIN':a.asin,'Produktname':a.titel,'Monat':a.letztesMonat,'Umsatz (€)':a.revenue,'Bestellungen':a.orders,'Sessions':a.sessions,'Bestellrate %':a.rate??'','Buy Box %':a.buybox??''}))

  useMemo(() => { if (onExport) onExport.current = (fmt) => {
    if (fmt==='csv')   downloadCSV(exportData,'uebersicht.csv')
    if (fmt==='excel') downloadExcel(exportData,'uebersicht.xlsx','Übersicht')
    if (fmt==='pdf')   downloadPDF('Top ASINs nach Umsatz',asinTotals,PDF_COLS)
  }}, [asinTotals])

  const kpis = [
    { label:'Umsatz gesamt',  val:eur(totals.revenue),      info:KPI_INFO.revenue   },
    { label:'Bestellungen',   val:fmt(totals.orders),        info:KPI_INFO.orders    },
    { label:'Einheiten',      val:fmt(totals.units),         info:KPI_INFO.units     },
    { label:'Sessions',       val:fmt(totals.sessions),      info:KPI_INFO.sessions  },
    { label:'Seitenaufrufe',  val:fmt(totals.pageviews),     info:KPI_INFO.pageviews },
    { label:'Conversionrate', val:`${fmt(totals.cvr,1)}%`,   info:KPI_INFO.cvr       },
  ]

  return (
    <div>
      <div className="kpi-grid">
        {kpis.map(k => (
          <div key={k.label} className="kpi">
            <div className="kpi-label" style={{display:'flex',alignItems:'center'}}>
              {k.label}
              <InfoTooltip text={k.info}/>
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
              <InfoTooltip text={'Quelle: Brand Analytics (SP-API)\nTäglicher Produktumsatz im gewählten Zeitraum.\nBei Monatsfilter: Aggregation auf Tagesebene.'} position="right"/>
            </div>
            <button className="chart-btn" onClick={()=>downloadChartPNG(revenueRef,'umsatz.png')}>↓ PNG</button>
          </div>
          <div className="chart-box"><Line ref={revenueRef} data={chartData} options={opts}/></div>
        </div>
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <div className="card-title" style={{margin:0}}>Sessions & Seitenaufrufe</div>
              <InfoTooltip text={'Quelle: Brand Analytics (SP-API)\nSessions = einzigartige Besucher\nSeitenaufrufe = Gesamtaufrufe\nEin Besucher kann mehrere Seiten aufrufen.'} position="right"/>
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
            <InfoTooltip text={'Quelle: Verkäufe & Traffic (SP-API)\nAggregiert nach Child-ASIN über den gewählten Zeitraum.\nBuy Box % und Bestellrate sind Durchschnittswerte.'} position="right"/>
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
                <Th col="asin"         label="ASIN"/>
                <Th col="titel"        label="Produktname"/>
                <Th col="letztesMonat" label="Monat"/>
                <Th col="revenue"      label="Umsatz"/>
                <Th col="orders"       label="Bestellungen"/>
                <Th col="sessions"     label="Sessions"/>
                <Th col="rate"         label="Bestellrate"/>
                <Th col="buybox"       label="Buy Box"/>
              </tr>
            </thead>
            <tbody>
              {asinTotals.slice(0,50).map((a,i)=>(
                <tr key={i}>
                  <td><code style={{fontSize:11}}>{a.asin}</code></td>
                  <td style={{maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',fontSize:12}} title={a.titel}>{getShortTitle(a.asin,35)}</td>
                  <td style={{fontSize:12,color:'var(--tx2)'}}>{a.letztesMonat}</td>
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
