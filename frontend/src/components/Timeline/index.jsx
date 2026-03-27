import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import { getFlights, getStands } from '../../api'
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

function FlightBar({ flight, containerWidth, onClick, onHover, conflict, zoom }) {
  const startFrac = dayFraction(flight.block_time_start)
  const endFrac   = dayFraction(flight.block_time_end)
  const left  = startFrac * containerWidth
  const width = Math.max((endFrac - startFrac) * containerWidth, 4)
  const isArr = flight.operation === 'arrival'
  const color = conflict ? 'var(--danger)' : (
    flight.status === 'delayed'
    ? 'var(--amber)'
    : flight.status === 'early'
    ? 'var(--accent)'
    : isArr ? 'var(--green)' : 'var(--accent)'
  )
  const bg = conflict ? 'rgba(255,80,80,0.08)' : (
    flight.status === 'delayed'
    ? 'var(--amber-dim)'
    : flight.status === 'early'
    ? 'var(--accent-dim)'
    : isArr ? 'var(--green-dim)' : 'var(--accent-dim)'
  )

  // extract airline code from flight number, e.g. EK203 -> EK
  const airlineCode = (flight.flight_number.match(/^[A-Z]+/) || [''])[0]

  const showExactTimes = zoom >= 1.5 || width > 120

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
      {width > 36 && (
        <text
          x={left + 6}
          y={ROW_H / 2 - (showExactTimes ? 4 : 0)}
          style={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: color, pointerEvents: 'none' }}
        >
          {flight.flight_number} {airlineCode}
        </text>
      )}

      {showExactTimes && (
        <text
          x={left + 6}
          y={ROW_H / 2 + 10}
          style={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: color, opacity: 0.9, pointerEvents: 'none' }}
        >
          {fmtTime(flight.block_time_start)} – {fmtTime(flight.block_time_end)}
        </text>
      )}
    </g>
  )
}

