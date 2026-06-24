import { useState, useRef, useEffect } from 'react'

function buildContext(data) {
  const brand       = data.brand?.['Brand Analytics'] ?? []
  const traffic     = data.traffic?.['Nach ASIN']     ?? []
  const searchTerms = data.ads?.SearchTerms            ?? []

  const revenue  = brand.reduce((s,r) => s+(Number(r.orderedProductSalesAmount)||0), 0)
  const orders   = brand.reduce((s,r) => s+(Number(r.totalOrderItems)||0), 0)
  const sessions = brand.reduce((s,r) => s+(Number(r.browserSessions)||0), 0)
  const spend    = searchTerms.reduce((s,r) => s+(Number(r.spend)||0), 0)
  const adSales  = searchTerms.reduce((s,r) => s+(Number(r.sales)||0), 0)

  const asinMap = {}
  traffic.forEach(r => {
    const a = r['Child ASIN'] || r['Parent ASIN']
    if (!a) return
    if (!asinMap[a]) asinMap[a] = 0
    asinMap[a] += Number(r['Umsatz (EUR)']) || 0
  })
  const topAsins = Object.entries(asinMap).sort((a,b) => b[1]-a[1]).slice(0,5)

  const topTerms = [...searchTerms]
    .sort((a,b) => (Number(b.sales)||0)-(Number(a.sales)||0))
    .slice(0,5)

  const wastedSpend = searchTerms
    .filter(r => (Number(r.spend)||0) > 5 && (Number(r.sales)||0) === 0)
    .reduce((s,r) => s+(Number(r.spend)||0), 0)

  return `KASKE GROUP – AMAZON DASHBOARD
Zeitraum: alle verfügbaren Daten

ÜBERSICHT:
- Gesamtumsatz: €${revenue.toFixed(0)}
- Bestellungen: ${orders.toLocaleString('de-DE')}
- Sessions: ${sessions.toLocaleString('de-DE')}
- Conversionrate: ${sessions>0?(orders/sessions*100).toFixed(1):0}%

ADVERTISING:
- Ad Spend: €${spend.toFixed(2)}
- Ad Sales: €${adSales.toFixed(2)}
- ACoS: ${adSales>0?(spend/adSales*100).toFixed(1):'N/A'}%
- ROAS: ${spend>0?(adSales/spend).toFixed(2):'N/A'}x
- Verschwendeter Spend (0 Sales): €${wastedSpend.toFixed(2)}

TOP 5 ASINS NACH UMSATZ:
${topAsins.map(([a,r]) => `- ${a}: €${r.toFixed(0)}`).join('\n')}

TOP 5 SEARCH TERMS NACH SALES:
${topTerms.map(r => `- "${r.query}": Sales €${Number(r.sales).toFixed(2)}, Spend €${Number(r.spend).toFixed(2)}`).join('\n')}`
}

const SUGGESTIONS = [
  'Welcher ASIN hat den höchsten Umsatz?',
  'Wo verschwenden wir am meisten Ad Budget?',
  'Wie ist unser ACoS und was ist der Zielwert?',
  'Welche 3 Maßnahmen empfiehlst du sofort?',
]

export default function AskDataTrail({ data }) {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    if (!text?.trim() || loading) return
    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          dataContext: buildContext(data)
        })
      })
      const json = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: json.text || json.error || 'Fehler' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Verbindungsfehler.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button className="ask-fab" onClick={() => setOpen(!open)}>
        <span className="ask-fab-icon">✦</span>
        Ask DataTrail
      </button>

      {open && (
        <div className="ask-panel">
          <div className="ask-header">
            <div className="ask-header-left">
              <span className="ask-header-icon">✦</span>
              <div>
                <div className="ask-header-title">Ask DataTrail</div>
                <div className="ask-header-sub">Du bist im Amazon Dashboard</div>
              </div>
            </div>
            <button className="ask-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="ask-messages">
            {messages.length === 0 && (
              <div className="ask-welcome">
                <p>Frag mich alles über deine Amazon-Daten — ich liefere Zahlen und Insights direkt im Chat.</p>
                <div className="ask-suggestions-label">VORSCHLÄGE</div>
                {SUGGESTIONS.map(s => (
                  <button key={s} className="ask-suggestion" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            )}
            {messages.map((m,i) => (
              <div key={i} className={`ask-msg ${m.role}`}>{m.content}</div>
            ))}
            {loading && <div className="ask-msg assistant ask-loading">…</div>}
            <div ref={bottomRef}/>
          </div>

          <div className="ask-input-row">
            <input
              className="ask-input"
              type="text"
              placeholder="Frage stellen…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(input)}
            />
            <button className="ask-send" onClick={() => send(input)} disabled={loading}>▶</button>
          </div>
        </div>
      )}
    </>
  )
}
