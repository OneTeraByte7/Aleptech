import { useState, useCallback } from 'react'
import { getFlights } from '../api'
import { useFetch } from '../hooks/useFetch'
import { fmtTime, STATUS_META, OP_META } from '../utils'
import { Badge, OpBadge, LoadingScreen, EmptyState, ErrorBanner } from './ui'
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'

const TERMINALS = ['', 'T1', 'T2']
const STATUSES  = ['', 'on_time', 'delayed', 'early']
const PER_PAGE  = 8

function FlightRow({ flight, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <tr
      onClick={() => onClick(flight)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.12s',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <td className="py-2 px-3 font-mono text-xs" style={{ color: 'var(--accent)', width: 72 }}>
        {flight.flight_number}
      </td>
      <td className="py-2 px-3 text-xs" style={{ color: 'var(--text-secondary)', maxWidth: 120 }}>
        <div className="truncate">{flight.airline}</div>
      </td>
      <td className="py-2 px-3">
        <OpBadge operation={flight.operation} />
      </td>
      <td className="py-2 px-3 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
        {flight.origin} → {flight.destination}
      </td>
      <td className="py-2 px-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
        {fmtTime(flight.scheduled_time)}
      </td>
      <td className="py-2 px-3">
        <Badge status={flight.status} />
      </td>
      <td className="py-2 px-3 font-mono text-xs text-center" style={{ color: 'var(--text-muted)', width: 60 }}>
        {flight.terminal}
      </td>
      <td className="py-2 px-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
        {flight.assigned_stand}
      </td>
      <td className="py-2 px-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
        {flight.aircraft_type}
      </td>
    </tr>
  )
}

function FlightDetailPanel({ flight, onClose }) {
  if (!flight) return null
  return (
    <div
      style={{
        width: 280,
        background: 'var(--bg-raised)',
        borderLeft: '1px solid var(--border)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflowY: 'auto',
        flexShrink: 0,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          Flight Detail
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '10px 12px',
        }}
      >
        <div className="font-mono text-lg font-medium" style={{ color: 'var(--accent)' }}>
          {flight.flight_number}
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{flight.airline}</div>
        <div style={{ marginTop: 8 }}>
          <Badge status={flight.status} />
          <OpBadge operation={flight.operation} />
        </div>
      </div>

      {[
        ['Aircraft',      flight.aircraft_type],
        ['Size',          flight.aircraft_size],
        ['Route',         `${flight.origin} → ${flight.destination}`],
        ['Terminal',      flight.terminal],
        ['Stand',         flight.assigned_stand],
        ['Scheduled',     fmtTime(flight.scheduled_time)],
        ['Estimated',     fmtTime(flight.estimated_time)],
        ['Block start',   fmtTime(flight.block_time_start)],
        ['Block end',     fmtTime(flight.block_time_end)],
        ['Passengers',    flight.pax_count.toLocaleString()],
      ].map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
          <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-primary)' }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [terminal, setTerminal]   = useState('')
  const [status, setStatus]       = useState('')
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [selected, setSelected]   = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  const fetcher = useCallback(
    () => getFlights({ terminal, status, sort: 'scheduled_time', order: 'asc', page, per_page: PER_PAGE }),
    [terminal, status, page]
  )
  const { data, loading, error, refetch } = useFetch(fetcher, [terminal, status, page])

  const flights = data?.data ?? []
  const pagination = data?.pagination ?? {}

  // Client-side text search filter
  const visible = search
    ? flights.filter(f =>
        f.flight_number.toLowerCase().includes(search.toLowerCase()) ||
        f.airline.toLowerCase().includes(search.toLowerCase()) ||
        f.origin.toLowerCase().includes(search.toLowerCase()) ||
        f.destination.toLowerCase().includes(search.toLowerCase())
      )
    : flights

  function handleFilter(key, val) {
    setPage(1)
    setSelected(null)
    if (key === 'terminal') setTerminal(val)
    if (key === 'status')   setStatus(val)
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            flexShrink: 0,
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search flights, airlines, routes…"
              style={{
                width: '100%',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '5px 9px 5px 28px',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontFamily: 'DM Sans',
                outline: 'none',
              }}
            />
          </div>

          <button
            onClick={() => setShowFilters(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
              fontSize: 11, fontFamily: 'JetBrains Mono',
              background: showFilters ? 'var(--accent-dim)' : 'var(--bg-raised)',
              border: `1px solid ${showFilters ? 'rgba(56,189,248,0.3)' : 'var(--border)'}`,
              color: showFilters ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            <SlidersHorizontal size={11} />
            Filters {(terminal || status) && '●'}
          </button>

          <div style={{ flex: 1 }} />

          <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {pagination.total ?? 0} flights
          </span>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-raised)',
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginRight: 4 }}>TERMINAL</span>
            {TERMINALS.map(t => (
              <FilterChip key={t} active={terminal === t} onClick={() => handleFilter('terminal', t)}>
                {t || 'All'}
              </FilterChip>
            ))}
            <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 6px' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginRight: 4 }}>STATUS</span>
            {STATUSES.map(s => (
              <FilterChip key={s} active={status === s} onClick={() => handleFilter('status', s)}>
                {s ? STATUS_META[s]?.label : 'All'}
              </FilterChip>
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: '8px 16px' }}>
            <ErrorBanner error={error} />
          </div>
        )}

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          {loading ? (
            <LoadingScreen label="FETCHING FLIGHTS…" />
          ) : visible.length === 0 ? (
            <EmptyState icon="✈" title="No flights found" subtitle="Adjust filters or search query" />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
                  {['Flight', 'Airline', 'Op', 'Route', 'Sched.', 'Status', 'Terminal', 'Stand', 'Aircraft'].map(h => (
                    <th
                      key={h}
                      className="font-mono"
                      style={{
                        padding: '7px 12px',
                        textAlign: 'left',
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        letterSpacing: '0.08em',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(f => (
                  <FlightRow
                    key={f.id}
                    flight={f}
                    onClick={setSelected}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && pagination.total_pages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              padding: '8px 16px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              flexShrink: 0,
            }}
          >
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={pageBtnStyle(page <= 1)}
            >
              <ChevronLeft size={13} />
            </button>
            <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {page} / {pagination.total_pages}
            </span>
            <button
              disabled={page >= pagination.total_pages}
              onClick={() => setPage(p => p + 1)}
              style={pageBtnStyle(page >= pagination.total_pages)}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <FlightDetailPanel flight={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontFamily: 'JetBrains Mono',
        cursor: 'pointer',
        background: active ? 'var(--accent-dim)' : 'transparent',
        border: `1px solid ${active ? 'rgba(56,189,248,0.3)' : 'var(--border)'}`,
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  )
}

function pageBtnStyle(disabled) {
  return {
    width: 26, height: 26,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 5, cursor: disabled ? 'default' : 'pointer',
    background: 'var(--bg-raised)',
    border: '1px solid var(--border)',
    color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.12s',
  }
}
