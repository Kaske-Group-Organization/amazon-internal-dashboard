import { useMemo } from 'react'

const fmt = (n,d=0) => n==null||isNaN(n)?'–':new Intl.NumberFormat('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)
const eur = (n) => `€${fmt(n,2)}`
const pct = (n) => `${fmt(n,1)}%`

export default function Insights({ data }) {
  const searchTerms = data.ads?.SearchTerms ?? []
  const traffic     = data.traffic?.['Nach ASIN'] ?? []
  const catalog     = data.searchCatalog?.['SearchCatalogPerformance_All'] ?? []
  const repeat      = data.repeat?.['RepeatPurchase'] ?? []

  const insights = useMemo(() => {
    const list = []
    const wasted = searchTerms.filter(r=>(Number(r.spend)||0)>5&&(Number(r.sales)||0)===0).sort((a,b)=>(Number(b.spend)||0)-(Number(a.spend)||0))
    if (wasted.length>0) {
      const total = wasted.reduce((s,r)=>s+(Number(r.spend)||0),0)
      list.push({ type:'red', title:`${wasted.length} Search Terms mit Spend aber 0 Sales → ${eur(total)} einsparen`, body:`Negativkeywords: "${wasted.slice(0,3).map(r=>r.query).join('", "')}"` })
    }
    const buyBoxMap = {}
    traffic.forEach(r=>{ const a=r['Child ASIN']||r['Parent ASIN']; if(!buyBoxMap[a])buyBoxMap[a]=[]; if(r['Buy Box %']!=null)buyBoxMap[a].push(Number(r['Buy Box %'])) })
    const lowBB = Object.entries(buyBoxMap).filter(([,v])=>v.length>0&&v.reduce((s,x)=>s+x,0)/v.length<60).map(([a,v])=>({asin:a,avg:v.reduce((s,x)=>s+x,0)/v.length}))
    if (lowBB.length>0) list.push({ type:'amber', title:`${lowBB.length} ASIN(s) mit Buy Box unter 60%`, body:`${lowBB.slice(0,3).map(a=>`${a.asin} (${pct(a.avg)})`).join(', ')} – Preis und FBA-Verfügbarkeit prüfen.` })
    const lowCTR = catalog.filter(r=>(Number(r.impressionCount)||0)>1000&&(Number(r.clickCount)||0)/(Number(r.impressionCount)||0)*100<2).sort((a,b)=>(Number(b.impressionCount)||0)-(Number(a.impressionCount)||0))
    if (lowCTR.length>0) list.push({ type:'amber', title:`${lowCTR.length} ASIN(s) mit hohen Impressions aber CTR < 2%`, body:`${lowCTR.slice(0,3).map(r=>r.asin).join(', ')} – Hauptbild, Preis und Titel optimieren.` })
    const strongRepeat = repeat.filter(r=>(Number(r.browserRepeatPurchaseRate)||0)>0.5&&(Number(r.browserPurchases)||0)>5).slice(0,3)
    if (strongRepeat.length>0) list.push({ type:'green', title:`${strongRepeat.length} ASIN(s) mit Wiederkaufsrate > 50%`, body:`${strongRepeat.map(r=>r.asin).join(', ')} – Ideal für Subscribe & Save oder Bundles.` })
    const highAcos = searchTerms.filter(r=>(Number(r.spend)||0)>10&&(Number(r.sales)||0)>0).map(r=>({...r,acos:Number(r.spend)/Number(r.sales)*100})).filter(r=>r.acos>40).sort((a,b)=>b.acos-a.acos)
    if (highAcos.length>0) list.push({ type:'amber', title:`${highAcos.length} Search Terms mit ACoS > 40%`, body:`${highAcos.slice(0,3).map(r=>`"${r.query}" (${pct(r.acos)})`).join(', ')} – Bids reduzieren.` })
    return list.length>0 ? list : [{ type:'green', title:'Keine kritischen Probleme gefunden', body:'Alle KPIs liegen im normalen Bereich.' }]
  }, [searchTerms, traffic, catalog, repeat])

  return (
    <div>
      <div className="card" style={{marginBottom:'1rem',borderLeft:'3px solid var(--blue)',borderRadius:'0 10px 10px 0'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <span style={{fontSize:16}}>✦</span>
          <span style={{fontSize:13,fontWeight:600}}>Automatische Datenanalyse</span>
          <span style={{marginLeft:'auto',fontSize:11,color:'var(--text3)'}}>{new Date().toLocaleString('de-DE',{dateStyle:'long'})}</span>
        </div>
        <p style={{fontSize:12,color:'var(--text2)',lineHeight:1.6}}>Basierend auf deinen aktuellen SharePoint-Daten aus allen 7 Quellen:</p>
      </div>
      {insights.map((ins,i)=>(
        <div key={i} className={`insight ${ins.type}`}>
          <div className="insight-title" style={{color:ins.type==='green'?'var(--green)':ins.type==='red'?'var(--red)':'var(--amber)'}}>{ins.type==='green'?'✓':ins.type==='red'?'✗':'!'} {ins.title}</div>
          <div className="insight-body">{ins.body}</div>
        </div>
      ))}
      <div className="card" style={{marginTop:'1rem'}}>
        <div className="card-title">Datenquellen</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8,marginTop:8}}>
          {[['Ad Campaigns',data.ads?.campaigns?.length??0,'Kampagnen'],['Search Terms',data.ads?.SearchTerms?.length??0,'Einträge'],['Brand Analytics',data.brand?.['Brand Analytics']?.length??0,'Tage'],['Verkäufe & Traffic',data.traffic?.['Nach ASIN']?.length??0,'ASINs'],['Search Catalog',data.searchCatalog?.['SearchCatalogPerformance_All']?.length??0,'ASINs'],['Search Query',data.searchQuery?.['SearchQueryPerformance']?.length??0,'Queries'],['Repeat Purchase',data.repeat?.['RepeatPurchase']?.length??0,'ASINs']].map(([name,count,unit])=>(
            <div key={name} style={{background:'var(--surface2)',borderRadius:6,padding:'8px 12px'}}>
              <div style={{fontSize:11,color:'var(--text3)',marginBottom:2}}>{name}</div>
              <div style={{fontSize:15,fontWeight:600}}>{fmt(count)} <span style={{fontSize:11,fontWeight:400,color:'var(--text3)'}}>{unit}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
