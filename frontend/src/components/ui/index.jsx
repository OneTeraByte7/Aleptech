import { clsx, STATUS_META } from '../../utils'

export function Badge({ status, children, className }) {
  const meta = status ? STATUS_META[status] : null
  return (
    <span className={clsx('badge', meta?.cls, className)}>
      {children ?? meta?.label}
    </span>
  )
}

export function OpBadge({ operation }) {
  const isArr = operation === 'arrival'
  return (
    <span
      className="badge font-mono text-[10px]"
      style={{
        background: isArr ? 'rgba(74,222,128,0.08)' : 'rgba(56,189,248,0.08)',
        color: isArr ? 'var(--green)' : 'var(--accent)',
        border: `1px solid ${isArr ? 'rgba(74,222,128,0.2)' : 'rgba(56,189,248,0.2)'}`,
      }}
    >
      {isArr ? '↓ ARR' : '↑ DEP'}
    </span>
  )
}

export function Spinner({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2"
      strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

export function LoadingScreen({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full text-[var(--text-muted)]">
      <Spinner size={24} />
      <span className="font-mono text-xs tracking-widest">{label}</span>
    </div>
  )
}

export function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 h-full py-16 text-center">
      {icon && <div className="text-3xl mb-1 opacity-40">{icon}</div>}
      <p className="text-sm font-display font-semibold text-[var(--text-secondary)]">{title}</p>
      {subtitle && <p className="text-xs text-[var(--text-muted)] max-w-xs">{subtitle}</p>}
    </div>
  )
}

export function ErrorBanner({ error }) {
  if (!error) return null
  const msg = error?.detail?.error ?? error?.detail ?? error?.message ?? 'Unknown error'
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded text-xs font-mono"
      style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(251,113,133,0.2)' }}>
      <span>⚠</span>
      <span>{typeof msg === 'string' ? msg : JSON.stringify(msg)}</span>
    </div>
  )
}

export function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
}