export default function Timeline() {
  const scrollRef = useRef(null)

  const fetcher = useCallback(() => getFlights({ sort: 'scheduled_time', order: 'asc', per_page: 50 }), [])
  const { data, loading, error } = useFetch(fetcher, [])

  // fetch stands so we can color/group by terminal and list all stands
  const { data: standsData } = useFetch(() => getStands({ per_page: 200 }), [])
  // supports either direct array response or { data: [...] } shape
  const standsList = Array.isArray(standsData) ? standsData : (standsData?.data || [])
  const standsMap = (standsList || []).reduce((m, s) => { m[s.id] = s; return m }, {})

  // Local state so we can apply visual-only reassignments
  const [flightsState, setFlightsState] = useState([])
  useEffect(() => {
    setFlightsState(data?.data ?? [])
  }, [data])

  const flights = flightsState
  const rows = groupByStand(flights)

  const totalH = rows.length * ROW_H
  // Zoom controls: scale factor applied to the time axis
  const [zoom, setZoom] = useState(1)
  const BASE_SVG_W = 1400
  const SVG_W = Math.round(BASE_SVG_W * zoom)
  const INNER_W = SVG_W - LEFT_W

  // Drag-and-drop refs/state
  const draggingRef = useRef(null) // { id, startX, startY, origStand }
  const [ghost, setGhost] = useState(null) // { left, width, standId, flight }
  const [hovered, setHovered] = useState(null) // { flight, x, y }
  const [selectedFlight, setSelectedFlight] = useState(null)
  const [cursorTime, setCursorTime] = useState(null)
  const [cursorPos, setCursorPos] = useState(null)

  // Helpers to update flight assigned_stand locally
  function reassignFlightLocal(flightId, targetStandId) {
    setFlightsState(prev => prev.map(f => (f.id === flightId ? { ...f, assigned_stand: targetStandId } : f)))
  }

  // Pointer handlers
  useEffect(() => {
    function onPointerMove(e) {
      const d = draggingRef.current
      if (!d) return
      // compute position relative to SVG container
      const svgRect = scrollRef.current?.querySelector('svg')?.getBoundingClientRect()
      if (!svgRect) return
      const x = e.clientX - svgRect.left
      const y = e.clientY - svgRect.top
      // find hovered row
      const rowIdx = Math.floor((y - HEADER_H) / ROW_H)
      const target = rows[rowIdx] ? rows[rowIdx][0] : null
      setGhost({ left: x, width: d.width, standId: target, flight: d.flight })
    }

    function onPointerUp(e) {
      const d = draggingRef.current
      if (d) {
        const target = ghost?.standId
        if (target && target !== d.origStand) {
          reassignFlightLocal(d.id, target)
        }
      }
      draggingRef.current = null
      setGhost(null)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [rows, ghost])

  // Start dragging from a FlightBar
  function startDrag(e, flight, width) {
    e.preventDefault()
    draggingRef.current = { id: flight.id, origStand: flight.assigned_stand, width, flight }
    setGhost({ left: 0, width, standId: null, flight })
  }

  // Zoom helpers
  function zoomIn() { setZoom(z => Math.min(3, +(z + 0.25).toFixed(2))) }
  function zoomOut() { setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2))) }

  // Wheel handler: always scroll the timeline component when hovered (no modifier required)
  function handleWheel(e) {
    const el = scrollRef.current
    if (!el) return
    e.preventDefault()
    // Shift+scroll -> horizontal pan; otherwise vertical scroll within the timeline
    if (e.shiftKey) {
      el.scrollLeft += e.deltaY
    } else {
      el.scrollTop += e.deltaY
    }
  }

  // Show exact time under cursor
  function handleSvgMouseMove(e) {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const rel = (x - LEFT_W) / INNER_W
    if (rel < 0 || rel > 1) {
      setCursorTime(null); setCursorPos(null); return
    }
    const minutes = Math.max(0, Math.min(24 * 60, Math.round(rel * 24 * 60)))
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0')
    const mm = String(minutes % 60).padStart(2, '0')
    setCursorTime(`${hh}:${mm}`)
    setCursorPos({ x: LEFT_W + rel * INNER_W, y })
  }

  function handleSvgMouseLeave() {
    setCursorTime(null); setCursorPos(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            {rows.length} stands · {flights.length} flights · 00:00 – 24:00 UTC
          </span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
            <div style={{ marginLeft: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={zoomOut} style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}>−</button>
                <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', width: 44, textAlign: 'center' }}>{Math.round(zoom * 100)}%</div>
                <button onClick={zoomIn} style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}>+</button>
              </div>
              <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>Scroll to pan; Shift+scroll for horizontal pan</div>
            </div>
          </div>
        </div>
      </div>

      {error && <div style={{ padding: '8px 16px' }}><ErrorBanner error={error} /></div>}

      {loading ? (
        <LoadingScreen label="LOADING TIMELINE…" />
      ) : flights.length === 0 ? (
        <EmptyState icon="🗓" title="No flight data" subtitle="The timeline is empty" />
      ) : (
        <div ref={scrollRef} onWheel={handleWheel} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}>
          {/* Hover tooltip */}
            {hovered && hovered.flight && (
            <div style={{ position: 'absolute', left: hovered.x + 12, top: hovered.y + 12, zIndex: 40 }}>
              <div style={{ minWidth: 220, background: 'var(--bg-surface)', color: 'var(--text)', border: '1px solid var(--border)', padding: '6px 8px', borderRadius: 8, boxShadow: '0 6px 18px rgba(2,6,23,0.08)' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600 }}>{hovered.flight.flight_number} • {hovered.flight.airline}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hovered.flight.origin} → {hovered.flight.destination}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtTime(hovered.flight.block_time_start)} – {fmtTime(hovered.flight.block_time_end)}</div>
              </div>
            </div>
          )}
          <svg
            width={SVG_W}
            height={HEADER_H + totalH}
            style={{ display: 'block', minWidth: SVG_W }}
            onMouseMove={handleSvgMouseMove}
            onMouseLeave={handleSvgMouseLeave}
          >
            {/* Background */}
            <rect width={SVG_W} height={HEADER_H + totalH} fill="var(--bg-base)" />

            {/* Time grid + labels (sub-hour ticks when zoomed) */}
            {(() => {
              const interval = zoom >= 2 ? 15 : zoom >= 1.2 ? 30 : 60
              const ticks = Array.from({ length: Math.floor((24 * 60) / interval) + 1 }, (_, i) => i * interval)
              return ticks.map(mins => {
                const x = LEFT_W + (mins / (24 * 60)) * INNER_W
                const isHour = mins % 60 === 0
                return (
                  <g key={mins}>
                    <line
                      x1={x} y1={0} x2={x} y2={HEADER_H + totalH}
                      stroke="var(--border)"
                      strokeWidth={isHour ? 1.2 : 0.6}
                      opacity={isHour ? 1 : 0.6}
                    />
                    {isHour && (
                      <text
                        x={x + 3}
                        y={HEADER_H - 8}
                        style={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: 'var(--text-muted)' }}
                      >
                        {String(Math.floor(mins / 60)).padStart(2, '0')}:00
                      </text>
                    )}
                  </g>
                )
              })
            })()}

            {/* Rows */}
            {rows.map(([standId, standFlights], rowIdx) => {
              const y = HEADER_H + rowIdx * ROW_H
              // compute terminal from standsMap or from first flight
              const terminal = standsMap[standId]?.terminal || (standFlights[0]?.terminal) || 'T?'
              const terminalColors = { T1: '#60A5FA', T2: '#F59E0B', T3: '#34D399' }
              const termColor = terminalColors[terminal] || '#9CA3AF'

              // conflict detection for this row
              const conflictIds = new Set()
              ;(() => {
                const byTime = standFlights
                  .map(f => ({ id: f.id, s: new Date(f.block_time_start).getTime(), e: new Date(f.block_time_end).getTime() }))
                  .sort((a, b) => a.s - b.s)
                for (let i = 0; i < byTime.length; i++) {
                  for (let j = i + 1; j < byTime.length; j++) {
                    if (byTime[j].s < byTime[i].e) {
                      conflictIds.add(byTime[i].id); conflictIds.add(byTime[j].id)
                    }
                  }
                }
              })()

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
                  <g>
                    <circle cx={18} cy={y + ROW_H / 2} r={6} fill={termColor} />
                    <text
                      x={LEFT_W - 8}
                      y={y + ROW_H / 2 + 4}
                      textAnchor="end"
                      style={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'var(--text)', fontWeight: 600 }}
                    >
                      {standId}
                    </text>
                  </g>
                  <line x1={LEFT_W} y1={y} x2={LEFT_W} y2={y + ROW_H} stroke="var(--border-bright)" strokeWidth={1} />

                  {/* Flight bars */}
                  <g transform={`translate(${LEFT_W}, ${y})`}>
                    {standFlights.map(f => (
                      <g key={f.id}
                        onPointerDown={(ev) => {
                          const startFrac = dayFraction(f.block_time_start)
                          const endFrac   = dayFraction(f.block_time_end)
                          const left  = startFrac * INNER_W
                          const width = Math.max((endFrac - startFrac) * INNER_W, 4)
                          startDrag(ev, f, width)
                        }}
                        onMouseEnter={(ev) => {
                          setHovered({ flight: f, x: ev.clientX - (scrollRef.current?.getBoundingClientRect()?.left || 0), y: ev.clientY - (scrollRef.current?.getBoundingClientRect()?.top || 0) })
                        }}
                        onMouseMove={(ev) => {
                          setHovered({ flight: f, x: ev.clientX - (scrollRef.current?.getBoundingClientRect()?.left || 0), y: ev.clientY - (scrollRef.current?.getBoundingClientRect()?.top || 0) })
                        }}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => setSelectedFlight(f)}
                      >
                        <FlightBar
                          flight={f}
                          containerWidth={INNER_W}
                          onClick={() => setSelectedFlight(f)}
                          conflict={conflictIds.has(f.id)}
                        />
                      </g>
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

            {/* Ghost preview while dragging */}
            {ghost && ghost.standId && (
              (() => {
                const rowIdx = rows.findIndex(r => r[0] === ghost.standId)
                if (rowIdx === -1) return null
                const gy = HEADER_H + rowIdx * ROW_H + (ROW_H - BAR_HEIGHT) / 2
                return (
                  <g pointerEvents="none">
                    <rect x={LEFT_W + ghost.left - ghost.width / 2} y={gy} width={ghost.width} height={BAR_HEIGHT} rx={4}
                      style={{ fill: 'rgba(255,255,255,0.04)', stroke: 'var(--accent)', strokeWidth: 1, opacity: 0.9 }} />
                  </g>
                )
              })()
            )}
          </svg>
          {/* Cursor time indicator */}
          {cursorTime && cursorPos && (
            <div style={{ position: 'absolute', left: cursorPos.x + 8, top: cursorPos.y + 8, zIndex: 60 }}>
              <div className="bg-white/95 text-xs rounded px-2 py-1 shadow">{cursorTime} UTC</div>
            </div>
          )}
          {/* Selected flight details panel (outside SVG) */}
          {selectedFlight && (
            <div style={{ position: 'absolute', right: 12, top: 12, zIndex: 50 }}>
              <div className="w-64 bg-white rounded-md shadow px-3 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-mono font-semibold">{selectedFlight.flight_number} • {selectedFlight.airline}</div>
                    <div className="text-xs text-gray-600">{selectedFlight.origin} → {selectedFlight.destination}</div>
                  </div>
                  <button className="text-sm text-gray-500" onClick={() => setSelectedFlight(null)}>Close</button>
                </div>
                <div className="mt-2 text-xs text-gray-700">
                  <div>Stand: {selectedFlight.assigned_stand}</div>
                  <div>Terminal: {selectedFlight.terminal}</div>
                  <div>Block: {fmtTime(selectedFlight.block_time_start)} – {fmtTime(selectedFlight.block_time_end)}</div>
                  <div>Passengers: {selectedFlight.pax_count}</div>
                  <div>Aircraft: {selectedFlight.aircraft_type}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
