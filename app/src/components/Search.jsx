import { useMemo } from 'react'

const fmt = (n,d=0) => n==null||isNaN(n)?'–':new Intl.NumberFormat('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)
const eur = (n) => `€${fmt(n,2)}`
const pct = (n) => `${fmt(n,1)}%`

export default function Search({ data }) {
  const catalog = data.searchCatalog?.['SearchCatalogPerformance_All'] ?? []
  const queries = data.searchQuery?.['SearchQueryPerformance']         ?? []

  const totals = useMemo(() => {
    const impressions = catalog.reduce((s,r)=>s+(Number(r.impressionCount)||0),0)
    const clicks      = catalog.reduce((s,r)=>s+(Number(r.clickCount)||0),0)
    const purchases   = catalog.reduce((s,r)=>s+(Number(r.purchaseCount)||0),0)
    const sales       = catalog.reduce((s,r)=>s+(Number(r.searchTrafficSales)||0),0)
    return { impressions, clicks, purchases, sales, cvr:clicks>0?purchases/clicks*100:0, ctr:impressions>0?clicks/impressions*100:0 }
  }, [catalog])

  const topCatalog = useMemo(()=>[...catalog].sort((a,b)=>(Number(b.purchaseCount)||0)-(Number(a.purchaseCount)||0)).slice(0,12),[catalog])
  const topQueries = useMemo(()=>[...queries].sort((a,b)=>(Number(b.asinPurchaseCount)||0)-(Number(a.asinPurchaseCount)||0)).slice(0,15),[queries])

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Impressions</div><div className="kpi-val">{fmt(totals.impressions)}</div></div>
        <div className="kpi"><div className="kpi-label">Klicks</div><div className="kpi-val">{fmt(totals.clicks)}</div></div>
        <div className="kpi"><div className="kpi-label">CTR</div><div className="kpi-val">{pct(totals.ctr)}</div></div>
        <div className="kpi"><div className="kpi-label">Käufe</div><div className="kpi-val">{fmt(totals.purchases)}</div></div>
        <div className="kpi"><div className="kpi-label">CVR</div><div className="kpi-val">{pct(totals.cvr)}</div></div>
        <div className="kpi"><div className="kpi-label">Search Sales</div><div className="kpi-val">{eur(totals.sales)}</div></div>
      </div>
      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title">Search Catalog Performance</div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>ASIN</th><th>Impressions</th><th>Klicks</th><th>CTR</th><th>Warenkorb</th><th>Käufe</th><th>CVR</th><th>Search Sales</th></tr></thead>
            <tbody>
              {topCatalog.map((r,i)=>{
                const ctr=r.impressionCount>0?r.clickCount/r.impressionCount*100:0
                const cvr=r.clickCount>0?r.purchaseCount/r.clickCount*100:0
                return (
                  <tr key={i}>
                    <td><code style={{fontSize:11}}>{r.asin}</code></td>
                    <td>{fmt(r.impressionCount)}</td><td>{fmt(r.clickCount)}</td>
                    <td><span className={`badge ${ctr>10?'badge-green':ctr>3?'badge-amber':'badge-red'}`}>{pct(ctr)}</span></td>
                    <td>{fmt(r.cartAddCount)}</td><td><strong>{fmt(r.purchaseCount)}</strong></td>
                    <td><span className={`badge ${cvr>15?'badge-green':cvr>5?'badge-amber':'badge-red'}`}>{pct(cvr)}</span></td>
                    <td>{eur(r.searchTrafficSales)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <div className="card-title">Search Query Performance</div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Query</th><th>ASIN</th><th>Score</th><th>Volumen</th><th>Imp. Share</th><th>Click Share</th><th>Purchase Share</th></tr></thead>
            <tbody>
              {topQueries.map((r,i)=>(
                <tr key={i}>
                  <td style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis'}}>{r.searchQuery}</td>
                  <td><code style={{fontSize:11}}>{r.asin}</code></td>
                  <td><span className={`badge ${r.searchQueryScore>35?'badge-green':r.searchQueryScore>20?'badge-amber':'badge-red'}`}>{r.searchQueryScore}</span></td>
                  <td>{fmt(r.searchQueryVolume)}</td>
                  <td>{pct(r.asinImpressionShare)}</td>
                  <td>{pct(r.asinClickShare)}</td>
                  <td><strong>{pct(r.asinPurchaseShare)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
