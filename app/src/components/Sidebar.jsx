const TABS = [
  { id: 'overview',     label: 'Übersicht',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { id: 'ads',          label: 'Advertising',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg> },
  { id: 'search',       label: 'Search',       icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
  { id: 'products',     label: 'Produkte',     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> },
  { id: 'insights',     label: 'AI Insights',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a5 5 0 1 0 5 5"/><path d="M12 12v4m0 4h.01"/><circle cx="12" cy="20" r=".5" fill="currentColor"/></svg> },
  { id: 'datasources',  label: 'Datenquellen', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> },
]

export default function Sidebar({ tab, setTab, collapsed, setCollapsed, email, onLogout }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3DEEDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          {!collapsed && <span className="sidebar-logo-text">DataTrail</span>}
        </div>
        <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed
              ? <polyline points="9 18 15 12 9 6"/>
              : <polyline points="15 18 9 12 15 6"/>
            }
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`sidebar-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
            title={collapsed ? t.label : ''}
          >
            <span className="sidebar-item-icon">{t.icon}</span>
            {!collapsed && <span className="sidebar-item-label">{t.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && <div className="sidebar-email">{email}</div>}
        <button className="sidebar-logout" onClick={onLogout} title="Abmelden">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </aside>
  )
}
