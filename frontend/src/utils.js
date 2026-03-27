export const STATUS_META = {
  on_time: { label: 'On Time',  cls: 'badge-green', color: 'var(--green)' },
  delayed:  { label: 'Delayed', cls: 'badge-amber', color: 'var(--amber)' },
  early:    { label: 'Early',   cls: 'badge-blue',  color: 'var(--accent)' },
}

export const OP_META = {
  arrival:   { label: 'ARR', symbol: '↓' },
  departure: { label: 'DEP', symbol: '↑' },
}

export function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

export function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function minutesSinceMidnightUTC(iso) {
  const d = new Date(iso)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

/** Returns fraction of day [0,1] for a UTC datetime string */
export function dayFraction(iso) {
  return minutesSinceMidnightUTC(iso) / (24 * 60)
}

export function clsx(...args) {
  return args.filter(Boolean).join(' ')
}
