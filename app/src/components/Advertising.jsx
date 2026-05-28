import { useMemo, useRef } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { useFilters } from '../context/FilterContext.jsx'
import FilterBar from './FilterBar.jsx'
import { downloadCSV, downloadChartPNG } from '../utils/export.js'

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const fmt=(n,d=0)=>n==null||isNaN(n)?'–':new Intl.NumberFormat('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)
const eur=n=>`€${fmt(n,2)}`
const pct=n=>`${fmt(n,1)}%`

export default function Advertising({ data }) {
  const { filterByAsin } = useFilters()
  const chartRef = useRef()

  const campaigns  =data.ads?.campaigns  ??[]
  const keywords   =data.ads?.Keywords   ??[]
  const searchTerms=useMemo(()=>filterByAsin(data.ads?.SearchTerms??[],['query']),[data.ads,filterByAsin])

  const totals=useMemo(()=>{
    const spend =searchTerms.reduce((s,r)=>s+(Number(r.spend)||0),0)
    const sales =searchTerms.reduce((s,r)=>s+(Number(r.sales)||0),0)
    const clicks=searchTerms.reduce((s,r)=>s+(Number(r.clicks)||0),0)
    const impr  =searchTerms.reduce((s,r)=>s+(Number(r.impressions)||0),0)
    return{spend,sales,clicks,impr,acos:sales>0?spend/sales*100:0,roas:spend>0?sales/spend:0,ctr:impr>0?clicks/impr*100:0}
  },[searchTerms])

  const topTerms=useMemo(()=>
    [...searchTerms].map(r=>({
      query:r.query,impressions:Number(r.impressions)||0,clicks:Number(r.clicks)||0,
      spend:Number(r.spend)||0,sales:Number(r.sales)||0,
      acos:Number(r.sales)>0?Number(r.spend)/Number(r.sales)*100:null,
    })).sort((a,b)=>b.sales-a.sales).slice(0,20)
  ,[searchTerms])

  const chartData=useMemo(()=>{
    const t=topTerms.slice(0,8)
    return{labels:t.map(x=>x.query?.slice(0,18)??'–'),datasets:[
      {label:'Spend (€)',data:t.map(x=>+x.spend.toFixed(2)),backgroundColor:'rgba(37,99,235,0.5)'},
      {label:'Sales (€)',data:t.map(x=>+x.sales.toFixed(2)),backgroundColor:'rgba(22,163,74,0.5)'},
    ]}
  },[topTerms])

  const chartOpts={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{boxWidth:10,font:{size:11}}}},scales:{x:{ticks:{font:{size:9},maxRotation:35}},y:{ticks:{font:{size:10}}}}}

  const exportTerms=()=>downloadCSV(topTerms.map(t=>({Query:t.query,Impressions:t.impressions,Klicks:t.clicks,'Spend (€)':t.spend.toFixed(2),'Sales (€)':t.sales.toFixed(2),'ACoS %':t.acos?.toFixed(1)??'∞'})),'search_terms.csv')
  const exportCamp=()=>downloadCSV(campaigns.map(c=>({Name:c.name,Status:c.state,'Budget/Tag':c.budget})),'kampagnen.csv')

  return(
    <div>
      <FilterBar onExport={exportTerms} exportLabel="Search Terms als CSV"/>
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Ad Spend</div><div className="kpi-val">{eur(totals.spend)}</div></div>
        <div className="kpi"><div className="kpi-label">Ad Sales</div><div className="kpi-val">{eur(totals.sales)}</div></div>
        <div className="kpi"><div className="kpi-label">ACoS</div><div className="kpi-val">{pct(totals.acos)}</div></div>
        <div className="kpi"><div className="kpi-label">ROAS</div><div className="kpi-val">{fmt(totals.roas,2)}x</div></div>
        <div className="kpi"><div className="kpi-label">Klicks</div><div className="kpi-val">{fmt(totals.clicks)}</div></div>
        <div className="kpi"><div className="kpi-label">CTR</div><div className="kpi-val">{pct(totals.ctr)}</div></div>
      </div>
      <div className="card-grid">
        <div className="card card-full">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div className="card-title" style={{margin:0}}>Spend vs. Sales</div>
            <button onClick={()=>downloadChartPNG(chartRef,'ads_chart.png')} style={cb}>↓ PNG</button>
          </div>
          <div className="chart-box"><Bar ref={chartRef} data={chartData} options={chartOpts}/></div>
        </div>
      </div>
      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title">Search Terms ({topTerms.length})</div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Query</th><th>Impressions</th><th>Klicks</th><th>Spend</th><th>Sales</th><th>ACoS</th></tr></thead>
            <tbody>{topTerms.map((t,i)=>(
              <tr key={i}>
                <td style={{maxWidth:220,overflow:'hidden',textOverflow:'ellipsis'}}>{t.query}</td>
                <td>{fmt(t.impressions)}</td><td>{fmt(t.clicks)}</td>
                <td>{eur(t.spend)}</td><td>{eur(t.sales)}</td>
                <td>{t.acos==null?<span className="badge badge-red">∞</span>:<span className={`badge ${t.acos<25?'badge-green':t.acos<35?'badge-amber':'badge-red'}`}>{pct(t.acos)}</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <div className="card-grid">
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div className="card-title" style={{margin:0}}>Kampagnen ({campaigns.length})</div>
            <button onClick={exportCamp} style={cb}>↓ CSV</button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Name</th><th>Status</th><th>Budget/Tag</th></tr></thead>
              <tbody>{campaigns.slice(0,10).map((c,i)=>(
                <tr key={i}>
                  <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis'}}>{c.name}</td>
                  <td><span className={`badge ${c.state==='ENABLED'?'badge-green':'badge-gray'}`}>{c.state}</span></td>
                  <td>€{fmt(c.budget)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Top Keywords</div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Keyword</th><th>Match</th><th>Bid</th><th>Status</th></tr></thead>
              <tbody>{[...keywords].sort((a,b)=>(Number(b.bid)||0)-(Number(a.bid)||0)).slice(0,10).map((k,i)=>(
                <tr key={i}>
                  <td style={{maxWidth:150,overflow:'hidden',textOverflow:'ellipsis'}}>{k.keywordText}</td>
                  <td><span className="badge badge-blue">{k.matchType}</span></td>
                  <td>€{fmt(k.bid,2)}</td>
                  <td><span className={`badge ${k.state==='ENABLED'?'badge-green':'badge-gray'}`}>{k.state}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
const cb={fontSize:11,padding:'3px 8px',borderRadius:4,border:'1px solid var(--border2)',background:'var(--surface2)',cursor:'pointer',color:'var(--text2)'}
