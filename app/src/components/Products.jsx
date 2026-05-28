import { useMemo } from 'react'
import { useFilters } from '../context/FilterContext.jsx'
import FilterBar from './FilterBar.jsx'
import { downloadCSV } from '../utils/export.js'

const fmt=(n,d=0)=>n==null||isNaN(n)?'–':new Intl.NumberFormat('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)
const pct=n=>`${fmt(n,1)}%`

export default function Products({ data }) {
  const { filterByDate, filterByAsin, getTitle, getShortTitle } = useFilters()

  const rawRepeat=data.repeat?.['RepeatPurchase']??[]
  const rawBasket=data.basket?.['MarketBasket']  ??[]

  const repeat=useMemo(()=>filterByDate(filterByAsin(rawRepeat,['asin']),'startDate'),[rawRepeat,filterByDate,filterByAsin])
  const basket=useMemo(()=>filterByDate(filterByAsin(rawBasket,['asin','purchasedWithAsin']),'startDate'),[rawBasket,filterByDate,filterByAsin])

  const repeatSorted=useMemo(()=>
    [...repeat].map(r=>({asin:r.asin,purchases:Number(r.browserPurchases)||0,repeatPurchases:Number(r.browserRepeatPurchases)||0,rate:(Number(r.browserRepeatPurchaseRate)||0)*100}))
    .sort((a,b)=>b.rate-a.rate).slice(0,20)
  ,[repeat])

  const basketTop=useMemo(()=>
    [...basket].map(r=>({asin:r.asin,pairedWith:r.purchasedWithAsin,rank:Number(r.purchasedWithRank),pct:(Number(r.combinationPct)||0)*100}))
    .sort((a,b)=>b.pct-a.pct).slice(0,20)
  ,[basket])

  const exportRepeat=()=>downloadCSV(repeatSorted.map(r=>({ASIN:r.asin,Produktname:getTitle(r.asin),Käufe:r.purchases,Wiederkäufe:r.repeatPurchases,'Rate %':r.rate.toFixed(1)})),'repeat_purchase.csv')
  const exportBasket=()=>downloadCSV(basketTop.map(r=>({ASIN:r.asin,'ASIN Titel':getTitle(r.asin),'Gekauft mit':r.pairedWith,'Titel (mit)':getTitle(r.pairedWith),Rang:r.rank,'Combo %':r.pct.toFixed(1)})),'market_basket.csv')

  return(
    <div>
      <FilterBar/>
      <div className="card-grid">
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div className="card-title" style={{margin:0}}>Wiederkaufsrate ({repeatSorted.length})</div>
            <button onClick={exportRepeat} style={cb}>↓ CSV</button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>ASIN</th><th>Produktname</th><th>Käufe</th><th>Wiederkäufe</th><th>Rate</th></tr></thead>
              <tbody>{repeatSorted.map((r,i)=>(
                <tr key={i}>
                  <td><code style={{fontSize:11}}>{r.asin}</code></td>
                  <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',fontSize:12}} title={getTitle(r.asin)}>{getShortTitle(r.asin,30)}</td>
                  <td>{fmt(r.purchases)}</td><td>{fmt(r.repeatPurchases)}</td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div className="bar-wrap" style={{flex:1}}>
                        <div className="bar-fill" style={{width:`${Math.min(r.rate,100)}%`,background:r.rate>=50?'var(--green)':r.rate>=25?'var(--amber)':'var(--red)'}}/>
                      </div>
                      <span className={`badge ${r.rate>=50?'badge-green':r.rate>=25?'badge-amber':'badge-red'}`}>{pct(r.rate)}</span>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div className="card-title" style={{margin:0}}>Market Basket ({basketTop.length})</div>
            <button onClick={exportBasket} style={cb}>↓ CSV</button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Produkt</th><th>Titel</th><th>Gekauft mit</th><th>Rang</th><th>Combo %</th></tr></thead>
              <tbody>{basketTop.map((r,i)=>(
                <tr key={i}>
                  <td><code style={{fontSize:11}}>{r.asin}</code></td>
                  <td style={{maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',fontSize:12}} title={getTitle(r.asin)}>{getShortTitle(r.asin,25)}</td>
                  <td><code style={{fontSize:11}}>{r.pairedWith}</code></td>
                  <td><span className="badge badge-blue">#{r.rank}</span></td>
                  <td><strong>{pct(r.pct)}</strong></td>
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
