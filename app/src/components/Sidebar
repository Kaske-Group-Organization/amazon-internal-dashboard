const TABS = [
  { id: 'overview',  label: 'Übersicht',   icon: '◈' },
  { id: 'ads',       label: 'Advertising', icon: '◎' },
  { id: 'search',    label: 'Search',      icon: '⊕' },
  { id: 'products',  label: 'Produkte',    icon: '▣' },
  { id: 'insights',  label: 'AI Insights', icon: '✦' },
]

export default function Sidebar({ tab, setTab, collapsed, setCollapsed, email, onLogout }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">▦</span>
          {!collapsed && <span className="sidebar-logo-text">DataTrail</span>}
        </div>
        <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '→' : '←'}
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
        <button className="sidebar-logout" onClick={onLogout} title="Abmelden">↩</button>
      </div>
    </aside>
  )
}
