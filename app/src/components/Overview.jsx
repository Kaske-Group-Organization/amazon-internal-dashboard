import { useMemo, useRef } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js'
import { useFilters, fmtDate, fmtMonth } from '../context/FilterContext.jsx'
import { downloadCSV, downloadChartPNG } from '../utils/export.js'
import { useSortable } from '../utils/sort.jsx'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const fmt = (n,d=0) => n==null||isNaN(n)?'–':new Intl.NumberFormat('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)
const eur = n => `€${fmt(n)}`

export default function Overview({ data }) {
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
      titel:      getTitle(a.asin),
      buybox:     a.buybox.length ? a.buybox.reduce((s,v)=>s+v,0)/a.buybox.length : null,
      rate:       a.rate.length   ? a.rate.reduce((s,v)=>s+v,0)/a.rate.length     : null,
      letztesMonat: a.months.length ? fmtMonth(a.months[a.months.length-1]) : '–',
    }))
  }, [traffic, getTitle])

  const { sorted: asinTotals, Th } = useSortable(asinRaw, 'revenue', 'desc')

  const chartData = useMemo(() => {
    const s = [...brand].sort((a,b)=>new Date(a.startDate)-new Date(b.startDate))
    return {
      labels: s.map(r=>fmtDate(r.startDate)),
      datasets:[{label:'Umsatz (€)',data:s.map(r=>Number(r.orderedProductSalesAmount)||0),borderColor:'var(--ac)',backgroundColor:'rgba(0,131,173,0.07)',fill:true,tension:.4,pointRadius:0,borderWidth:2}]
    }
  }, [brand])

  const sessionsChart = useMemo(() => {
    const s = [...brand].sort((a,b)=>new Date(a.startDate)-new Date(b.startDate))
    return {
      labels: s.map(r=>fmtDate(r.startDate)),
      datasets:[
        {label:'Sessions',     data:s.map(r=>Number(r.browserSessions)||0),  borderColor:'var(--ac)',tension:.4,pointRadius:0,borderWidth:2},
        {label:'Seitenaufrufe',data:s.map(r=>Number(r.browserPageViews)||0), borderColor:'var(--acglow)',tension:.4,pointRadius:0,borderWidth:2,borderDash:[4,3]},
      ]
    }
  }, [brand])

  const opts  = {responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:10},maxTicksLimit:10}},y:{ticks:{font:{size:10}}}}}
  const opts2 = {...opts,plugins:{legend:{display:true,labels:{boxWidth:10,font:{size:11}}}}}

  const exportTable = () => downloadCSV(
    asinTotals.map(a=>({ASIN:a.asin,Produktname:a.titel,Monat:a.letztesMonat,Umsatz:a.revenue,Bestellungen:a.orders,Sessions:a.sessions,'Buy Box %':a.buybox?.toFixed(1)??'','Bestellrate %':a.rate?.toFixed(1)??''})),
    'uebersicht_asins.csv'
  )

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Umsatz gesamt</div><div className="kpi-val">{eur(totals.revenue)}</div></div>
        <div className="kpi"><div className="kpi-label">Bestellungen</div><div className="kpi-val">{fmt(totals.orders)}</div></div>
        <div className="kpi"><div className="kpi-label">Einheiten</div><div className="kpi-val">{fmt(totals.units)}</div></div>
        <div className="kpi"><div className="kpi-label">Sessions</div><div className="kpi-val">{fmt(totals.sessions)}</div></div>
        <div className="kpi"><div className="kpi-label">Seitenaufrufe</div><div className="kpi-val">{fmt(totals.pageviews)}</div></div>
        <div className="kpi"><div className="kpi-label">Conversionrate</div><div className="kpi-val">{fmt(totals.cvr,1)}%</div></div>
      </div>

      <div className="card-grid">
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div className="card-title" style={{margin:0}}>Umsatz täglich</div>
            <button className="chart-btn" onClick={()=>downloadChartPNG(revenueRef,'umsatz.png')}>↓ PNG</button>
          </div>
          <div className="chart-box"><Line ref={revenueRef} data={chartData} options={opts}/></div>
        </div>
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div className="card-title" style={{margin:0}}>Sessions & Seitenaufrufe</div>
            <button className="chart-btn" onClick={()=>downloadChartPNG(sessionsRef,'sessions.png')}>↓ PNG</button>
          </div>
          <div className="chart-box"><Line ref={sessionsRef} data={sessionsChart} options={opts2}/></div>
        </div>
      </div>

      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <div className="card-title" style={{margin:0}}>Top ASINs ({asinTotals.length})</div>
          <button className="chart-btn" onClick={exportTable}>↓ CSV</button>
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
                  <td>{a.rate!=null?<span className={`badge ${a.rate>=15?'badge-green':a.rate>=8?'badge-amber':'badge-red'}`}>{fmt(a.rate,1)}%</span>:'–'}</td>
                  <td>{a.buybox!=null?<span className={`badge ${a.buybox>=80?'badge-green':a.buybox>=50?'badge-amber':'badge-red'}`}>{fmt(a.buybox,1)}%</span>:'–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
