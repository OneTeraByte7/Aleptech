import { NavLink } from 'react-router-dom'
import { LayoutGrid, Clock, GitBranch, Network, Settings } from 'lucide-react'

const NAV = [
  { to: '/app',         icon: LayoutGrid, label: 'Dashboard' },
  { to: '/app/timeline', icon: Clock,       label: 'Timeline'  },
  { to: '/app/stands',   icon: GitBranch,   label: 'Stands'    },
  { to: '/app/graph',    icon: Network,     label: 'Graph'     },
]

export function Sidebar() {
  return (
    <aside
      style={{
        width: 56,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 12,
        gap: 4,
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          width: 32,
          height: 32,
          background: 'var(--accent-dim)',
          border: '1px solid rgba(56,189,248,0.3)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, color: 'var(--accent)' }}>A</span>
      </div>

      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/app'}
          title={label}
          style={({ isActive }) => ({
            width: 36,
            height: 36,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isActive ? 'var(--accent)' : 'var(--text-muted)',
            background: isActive ? 'var(--accent-dim)' : 'transparent',
            border: isActive ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent',
            transition: 'all 0.15s',
            textDecoration: 'none',
          })}
        >
          <Icon size={16} />
        </NavLink>
      ))}

      <div style={{ flex: 1 }} />

      <button
        title="Settings"
        style={{
          width: 36, height: 36, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', background: 'transparent',
          border: '1px solid transparent', cursor: 'pointer',
        }}
      >
        <Settings size={15} />
      </button>
    </aside>
  )
}
