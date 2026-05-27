import { useMemo } from 'react'

const fmt = (n,d=0) => n==null||isNaN(n)?'–':new Intl.NumberFormat('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)
const pct = (n) => `${fmt(n,1)}%`

export default function Products({ data }) {
  const repeat = data.repeat?.['RepeatPurchase'] ?? []
  const basket = data.basket?.['MarketBasket']   ?? []

  const repeatSorted = useMemo(()=>
    [...repeat].map(r=>({
      asin:r.asin, purchases:Number(r.browserPurchases)||0,
      repeatPurchases:Number(r.browserRepeatPurchases)||0,
      rate:Number(r.browserRepeatPurchaseRate)*100||0,
    })).sort((a,b)=>b.rate-a.rate).slice(0,15)
  ,[repeat])

  const basketTop = useMemo(()=>
    [...basket].map(r=>({
      asin:r.asin, pairedWith:r.purchasedWithAsin,
      rank:Number(r.purchasedWithRank), pct:Number(r.combinationPct)*100,
    })).sort((a,b)=>b.pct-a.pct).slice(0,15)
  ,[basket])

  return (
    <div>
      <div className="card-grid">
        <div className="card">
          <div className="card-title">Wiederkaufsrate pro ASIN</div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>ASIN</th><th>Käufe</th><th>Wiederkäufe</th><th>Rate</th></tr></thead>
              <tbody>
                {repeatSorted.map((r,i)=>(
                  <tr key={i}>
                    <td><code style={{fontSize:11}}>{r.asin}</code></td>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Market Basket – häufig zusammen gekauft</div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Produkt</th><th>Gekauft mit</th><th>Rang</th><th>Combo %</th></tr></thead>
              <tbody>
                {basketTop.map((r,i)=>(
                  <tr key={i}>
                    <td><code style={{fontSize:11}}>{r.asin}</code></td>
                    <td><code style={{fontSize:11}}>{r.pairedWith}</code></td>
                    <td><span className="badge badge-blue">#{r.rank}</span></td>
                    <td><strong>{pct(r.pct)}</strong></td>
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
