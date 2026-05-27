import { useState, useEffect } from 'react'
import { api } from './api/sharepoint.js'
import Overview from './components/Overview.jsx'
import Advertising from './components/Advertising.jsx'
import Search from './components/Search.jsx'
import Products from './components/Products.jsx'
import Insights from './components/Insights.jsx'
import './app.css'

const TABS = [
  { id: 'overview',  label: 'Übersicht',   icon: '◈' },
  { id: 'ads',       label: 'Advertising', icon: '◎' },
  { id: 'search',    label: 'Search',      icon: '⊕' },
  { id: 'products',  label: 'Produkte',    icon: '▣' },
  { id: 'insights',  label: 'AI Insights', icon: '✦' },
]

export default function App() {
  const [tab, setTab]         = useState('overview')
  const [data, setData]       = useState(null)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.loadAll()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

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
          <div className="header-meta">
            <span className="pill">Stand: {now}</span>
          </div>
        </div>
      </header>

      <nav className="nav">
        <div className="nav-inner">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`nav-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="nav-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="main">
        {loading && (
          <div className="state-box">
            <div className="spinner" />
            <p>Lade Daten aus SharePoint…</p>
          </div>
        )}
        {error && (
          <div className="state-box error">
            <p className="error-title">Verbindungsfehler</p>
            <p className="error-msg">{error}</p>
            <p className="error-hint">Prüfe die Azure App-Berechtigung und Netlify Environment Variables.</p>
          </div>
        )}
        {data && !loading && (
          <>
            {tab === 'overview' && <Overview  data={data} />}
            {tab === 'ads'      && <Advertising data={data} />}
            {tab === 'search'   && <Search    data={data} />}
            {tab === 'products' && <Products  data={data} />}
            {tab === 'insights' && <Insights  data={data} />}
          </>
        )}
      </main>
    </div>
  )
}
