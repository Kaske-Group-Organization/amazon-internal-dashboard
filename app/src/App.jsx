import { useState, useEffect } from 'react'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { loginRequest, isAllowedEmail } from './auth/msalConfig.js'
import { api } from './api/sharepoint.js'
import Overview from './components/Overview.jsx'
import Advertising from './components/Advertising.jsx'
import Search from './components/Search.jsx'
import Products from './components/Products.jsx'
import Insights from './components/Insights.jsx'
import Login from './components/Login.jsx'
import './app.css'

const TABS = [
  { id: 'overview',  label: 'Übersicht',   icon: '◈' },
  { id: 'ads',       label: 'Advertising', icon: '◎' },
  { id: 'search',    label: 'Search',      icon: '⊕' },
  { id: 'products',  label: 'Produkte',    icon: '▣' },
  { id: 'insights',  label: 'AI Insights', icon: '✦' },
]

export default function App() {
  const isAuthenticated        = useIsAuthenticated()
  const { instance, accounts } = useMsal()
  const [tab, setTab]          = useState('overview')
  const [data, setData]        = useState(null)
  const [error, setError]      = useState(null)
  const [loading, setLoading]  = useState(false)

  const account = accounts[0]
  const email   = account?.username ?? ''
  const allowed = isAllowedEmail(email)

  useEffect(() => {
    if (isAuthenticated && allowed) {
      setLoading(true)
      api.loadAll()
        .then(setData)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false))
    }
  }, [isAuthenticated, allowed])

  if (!isAuthenticated) return <Login />
  if (!allowed)         return <Login denied />

  const now = new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })

  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">▦</span>
            <span className="logo-text">Amazon Dashboard</span>
            <span className="logo-sub">Kaske Group</span>
          </div>
          <div className="header-meta" style={{display:'flex',alignItems:'center',gap:8}}>
            <span className="pill">Stand: {now}</span>
            <span className="pill" style={{cursor:'pointer'}} onClick={() => instance.logoutPopup()}>
              {email} ↩
            </span>
          </div>
        </div>
      </header>

      <nav className="nav">
        <div className="nav-inner">
          {TABS.map(t => (
            <button key={t.id} className={`nav-btn ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>
              <span className="nav-icon">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="main">
        {loading && <div className="state-box"><div className="spinner"/><p>Lade Daten aus SharePoint…</p></div>}
        {error   && <div className="state-box error"><p className="error-title">Verbindungsfehler</p><p className="error-msg">{error}</p></div>}
        {data && !loading && (
          <>
            {tab==='overview' && <Overview    data={data}/>}
            {tab==='ads'      && <Advertising data={data}/>}
            {tab==='search'   && <Search      data={data}/>}
            {tab==='products' && <Products    data={data}/>}
            {tab==='insights' && <Insights    data={data}/>}
          </>
        )}
      </main>
    </div>
  )
}
