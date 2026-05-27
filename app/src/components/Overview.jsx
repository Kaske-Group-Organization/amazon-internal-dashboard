import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const fmt = (n, d=0) => n == null || isNaN(n) ? '–' : new Intl.NumberFormat('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)
const eur = (n) => `€${fmt(n)}`

export default function Overview({ data }) {
  const brand   = data.brand?.['Brand Analytics'] ?? []
  const traffic = data.traffic?.['Nach ASIN'] ?? []

  const totals = useMemo(() => {
    const revenue   = brand.reduce((s,r) => s + (Number(r.orderedProductSalesAmount)||0), 0)
    const orders    = brand.reduce((s,r) => s + (Number(r.totalOrderItems)||0), 0)
    const sessions  = brand.reduce((s,r) => s + (Number(r.browserSessions)||0), 0)
    const pageviews = brand.reduce((s,r) => s + (Number(r.browserPageViews)||0), 0)
    const units     = brand.reduce((s,r) => s + (Number(r.unitsOrdered)||0), 0)
    const cvr       = sessions > 0 ? orders/sessions*100 : 0
    return { revenue, orders, sessions, pageviews, units, cvr }
  }, [brand])

  const asinTotals = useMemo(() => {
    const map = {}
    traffic.forEach(r => {
      const asin = r['Child ASIN'] || r['Parent ASIN'] || '–'
      if (!map[asin]) map[asin] = { asin, revenue:0, orders:0, sessions:0, buybox:[], rate:[] }
      map[asin].revenue  += Number(r['Umsatz (EUR)'])||0
      map[asin].orders   += Number(r['Bestellungen'])||0
      map[asin].sessions += Number(r['Sessions'])||0
      if (r['Buy Box %'])     map[asin].buybox.push(Number(r['Buy Box %']))
      if (r['Bestellrate %']) map[asin].rate.push(Number(r['Bestellrate %']))
    })
    return Object.values(map)
      .filter(a => a.asin && a.asin !== '–')
      .map(a => ({
        ...a,
        buybox: a.buybox.length ? a.buybox.reduce((s,v)=>s+v,0)/a.buybox.length : null,
        rate:   a.rate.length   ? a.rate.reduce((s,v)=>s+v,0)/a.rate.length     : null,
      }))
      .sort((a,b) => b.revenue-a.revenue)
      .slice(0,10)
  }, [traffic])

  const chartData = useMemo(() => {
    const sorted = [...brand].sort((a,b)=>new Date(a.startDate)-new Date(b.startDate)).slice(-30)
    return {
      labels: sorted.map(r=>{ const d=new Date(r.startDate); return `${d.getDate()}.${d.getMonth()+1}` }),
      datasets: [{
        label:'Umsatz (€)', data:sorted.map(r=>Number(r.orderedProductSalesAmount)||0),
        borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,0.07)',
        fill:true, tension:.4, pointRadius:0, borderWidth:2,
      }]
    }
  }, [brand])

  const sessionsChart = useMemo(() => {
    const sorted = [...brand].sort((a,b)=>new Date(a.startDate)-new Date(b.startDate)).slice(-30)
    return {
      labels: sorted.map(r=>{ const d=new Date(r.startDate); return `${d.getDate()}.${d.getMonth()+1}` }),
      datasets: [
        { label:'Sessions',      data:sorted.map(r=>Number(r.browserSessions)||0),  borderColor:'#16a34a', tension:.4, pointRadius:0, borderWidth:2 },
        { label:'Seitenaufrufe', data:sorted.map(r=>Number(r.browserPageViews)||0), borderColor:'#d97706', tension:.4, pointRadius:0, borderWidth:2, borderDash:[4,3] },
      ]
    }
  }, [brand])

  const opts  = { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{font:{size:10},maxTicksLimit:8}},y:{ticks:{font:{size:10}}}} }
  const opts2 = { ...opts, plugins:{legend:{display:true,labels:{boxWidth:10,font:{size:11}}}} }

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
        <div className="card"><div className="card-title">Umsatz täglich – letzte 30 Tage</div><div className="chart-box"><Line data={chartData} options={opts} /></div></div>
        <div className="card"><div className="card-title">Sessions & Seitenaufrufe</div><div className="chart-box"><Line data={sessionsChart} options={opts2} /></div></div>
      </div>
      <div className="card">
        <div className="card-title">Top ASINs nach Umsatz</div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>ASIN</th><th>Umsatz</th><th>Bestellungen</th><th>Sessions</th><th>Bestellrate</th><th>Buy Box</th></tr></thead>
            <tbody>
              {asinTotals.map((a,i)=>(
                <tr key={i}>
                  <td><code style={{fontSize:11}}>{a.asin}</code></td>
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
