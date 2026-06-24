import { useMemo, useRef } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { useFilters, fmtDate } from '../context/FilterContext.jsx'
import { downloadCSV, downloadExcel, downloadChartPNG } from '../utils/export.js'
import { useSortable } from '../utils/sort.jsx'
import InfoTooltip from './InfoTooltip.jsx'

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const fmt = (n,d=0) => n==null||isNaN(n)?'–':new Intl.NumberFormat('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)
const eur = n => `€${fmt(n,2)}`
const pct = n => `${fmt(n,1)}%`

const KPI_INFO = {
  spend:  'Quelle: Amazon Ads API\nGesamte Werbeausgaben.',
  sales:  'Quelle: Amazon Ads API\nUmsatz durch Werbung (14-Tage Attribution).',
  acos:   'Quelle: Amazon Ads API\nAd Spend ÷ Ad Sales × 100',
  roas:   'Quelle: Amazon Ads API\nAd Sales ÷ Ad Spend',
  clicks: 'Quelle: Amazon Ads API\nAnzahl der Klicks auf Anzeigen.',
  ctr:    'Quelle: Amazon Ads API\nKlicks ÷ Impressions × 100',
}

export default function Advertising({ data }) {
  const { asinFilter } = useFilters()
  const chartRef = useRef()

  const allTerms    = data.ads?.SearchTerms ?? []
  const allCampaigns = data.ads?.campaigns  ?? []
  const allKeywords  = data.ads?.Keywords   ?? []

  // Search Terms: Filter nach Query (kein ASIN in Ads-Daten)
  const searchTerms = useMemo(() => {
    let rows = allTerms
    if (asinFilter.trim()) {
      const terms = asinFilter.trim().split(/[\n,\s]+/).map(s=>s.trim().toUpperCase()).filter(s=>s.length>=2)
      if (terms.length) {
        rows = rows.filter(r => terms.some(t => (r.query??'').toUpperCase().includes(t)))
      }
    }
    return rows
  }, [allTerms, asinFilter])

  const termsData = useMemo(() =>
    searchTerms.map(r => ({
      query:       r.query ?? '–',
      date:        r.date ? fmtDate(r.date) : r.reportDate ? fmtDate(r.reportDate) : r.startDate ? fmtDate(r.startDate) : '–',
      impressions: Number(r.impressions)||0,
      clicks:      Number(r.clicks)||0,
      spend:       Number(r.spend)||0,
      sales:       Number(r.sales)||0,
      acos:        Number(r.sales)>0 ? Number(r.spend)/Number(r.sales)*100 : null,
    }))
  , [searchTerms])

  const campData = useMemo(() =>
    allCampaigns.map(c=>({
      ...c,
      startDateFmt: c.startDate ? fmtDate(c.startDate) : '–',
      endDateFmt:   c.endDate   ? fmtDate(c.endDate)   : '–',
    }))
  , [allCampaigns])

  const { sorted: sortedTerms, Th: TermTh } = useSortable(termsData, 'sales',  'desc')
  const { sorted: sortedCamp,  Th: CampTh  } = useSortable(campData,  'budget', 'desc')
  const { sorted: sortedKw,    Th: KwTh    } = useSortable(allKeywords,'bid',   'desc')

  const totals = useMemo(() => {
    const spend  = termsData.reduce((s,r)=>s+r.spend,0)
    const sales  = termsData.reduce((s,r)=>s+r.sales,0)
    const clicks = termsData.reduce((s,r)=>s+r.clicks,0)
    const impr   = termsData.reduce((s,r)=>s+r.impressions,0)
    return { spend, sales, clicks, impr,
      acos: sales>0?spend/sales*100:0,
      roas: spend>0?sales/spend:0,
      ctr:  impr>0?clicks/impr*100:0,
    }
  }, [termsData])

  const chartData = useMemo(() => {
    const top8 = [...termsData].sort((a,b)=>b.sales-a.sales).slice(0,8)
    return {
      labels: top8.map(x=>x.query?.slice(0,18)??'–'),
      datasets:[
        {label:'Spend (€)', data:top8.map(x=>+x.spend.toFixed(2)), backgroundColor:'rgba(0,131,173,0.5)'},
        {label:'Sales (€)', data:top8.map(x=>+x.sales.toFixed(2)), backgroundColor:'rgba(0,255,229,0.4)'},
      ]
    }
  }, [termsData])

  const chartOpts = {responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{boxWidth:10,font:{size:11}}}},scales:{x:{ticks:{font:{size:9},maxRotation:35}},y:{ticks:{font:{size:10}}}}}

  const kpis = [
    {label:'Ad Spend', val:eur(totals.spend),        info:KPI_INFO.spend },
    {label:'Ad Sales', val:eur(totals.sales),        info:KPI_INFO.sales },
    {label:'ACoS',     val:pct(totals.acos),         info:KPI_INFO.acos  },
    {label:'ROAS',     val:`${fmt(totals.roas,2)}x`, info:KPI_INFO.roas  },
    {label:'Klicks',   val:fmt(totals.clicks),       info:KPI_INFO.clicks},
    {label:'CTR',      val:pct(totals.ctr),          info:KPI_INFO.ctr   },
  ]

  return (
    <div>
      <div style={{background:'#FEF3C7',border:'1px solid #F59E0B',borderRadius:'var(--r)',padding:'10px 14px',marginBottom:'1rem',fontSize:12,color:'#92400E'}}>
        ℹ️ Amazon Ads Search Terms enthalten keine ASIN-Zuordnung. Filter nach Query-Begriff möglich. Datumsfilter wird von der Ads-API nicht unterstützt.
      </div>

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

      <div className="card-grid" style={{marginBottom:'1rem'}}>
        <div className="card card-full">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <div className="card-title" style={{margin:0}}>Spend vs. Sales – Top 8</div>
              <InfoTooltip text={'Quelle: Amazon Ads API (Search Terms)\nVergleich Werbeausgaben vs. erzielter Umsatz.'} position="right"/>
            </div>
            <button className="chart-btn" onClick={()=>downloadChartPNG(chartRef,'ads_chart.png')}>↓ PNG</button>
          </div>
          <div className="chart-box"><Bar ref={chartRef} data={chartData} options={chartOpts}/></div>
        </div>
      </div>

      <div className="card" style={{marginBottom:'1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <div className="card-title" style={{margin:0}}>Search Terms ({sortedTerms.length})</div>
            <InfoTooltip text={'Quelle: Amazon Ads API\nSuchbegriffe die Klicks und Käufe ausgelöst haben.'} position="right"/>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button className="chart-btn" onClick={()=>downloadCSV(sortedTerms,'search_terms.csv')}>↓ CSV</button>
            <button className="chart-btn" onClick={()=>downloadExcel(sortedTerms,'search_terms.xlsx','Search Terms')}>↓ Excel</button>
          </div>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <TermTh col="query"       label="Query"/>
                <TermTh col="date"        label="Datum"/>
                <TermTh col="impressions" label="Impressions"/>
                <TermTh col="clicks"      label="Klicks"/>
                <TermTh col="spend"       label="Spend"/>
                <TermTh col="sales"       label="Sales"/>
                <TermTh col="acos"        label="ACoS"/>
              </tr>
            </thead>
            <tbody>
              {sortedTerms.slice(0,100).map((t,i)=>(
                <tr key={i}>
                  <td style={{maxWidth:220,overflow:'hidden',textOverflow:'ellipsis'}}>{t.query}</td>
                  <td style={{fontSize:12,color:'var(--tx2)'}}>{t.date}</td>
                  <td>{fmt(t.impressions)}</td>
                  <td>{fmt(t.clicks)}</td>
                  <td>{eur(t.spend)}</td>
                  <td>{eur(t.sales)}</td>
                  <td>{t.acos==null
                    ? <span className="badge badge-red">∞</span>
                    : <span className={`badge ${t.acos<25?'badge-green':t.acos<35?'badge-amber':'badge-red'}`}>{pct(t.acos)}</span>
                  }</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-grid">
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <div className="card-title" style={{margin:0}}>Kampagnen ({sortedCamp.length})</div>
              <InfoTooltip text={'Quelle: Amazon Ads API\nAlle Kampagnen mit Budget und Laufzeit.'} position="right"/>
            </div>
            <button className="chart-btn" onClick={()=>downloadCSV(sortedCamp,'kampagnen.csv')}>↓ CSV</button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <CampTh col="name"         label="Name"/>
                  <CampTh col="state"        label="Status"/>
                  <CampTh col="startDateFmt" label="Start"/>
                  <CampTh col="endDateFmt"   label="Ende"/>
                  <CampTh col="budget"       label="Budget/Tag"/>
                </tr>
              </thead>
              <tbody>
                {sortedCamp.slice(0,20).map((c,i)=>(
                  <tr key={i}>
                    <td style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis'}}>{c.name}</td>
                    <td><span className={`badge ${c.state==='ENABLED'?'badge-green':'badge-gray'}`}>{c.state}</span></td>
                    <td style={{fontSize:12,color:'var(--tx2)'}}>{c.startDateFmt}</td>
                    <td style={{fontSize:12,color:'var(--tx2)'}}>{c.endDateFmt}</td>
                    <td>€{fmt(c.budget)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:'1rem'}}>
            <div className="card-title" style={{margin:0}}>Keywords</div>
            <InfoTooltip text={'Quelle: Amazon Ads API\nGebuchte Keywords mit Match-Type und Bid.'} position="right"/>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <KwTh col="keywordText" label="Keyword"/>
                  <KwTh col="matchType"   label="Match"/>
                  <KwTh col="bid"         label="Bid"/>
                  <KwTh col="state"       label="Status"/>
                </tr>
              </thead>
              <tbody>
                {sortedKw.slice(0,20).map((k,i)=>(
                  <tr key={i}>
                    <td style={{maxWidth:150,overflow:'hidden',textOverflow:'ellipsis'}}>{k.keywordText}</td>
                    <td><span className="badge badge-blue">{k.matchType}</span></td>
                    <td>€{fmt(k.bid,2)}</td>
                    <td><span className={`badge ${k.state==='ENABLED'?'badge-green':'badge-gray'}`}>{k.state}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
