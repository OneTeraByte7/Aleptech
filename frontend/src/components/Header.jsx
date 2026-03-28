import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { RefreshCw, Moon, Sun } from 'lucide-react'
import { useTheme } from './ThemeContext'

const PAGE_TITLES = {
  '/app':         { title: 'Dashboard',        subtitle: 'Live operations overview' },
  '/app/timeline': { title: 'Stand Timeline',   subtitle: 'Block-time allocation view' },
  '/app/stands':   { title: 'Stand Management', subtitle: 'Occupancy & scheduling' },
  '/app/graph':    { title: 'Resource Graph',   subtitle: 'Network visualization' },
}

function UTCClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const hh = time.getUTCHours().toString().padStart(2, '0')
  const mm = time.getUTCMinutes().toString().padStart(2, '0')
  const ss = time.getUTCSeconds().toString().padStart(2, '0')
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-[var(--text-muted)]">UTC</span>
      <span className="font-mono text-sm font-medium text-[var(--text-primary)]">{hh}:{mm}:{ss}</span>
    </div>
  )
}

export function Header({ onRefresh }) {
  const location = useLocation()
  const { isDarkMode, toggleTheme } = useTheme()
  const meta = PAGE_TITLES[location.pathname] ?? { title: 'Aleph', subtitle: '' }

  return (
    <header
      style={{
        height: 52,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: 16,
        gap: 12,
        flexShrink: 0,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            {meta.title}
          </h1>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{meta.subtitle}</span>
        </div>
      </div>

      <UTCClock />

      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

      {/* Live pulse */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: 'var(--green)',
            boxShadow: '0 0 6px var(--green)',
            animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>LIVE</span>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        style={{
          width: 28, height: 28, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text-muted)', cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'var(--bg-hover)'
          e.target.style.color = 'var(--text)'
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'transparent'
          e.target.style.color = 'var(--text-muted)'
        }}
        title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      >
        {isDarkMode ? <Sun size={13} /> : <Moon size={13} />}
      </button>

      {onRefresh && (
        <button
          onClick={onRefresh}
          style={{
            width: 28, height: 28, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-muted)', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'var(--bg-hover)'
            e.target.style.color = 'var(--text)'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent'
            e.target.style.color = 'var(--text-muted)'
          }}
          title="Refresh data"
        >
          <RefreshCw size={13} />
        </button>
      )}
    </header>
  )
}
