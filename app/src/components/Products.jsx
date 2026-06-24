import { useMemo } from 'react'
import { useFilters, fmtDate } from '../context/FilterContext.jsx'
import { downloadCSV, downloadExcel } from '../utils/export.js'
import { useSortable } from '../utils/sort.jsx'
import InfoTooltip from './InfoTooltip.jsx'

const fmt = (n,d=0) => { try { return n==null||isNaN(n)?'–':new Intl.NumberFormat('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n) } catch { return '–' } }
const pct = n => `${fmt(n,1)}%`

function safeRows(obj, ...keys) {
  if (!obj) return []
  for (const k of keys) {
    if (Array.isArray(obj[k])) return obj[k]
  }
  const vals = Object.values(obj)
  return Array.isArray(vals[0]) ? vals[0] : []
}

export default function Products({ data }) {
  const { filterByDate, filterByAsin, getTitle, getShortTitle } = useFilters()

  const rawRepeat = useMemo(() => safeRows(data?.repeat, 'RepeatPurchase', 'Sheet1'), [data?.repeat])
  const rawBasket = useMemo(() => safeRows(data?.basket, 'MarketBasket', 'Sheet1'),   [data?.basket])

  const repeatData = useMemo(() => {
    try {
      const rows = filterByDate(filterByAsin(rawRepeat, ['asin']), 'startDate')
      return rows.map(r => ({
        asin:            String(r.asin ?? '–'),
        titel:           getTitle(r.asin),
        startDate:       fmtDate(r.startDate),
        endDate:         fmtDate(r.endDate),
        purchases:       Number(r.browserPurchases)||0,
        repeatPurchases: Number(r.browserRepeatPurchases)||0,
        rate:            (Number(r.browserRepeatPurchaseRate)||0)*100,
      }))
    } catch(e) { console.error('repeatData error:', e); return [] }
  }, [rawRepeat, filterByDate, filterByAsin, getTitle])

  const basketData = useMemo(() => {
    try {
      const rows = filterByDate(filterByAsin(rawBasket, ['asin','purchasedWithAsin']), 'startDate')
      return rows.map(r => ({
        asin:        String(r.asin ?? '–'),
        titel:       getTitle(r.asin),
        pairedWith:  String(r.purchasedWithAsin ?? '–'),
        pairedTitel: getTitle(r.purchasedWithAsin),
        startDate:   fmtDate(r.startDate),
        rank:        Number(r.purchasedWithRank)||0,
        pct:         (Number(r.combinationPct)||0)*100,
      }))
    } catch(e) { console.error('basketData error:', e); return [] }
  }, [rawBasket, filterByDate, filterByAsin, getTitle])

  const { sorted: sortedRepeat, Th: RepTh } = useSortable(repeatData, 'rate', 'desc')
  const { sorted: sortedBasket, Th: BasTh } = useSortable(basketData, 'pct',  'desc')

  const exportRepeat = () => downloadCSV(
    sortedRepeat.map(r=>({ASIN:r.asin,Produktname:r.titel,Von:r.startDate,Bis:r.endDate,Käufe:r.purchases,Wiederkäufe:r.repeatPurchases,'Rate %':r.rate.toFixed(1)})),
    'repeat_purchase.csv'
  )
  const exportBasket = () => downloadCSV(
    sortedBasket.map(r=>({ASIN:r.asin,Titel:r.titel,'Gekauft mit':r.pairedWith,'Titel (mit)':r.pairedTitel,Datum:r.startDate,Rang:r.rank,'Combo %':r.pct.toFixed(1)})),
    'market_basket.csv'
  )

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>

      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <div className="card-title" style={{margin:0}}>Wiederkaufsrate ({sortedRepeat.length})</div>
            <InfoTooltip text={'Quelle: Repeat Purchase (SP-API)\nRate = Wiederkäufe ÷ Gesamtkäufe × 100\n>50%: ideal für Subscribe & Save'} position="right"/>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button className="chart-btn" onClick={exportRepeat}>↓ CSV</button>
            <button className="chart-btn" onClick={()=>downloadExcel(sortedRepeat,'repeat_purchase.xlsx','Repeat Purchase')}>↓ Excel</button>
          </div>
        </div>
        {sortedRepeat.length === 0
          ? <p style={{textAlign:'center',padding:'2rem',color:'var(--tx3)',fontSize:13}}>Keine Daten verfügbar</p>
          : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <RepTh col="asin"            label="ASIN"/>
                    <RepTh col="titel"           label="Produktname"/>
                    <RepTh col="startDate"       label="Von"/>
                    <RepTh col="endDate"         label="Bis"/>
                    <RepTh col="purchases"       label="Käufe"/>
                    <RepTh col="repeatPurchases" label="Wiederkäufe"/>
                    <RepTh col="rate"            label="Rate"/>
                  </tr>
                </thead>
                <tbody>
                  {sortedRepeat.slice(0,100).map((r,i)=>(
                    <tr key={i}>
                      <td><code style={{fontSize:11}}>{r.asin}</code></td>
                      <td style={{maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',fontSize:12}} title={r.titel}>{getShortTitle(r.asin,32)}</td>
                      <td style={{fontSize:12,color:'var(--tx2)'}}>{r.startDate}</td>
                      <td style={{fontSize:12,color:'var(--tx2)'}}>{r.endDate}</td>
                      <td>{fmt(r.purchases)}</td>
                      <td>{fmt(r.repeatPurchases)}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div className="bar-wrap" style={{flex:1,minWidth:60}}>
                            <div className="bar-fill" style={{width:`${Math.min(r.rate,100)}%`,background:r.rate>=50?'var(--green)':r.rate>=25?'var(--amber)':'var(--red)'}}/>
                          </div>
                          <span className={`badge ${r.rate>=50?'badge-green':r.rate>=25?'badge-amber':'badge-red'}`}>{pct(r.rate)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <div className="card-title" style={{margin:0}}>Market Basket ({sortedBasket.length})</div>
            <InfoTooltip text={'Quelle: Market Basket (SP-API)\nCombo % = Anteil gemeinsamer Käufe.\nNützlich für Cross-Sell und Bundle-Angebote.'} position="right"/>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button className="chart-btn" onClick={exportBasket}>↓ CSV</button>
            <button className="chart-btn" onClick={()=>downloadExcel(sortedBasket,'market_basket.xlsx','Market Basket')}>↓ Excel</button>
          </div>
        </div>
        {sortedBasket.length === 0
          ? <p style={{textAlign:'center',padding:'2rem',color:'var(--tx3)',fontSize:13}}>Keine Daten verfügbar</p>
          : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <BasTh col="asin"        label="Produkt"/>
                    <BasTh col="titel"       label="Titel"/>
                    <BasTh col="pairedWith"  label="Gekauft mit"/>
                    <BasTh col="pairedTitel" label="Titel (mit)"/>
                    <BasTh col="startDate"   label="Datum"/>
                    <BasTh col="rank"        label="Rang"/>
                    <BasTh col="pct"         label="Combo %"/>
                  </tr>
                </thead>
                <tbody>
                  {sortedBasket.slice(0,100).map((r,i)=>(
                    <tr key={i}>
                      <td><code style={{fontSize:11}}>{r.asin}</code></td>
                      <td style={{maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',fontSize:12}} title={r.titel}>{getShortTitle(r.asin,22)}</td>
                      <td><code style={{fontSize:11}}>{r.pairedWith}</code></td>
                      <td style={{maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',fontSize:12}} title={r.pairedTitel}>{getShortTitle(r.pairedWith,22)}</td>
                      <td style={{fontSize:12,color:'var(--tx2)'}}>{r.startDate}</td>
                      <td><span className="badge badge-blue">#{r.rank}</span></td>
                      <td><strong>{pct(r.pct)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

    </div>
  )
}
