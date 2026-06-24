import { useMemo } from 'react'
import { useFilters, fmtDate } from '../context/FilterContext.jsx'
import { downloadCSV, downloadExcel } from '../utils/export.js'
import { useSortable } from '../utils/sort.jsx'
import InfoTooltip from './InfoTooltip.jsx'

const fmt = (n,d=0) => n==null||isNaN(n)?'–':new Intl.NumberFormat('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)
const eur = n => `€${fmt(n,2)}`
const pct = n => `${fmt(n,1)}%`

const KPI_INFO = {
  impressions: 'Quelle: Search Catalog Performance (SP-API)\nWie oft deine Produkte in Suchergebnissen angezeigt wurden.',
  clicks:      'Quelle: Search Catalog Performance (SP-API)\nWie oft Nutzer auf dein Produkt in der Suche geklickt haben.',
  ctr:         'Quelle: Search Catalog Performance (SP-API)\nBerechnung: Klicks ÷ Impressions × 100\nBranchenüblich: 5–20% ist gut.',
  purchases:   'Quelle: Search Catalog Performance (SP-API)\nAnzahl der Käufe die direkt aus der Suche kamen.',
  cvr:         'Quelle: Search Catalog Performance (SP-API)\nBerechnung: Käufe ÷ Klicks × 100\nZeigt wie effektiv dein Listing konvertiert.',
  sales:       'Quelle: Search Catalog Performance (SP-API)\nUmsatz der direkt über die Amazon-Suche erzielt wurde.',
}

export default function Search({ data }) {
  const { filterByDate, filterByAsin, getTitle, getShortTitle } = useFilters()

  const rawCatalog = data.searchCatalog?.['SearchCatalogPerformance_All'] ?? []
  const rawQueries = data.searchQuery?.['SearchQueryPerformance']         ?? []

  const filteredCatalog = useMemo(() =>
    filterByDate(filterByAsin(rawCatalog, ['asin']), 'startDate')
  , [rawCatalog, filterByDate, filterByAsin])

  const filteredQueries = useMemo(() =>
    filterByDate(filterByAsin(rawQueries, ['searchQuery','asin']), 'startDate')
  , [rawQueries, filterByDate, filterByAsin])

  const catalogData = useMemo(() => filteredCatalog.map(r => ({
    asin:        r.asin,
    titel:       getTitle(r.asin),
    startDate:   fmtDate(r.startDate),
    endDate:     fmtDate(r.endDate),
    impressions: Number(r.impressionCount)||0,
    clicks:      Number(r.clickCount)||0,
    ctr:         (Number(r.impressionCount)||0)>0 ? Number(r.clickCount)/Number(r.impressionCount)*100 : 0,
    cartAdds:    Number(r.cartAddCount)||0,
    purchases:   Number(r.purchaseCount)||0,
    cvr:         (Number(r.clickCount)||0)>0 ? Number(r.purchaseCount)/Number(r.clickCount)*100 : 0,
    sales:       Number(r.searchTrafficSales)||0,
  })), [filteredCatalog, getTitle])

  const queryData = useMemo(() => filteredQueries.map(r => ({
    query:         r.searchQuery ?? '–',
    asin:          r.asin,
    titel:         getTitle(r.asin),
    startDate:     fmtDate(r.startDate),
    score:         Number(r.searchQueryScore)||0,
    volume:        Number(r.searchQueryVolume)||0,
    impShare:      Number(r.asinImpressionShare)||0,
    clickShare:    Number(r.asinClickShare)||0,
    purchaseShare: Number(r.asinPurchaseShare)||0,
    purchases:     Number(r.asinPurchaseCount)||0,
  })), [filteredQueries, getTitle])

  const { sorted: sortedCatalog, Th: CatTh } = useSortable(catalogData, 'purchases', 'desc')
  const { sorted: sortedQueries, Th: QTh    } = useSortable(queryData,   'purchases', 'desc')

  const totals = useMemo(() => {
    const impressions = catalogData.reduce((s,r)=>s+r.impressions,0)
    const clicks      = catalogData.reduce((s,r)=>s+r.clicks,0)
    const purchases   = catalogData.reduce((s,r)=>s+r.purchases,0)
    const sales       = catalogData.reduce((s,r)=>s+r.sales,0)
    return {
      impressions, clicks, purchases, sales,
      cvr: clicks>0 ? purchases/clicks*100 : 0,
      ctr: impressions>0 ? clicks/impressions*100 : 0,
    }
  }, [catalogData])

  const exportCatalog = () => downloadCSV(
    sortedCatalog.map(r=>({ASIN:r.asin,Produktname:r.titel,Von:r.startDate,Bis:r.endDate,Impressions:r.impressions,Klicks:r.clicks,'CTR %':r.ctr.toFixed(1),Käufe:r.purchases,'CVR %':r.cvr.toFixed(1),'Search Sales':r.sales.toFixed(2)})),
    'search_catalog.csv'
  )
  const exportQueries = () => downloadCSV(
    sortedQueries.map(r=>({Query:r.query,ASIN:r.asin,Produktname:r.titel,Datum:r.startDate,Score:r.score,Volumen:r.volume,'Purchase Share':r.purchaseShare})),
    'search_queries.csv'
  )

  return (
    <div>
      <div className="kpi-grid">
        {[
          {label:'Impressions',  val:fmt(totals.impressions), info:KPI_INFO.impressions},
          {label:'Klicks',       val:fmt(totals.clicks),      info:KPI_INFO.clicks},
          {label:'CTR',          val:pct(totals.ctr),         info:KPI_INFO.ctr},
          {label:'Käufe',        val:fmt(totals.purchases),   info:KPI_INFO.purchases},
          {label:'CVR',          val:pct(totals.cvr),         info:KPI_INFO.cvr},
          {label:'Search Sales', val:eur(totals.sales),       info:KPI_INFO.sales},
        ].map(k=>(
          <div key={k.label} className="kpi">
            <div className="kpi-label" style={{display:'flex',alignItems:'center'}}>
              {k.label}<InfoTooltip text={k.info}/>
            </div>
            <div className="kpi-val">{k.val}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginBottom:'1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <div className="card-title" style={{margin:0}}>Search Catalog ({sortedCatalog.length})</div>
            <InfoTooltip text={'Quelle: Search Catalog Performance (SP-API)\nPerformance deiner Produkte in der Amazon-Suche auf ASIN-Ebene.'} position="right"/>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button className="chart-btn" onClick={exportCatalog}>↓ CSV</button>
            <button className="chart-btn" onClick={()=>downloadExcel(sortedCatalog,'search_catalog.xlsx','Search Catalog')}>↓ Excel</button>
          </div>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <CatTh col="asin"        label="ASIN"/>
                <CatTh col="titel"       label="Produktname"/>
                <CatTh col="startDate"   label="Von"/>
                <CatTh col="endDate"     label="Bis"/>
                <CatTh col="impressions" label="Impressions"/>
                <CatTh col="clicks"      label="Klicks"/>
                <CatTh col="ctr"         label="CTR"/>
                <CatTh col="purchases"   label="Käufe"/>
                <CatTh col="cvr"         label="CVR"/>
                <CatTh col="sales"       label="Search Sales"/>
              </tr>
            </thead>
            <tbody>
              {sortedCatalog.slice(0,100).map((r,i)=>(
                <tr key={i}>
                  <td><code style={{fontSize:11}}>{r.asin}</code></td>
                  <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',fontSize:12}} title={r.titel}>{getShortTitle(r.asin,30)}</td>
                  <td style={{fontSize:12,color:'var(--tx2)'}}>{r.startDate}</td>
                  <td style={{fontSize:12,color:'var(--tx2)'}}>{r.endDate}</td>
                  <td>{fmt(r.impressions)}</td>
                  <td>{fmt(r.clicks)}</td>
                  <td><span className={`badge ${r.ctr>10?'badge-green':r.ctr>3?'badge-amber':'badge-red'}`}>{pct(r.ctr)}</span></td>
                  <td><strong>{fmt(r.purchases)}</strong></td>
                  <td><span className={`badge ${r.cvr>15?'badge-green':r.cvr>5?'badge-amber':'badge-red'}`}>{pct(r.cvr)}</span></td>
                  <td>{eur(r.sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <div className="card-title" style={{margin:0}}>Search Query Performance ({sortedQueries.length})</div>
            <InfoTooltip text={'Quelle: Search Query Performance (SP-API)\nWelche Suchbegriffe zu deinen Produkten geführt haben.\nPurchase Share = Anteil deiner Marke an allen Käufen für diesen Begriff.'} position="right"/>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button className="chart-btn" onClick={exportQueries}>↓ CSV</button>
            <button className="chart-btn" onClick={()=>downloadExcel(sortedQueries,'search_queries.xlsx','Search Query')}>↓ Excel</button>
          </div>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <QTh col="query"         label="Query"/>
                <QTh col="asin"          label="ASIN"/>
                <QTh col="titel"         label="Produktname"/>
                <QTh col="startDate"     label="Datum"/>
                <QTh col="score"         label="Score"/>
                <QTh col="volume"        label="Volumen"/>
                <QTh col="impShare"      label="Imp. Share"/>
                <QTh col="clickShare"    label="Click Share"/>
                <QTh col="purchaseShare" label="Purchase Share"/>
              </tr>
            </thead>
            <tbody>
              {sortedQueries.slice(0,100).map((r,i)=>(
                <tr key={i}>
                  <td style={{maxWidth:160,overflow:'hidden',textOverflow:'ellipsis'}}>{r.query}</td>
                  <td><code style={{fontSize:11}}>{r.asin}</code></td>
                  <td style={{maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',fontSize:12}} title={r.titel}>{getShortTitle(r.asin,25)}</td>
                  <td style={{fontSize:12,color:'var(--tx2)'}}>{r.startDate}</td>
                  <td><span className={`badge ${r.score>35?'badge-green':r.score>20?'badge-amber':'badge-red'}`}>{r.score}</span></td>
                  <td>{fmt(r.volume)}</td>
                  <td>{pct(r.impShare)}</td>
                  <td>{pct(r.clickShare)}</td>
                  <td><strong>{pct(r.purchaseShare)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
