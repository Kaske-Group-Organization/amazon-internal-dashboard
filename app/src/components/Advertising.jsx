import { useMemo, useRef } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { useFilters, fmtDate } from '../context/FilterContext.jsx'
import { downloadCSV, downloadExcel, downloadPDF, downloadChartPNG } from '../utils/export.js'
import { useSortable } from '../utils/sort.jsx'
import InfoTooltip from './InfoTooltip.jsx'

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const fmt = (n,d=0) => n==null||isNaN(n)?'–':new Intl.NumberFormat('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)
const eur = n => `€${fmt(n,2)}`
const pct = n => `${fmt(n,1)}%`

const KPI_INFO = {
  spend:  'Quelle: Amazon Ads API (Search Terms Report)\nGesamte Werbeausgaben im gewählten Zeitraum.',
  sales:  'Quelle: Amazon Ads API (Search Terms Report)\nUmsatz der direkt auf Werbeanzeigen zurückzuführen ist (Attribution-Fenster: 14 Tage).',
  acos:   'Quelle: Amazon Ads API\nBerechnung: Ad Spend ÷ Ad Sales × 100\nZiel: Unter dem Ziel-ACoS bleiben (typisch 20-30%).',
  roas:   'Quelle: Amazon Ads API\nBerechnung: Ad Sales ÷ Ad Spend\nZeigt wie viel € Umsatz pro € Werbebudget erzielt wird.',
  clicks: 'Quelle: Amazon Ads API (Search Terms Report)\nGesamtanzahl der Klicks auf Werbeanzeigen.',
  ctr:    'Quelle: Amazon Ads API\nBerechnung: Klicks ÷ Impressions × 100\nBranchenüblich: 0.3–0.5% ist normal.',
}

export default function Advertising({ data }) {
  const { filterByAsin, filterByDate } = useFilters()
  const chartRef = useRef()

  const campaigns   = data.ads?.campaigns ?? []
  const keywords    = data.ads?.Keywords  ?? []

  const rawTerms = useMemo(() =>
    filterByAsin(data.ads?.SearchTerms ?? [], ['query'])
  , [data.ads, filterByAsin])

  const termsData = useMemo(() =>
    rawTerms.map(r => ({
      query:       r.query ?? '–',
      date:        r.date ? fmtDate(r.date) : (r.reportDate ? fmtDate(r.reportDate) : '–'),
      impressions: Number(r.impressions)||0,
      clicks:      Number(r.clicks)||0,
      spend:       Number(r.spend)||0,
      sales:       Number(r.sales)||0,
      acos:        Number(r.sales)>0 ? Number(r.spend)/Number(r.sales)*100 : null,
    }))
  , [rawTerms])

  const { sorted: sortedTerms, Th: TermTh } = useSortable(termsData, 'sales', 'desc')
  const { sorted: sortedCamp,  Th: CampTh  } = useSortable(
    campaigns.map(c=>({...c, startDateFmt: fmtDate(c.startDate), endDateFmt: fmtDate(c.endDate)})),
    'budget', 'desc'
  )
  const { sorted: sortedKw, Th: KwTh } = useSortable(keywords, 'bid', 'desc')

  const totals = useMemo(() => {
    const spend  = termsData.reduce((s,r)=>s+r.spend,0)
    const sales  = termsData.reduce((s,r)=>s+r.sales,0)
    const clicks = termsData.reduce((s,r)=>s+r.clicks,0)
    const impr   = termsData.reduce((s,r)=>s+r.impressions,0)
    return { spend, sales, clicks, impr, acos:sales>0?spend/sales*100:0, roas:spend>0?sales/spend:0, ctr:impr>0?clicks/impr*100:0 }
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

  const exportTerms = () => downloadCSV(sortedTerms.map(t=>({'Query':t.query,'Datum':t.date,'Impressions':t.impressions,'Klicks':t.clicks,'Spend (€)':t.spend.toFixed(2),'Sales (€)':t.sales.toFixed(2),'ACoS %':t.acos?.toFixed(1)??'∞'})),'search_terms.csv')
  const exportCamp  = () => downloadCSV(sortedCamp.map(c=>({'Name':c.name,'Status':c.state,'Start':c.startDateFmt,'Ende':c.endDateFmt,'Budget/Tag':c.budget})),'kampagnen.csv')

  const kpis = [
    { label:'Ad Spend',  val:eur(totals.spend),         info:KPI_INFO.spend  },
    { label:'Ad Sales',  val:eur(totals.sales),         info:KPI_INFO.sales  },
    { label:'ACoS',      val:pct(totals.acos),          info:KPI_INFO.acos   },
    { label:'ROAS',      val:`${fmt(totals.roas,2)}x`,  info:KPI_INFO.roas   },
    { label:'Klicks',    val:fmt(totals.clicks),        info:KPI_INFO.clicks },
    { label:'CTR',       val:pct(totals.ctr),           info:KPI_INFO.ctr    },
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

      <div className="card-grid" style={{marginBottom:'1rem'}}>
        <div className="card card-full">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <div className="card-title" style={{margin:0}}>Spend vs. Sales – Top 8</div>
              <InfoTooltip text={'Quelle: Amazon Ads API (Search Terms Report)\nVergleich von Werbeausgaben und erzieltem Umsatz der 8 stärksten Search Terms.'} position="right"/>
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
            <InfoTooltip text={'Quelle: Amazon Ads API (Search Terms Report)\nZeigt welche Suchbegriffe Klicks und Käufe ausgelöst haben.\nACoS = Spend ÷ Sales × 100'} position="right"/>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button className="chart-btn" onClick={exportTerms}>↓ CSV</button>
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
                  <td>{t.acos==null?<span className="badge badge-red">∞</span>:<span className={`badge ${t.acos<25?'badge-green':t.acos<35?'badge-amber':'badge-red'}`}>{pct(t.acos)}</span>}</td>
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
              <InfoTooltip text={'Quelle: Amazon Ads API (Campaigns)\nÜbersicht aller Kampagnen mit Budget, Status und Laufzeit.'} position="right"/>
            </div>
            <button className="chart-btn" onClick={exportCamp}>↓ CSV</button>
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
            <InfoTooltip text={'Quelle: Amazon Ads API (Keywords)\nAlle gebuchten Keywords mit Match-Type und aktuellem Bid.'} position="right"/>
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
