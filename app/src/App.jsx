import { useState, useEffect } from 'react'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { isAllowedEmail } from './auth/msalConfig.js'
import { api } from './api/sharepoint.js'
import { FilterProvider } from './context/FilterContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import Toolbar from './components/Toolbar.jsx'
import Overview from './components/Overview.jsx'
import Advertising from './components/Advertising.jsx'
import Search from './components/Search.jsx'
import Products from './components/Products.jsx'
import Insights from './components/Insights.jsx'
import Datenquellen from './components/Datenquellen.jsx'
import AskDataTrail from './components/AskDataTrail.jsx'
import Login from './components/Login.jsx'
import './app.css'

const PAGE_TITLES = {
  overview:    'Übersicht',
  ads:         'Advertising',
  search:      'Search Performance',
  products:    'Produkte',
  insights:    'AI Insights',
  datasources: 'Datenquellen',
}

export default function App() {
  const isAuthenticated        = useIsAuthenticated()
  const { instance, accounts } = useMsal()
  const [tab, setTab]          = useState('overview')
  const [collapsed, setCollapsed] = useState(false)
  const [data, setData]        = useState(null)
  const [error, setError]      = useState(null)
  const [loading, setLoading]  = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])

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

  const catalog = data?.catalog?.['Sheet1'] ?? data?.catalog?.['Produkt_Katalog'] ?? []

  const handleUpload = (file) => {
    setUploadedFiles(prev => [...prev.filter(f => f.name !== file.name), file])
  }

  return (
    <FilterProvider catalog={catalog} uploadedFiles={uploadedFiles}>
      <div className="shell">
        <Sidebar
          tab={tab} setTab={setTab}
          collapsed={collapsed} setCollapsed={setCollapsed}
          email={email} onLogout={() => instance.logoutPopup()}
        />
        <div className="shell-main">
          <Toolbar pageTitle={PAGE_TITLES[tab] ?? 'Dashboard'} />
          <div className="shell-content">
            {loading && <div className="state-box"><div className="spinner"/><p>Lade Daten aus SharePoint…</p></div>}
            {error   && <div className="state-box error"><p className="error-title">Verbindungsfehler</p><p className="error-msg">{error}</p></div>}
            {!loading && (
              <>
                {tab === 'overview'     && data && <Overview     data={data}/>}
                {tab === 'ads'          && data && <Advertising  data={data}/>}
                {tab === 'search'       && data && <Search       data={data}/>}
                {tab === 'products'     && data && <Products     data={data}/>}
                {tab === 'insights'     && data && <Insights     data={data}/>}
                {tab === 'datasources'  && (
                  <Datenquellen
                    data={data}
                    uploadedFiles={uploadedFiles}
                    onUpload={handleUpload}
                  />
                )}
              </>
            )}
          </div>
        </div>
        {data && <AskDataTrail data={data} uploadedFiles={uploadedFiles}/>}
      </div>
    </FilterProvider>
  )
}
