import { useCallback, useRef } from 'react'
import { getFlights } from '../../api'
import { useFetch } from '../../hooks/useFetch'
import { dayFraction, fmtTime, STATUS_META } from '../../utils'
import { LoadingScreen, EmptyState, ErrorBanner } from '../ui'

const HOUR_LABELS = Array.from({ length: 25 }, (_, i) => i)
const BAR_HEIGHT = 26
const ROW_H = 42
const LEFT_W = 80  // stand label width
const HEADER_H = 32

function groupByStand(flights) {
  const map = {}
  flights.forEach(f => {
    if (!map[f.assigned_stand]) map[f.assigned_stand] = []
    map[f.assigned_stand].push(f)
  })
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
}

function FlightBar({ flight, containerWidth, onClick }) {
  const startFrac = dayFraction(flight.block_time_start)
  const endFrac   = dayFraction(flight.block_time_end)
  const left  = startFrac * containerWidth
  const width = Math.max((endFrac - startFrac) * containerWidth, 4)
  const isArr = flight.operation === 'arrival'
  const color = flight.status === 'delayed'
    ? 'var(--amber)'
    : flight.status === 'early'
    ? 'var(--accent)'
    : isArr ? 'var(--green)' : 'var(--accent)'
  const bg = flight.status === 'delayed'
    ? 'var(--amber-dim)'
    : flight.status === 'early'
    ? 'var(--accent-dim)'
    : isArr ? 'var(--green-dim)' : 'var(--accent-dim)'

  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(flight)}
      role="button"
      aria-label={`${flight.flight_number} ${fmtTime(flight.block_time_start)}–${fmtTime(flight.block_time_end)}`}
    >
      <rect
        x={left}
        y={(ROW_H - BAR_HEIGHT) / 2}
        width={width}
        height={BAR_HEIGHT}
        rx={4}
        style={{
          fill: bg,
          stroke: color,
          strokeWidth: 1,
          opacity: 0.9,
        }}
      />
      {width > 40 && (
        <text
          x={left + 6}
          y={ROW_H / 2 + 4}
          style={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: color, pointerEvents: 'none' }}
        >
          {flight.flight_number}
        </text>
      )}
    </g>
  )
}

export default function Timeline() {
  const scrollRef = useRef(null)

  const fetcher = useCallback(() => getFlights({ sort: 'scheduled_time', order: 'asc', per_page: 50 }), [])
  const { data, loading, error } = useFetch(fetcher, [])

  const flights = data?.data ?? []
  const rows = groupByStand(flights)

  const totalH = rows.length * ROW_H
  const SVG_W = 1400
  const INNER_W = SVG_W - LEFT_W

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            {rows.length} stands · {flights.length} flights · 00:00 – 24:00 UTC
          </span>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'On Time', color: 'var(--green)' },
              { label: 'Delayed', color: 'var(--amber)' },
              { label: 'Early',   color: 'var(--accent)' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, display: 'inline-block' }} />
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && <div style={{ padding: '8px 16px' }}><ErrorBanner error={error} /></div>}

      {loading ? (
        <LoadingScreen label="LOADING TIMELINE…" />
      ) : flights.length === 0 ? (
        <EmptyState icon="🗓" title="No flight data" subtitle="The timeline is empty" />
      ) : (
        <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
          <svg
            width={SVG_W}
            height={HEADER_H + totalH}
            style={{ display: 'block', minWidth: SVG_W }}
          >
            {/* Background */}
            <rect width={SVG_W} height={HEADER_H + totalH} fill="var(--bg-base)" />

            {/* Hour grid + labels */}
            {HOUR_LABELS.map(h => {
              const x = LEFT_W + (h / 24) * INNER_W
              return (
                <g key={h}>
                  <line
                    x1={x} y1={0} x2={x} y2={HEADER_H + totalH}
                    stroke="var(--border)"
                    strokeWidth={h % 6 === 0 ? 1.5 : 0.5}
                  />
                  <text
                    x={x + 3}
                    y={HEADER_H - 8}
                    style={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: 'var(--text-muted)' }}
                  >
                    {h.toString().padStart(2, '0')}:00
                  </text>
                </g>
              )
            })}

            {/* Rows */}
            {rows.map(([standId, standFlights], rowIdx) => {
              const y = HEADER_H + rowIdx * ROW_H
              return (
                <g key={standId}>
                  {/* Row background */}
                  <rect
                    x={0} y={y} width={SVG_W} height={ROW_H}
                    fill={rowIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)'}
                  />
                  {/* Row border */}
                  <line x1={0} y1={y + ROW_H} x2={SVG_W} y2={y + ROW_H} stroke="var(--border)" strokeWidth={0.5} />

                  {/* Stand label */}
                  <rect x={0} y={y} width={LEFT_W} height={ROW_H} fill="var(--bg-surface)" />
                  <text
                    x={LEFT_W - 8}
                    y={y + ROW_H / 2 + 4}
                    textAnchor="end"
                    style={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'var(--accent)', fontWeight: 500 }}
                  >
                    {standId}
                  </text>
                  <line x1={LEFT_W} y1={y} x2={LEFT_W} y2={y + ROW_H} stroke="var(--border-bright)" strokeWidth={1} />

                  {/* Flight bars */}
                  <g transform={`translate(${LEFT_W}, ${y})`}>
                    {standFlights.map(f => (
                      <FlightBar
                        key={f.id}
                        flight={f}
                        containerWidth={INNER_W}
                        onClick={() => {}}
                      />
                    ))}
                  </g>
                </g>
              )
            })}

            {/* Current-time marker (frozen to noon for demo) */}
            {(() => {
              const now = new Date()
              const frac = (now.getUTCHours() * 60 + now.getUTCMinutes()) / (24 * 60)
              const x = LEFT_W + frac * INNER_W
              return (
                <g>
                  <line
                    x1={x} y1={HEADER_H} x2={x} y2={HEADER_H + totalH}
                    stroke="var(--rose)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    opacity={0.8}
                  />
                  <rect x={x - 16} y={HEADER_H - 16} width={32} height={14} rx={3} fill="var(--rose-dim)" stroke="var(--rose)" strokeWidth={0.5} />
                  <text x={x} y={HEADER_H - 5} textAnchor="middle"
                    style={{ fontSize: 8, fontFamily: 'JetBrains Mono', fill: 'var(--rose)' }}>
                    NOW
                  </text>
                </g>
              )
            })()}
          </svg>
        </div>
      )}
    </div>
  )
}
