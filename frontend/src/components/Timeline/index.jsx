import { useCallback, useRef, useState, useEffect } from 'react'
import { getFlights, getStands, reassignFlight } from '../../api'
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

function groupByTerminal(standEntries) {
  const terminals = {}
  standEntries.forEach(([standId, standFlights]) => {
    const terminal = standId.startsWith('A') ? 'T1' : standId.startsWith('B') ? 'T2' : 'T3'
    if (!terminals[terminal]) terminals[terminal] = []
    terminals[terminal].push([standId, standFlights])
  })
  return terminals
}

function checkConflicts(flights) {
  const conflicts = new Set()
  flights.forEach((f1, i) => {
    flights.slice(i + 1).forEach(f2 => {
      if (f1.assigned_stand === f2.assigned_stand) {
        const start1 = new Date(f1.block_time_start)
        const end1 = new Date(f1.block_time_end)
        const start2 = new Date(f2.block_time_start)
        const end2 = new Date(f2.block_time_end)
        
        if (start1 < end2 && start2 < end1) {
          conflicts.add(f1.id)
          conflicts.add(f2.id)
        }
      }
    })
  })
  return conflicts
}

function FlightBar({ flight, containerWidth, zoomLevel, onClick, onDragStart, isConflict, isDragging }) {
  const [isHovered, setIsHovered] = useState(false)
  const startFrac = dayFraction(flight.block_time_start)
  const endFrac   = dayFraction(flight.block_time_end)
  const left  = startFrac * containerWidth * zoomLevel
  const width = Math.max((endFrac - startFrac) * containerWidth * zoomLevel, 4)
  const isArr = flight.operation === 'arrival'
  
  let color, bg
  if (isConflict) {
    color = 'var(--rose)'
    bg = 'var(--rose-dim)'
  } else if (flight.status === 'delayed') {
    color = 'var(--amber)'
    bg = 'var(--amber-dim)'
  } else if (flight.status === 'early') {
    color = 'var(--accent)'
    bg = 'var(--accent-dim)'
  } else {
    color = isArr ? 'var(--green)' : 'var(--accent)'
    bg = isArr ? 'var(--green-dim)' : 'var(--accent-dim)'
  }

  return (
    <g
      style={{ 
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.7 : (isHovered ? 1 : 0.9)
      }}
      onClick={() => !isDragging && onClick(flight)}
      onMouseDown={(e) => onDragStart(flight, e)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      aria-label={`${flight.flight_number} ${flight.airline} ${fmtTime(flight.block_time_start)}–${fmtTime(flight.block_time_end)}`}
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
          strokeWidth: isConflict ? 2 : (isHovered ? 2 : 1),
          opacity: 0.9,
          filter: isConflict ? 'drop-shadow(0 0 4px var(--rose))' : (isHovered ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none')
        }}
      />
      
      {/* Hover tooltip */}
      {isHovered && (
        <g>
          <rect
            x={left + width + 5}
            y={(ROW_H - BAR_HEIGHT) / 2 - 30}
            width={120}
            height={60}
            rx={4}
            fill="var(--bg-surface)"
            stroke="var(--border-bright)"
            strokeWidth={1}
            style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
          />
          <text x={left + width + 10} y={(ROW_H - BAR_HEIGHT) / 2 - 15} style={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: 'var(--text)', fontWeight: '600' }}>
            {flight.flight_number}
          </text>
          <text x={left + width + 10} y={(ROW_H - BAR_HEIGHT) / 2 - 3} style={{ fontSize: 8, fontFamily: 'JetBrains Mono', fill: 'var(--text-muted)' }}>
            {flight.airline}
          </text>
          <text x={left + width + 10} y={(ROW_H - BAR_HEIGHT) / 2 + 9} style={{ fontSize: 8, fontFamily: 'JetBrains Mono', fill: 'var(--text-muted)' }}>
            {flight.origin} → {flight.destination}
          </text>
          <text x={left + width + 10} y={(ROW_H - BAR_HEIGHT) / 2 + 21} style={{ fontSize: 8, fontFamily: 'JetBrains Mono', fill: color }}>
            {flight.status.replace('_', ' ').toUpperCase()}
          </text>
        </g>
      )}
      {width > 60 * zoomLevel && (
        <g>
          <text
            x={left + 6}
            y={ROW_H / 2}
            style={{ 
              fontSize: Math.max(9 * zoomLevel, 7), 
              fontFamily: 'JetBrains Mono', 
              fill: color, 
              pointerEvents: 'none',
              fontWeight: '600'
            }}
          >
            {flight.flight_number}
          </text>
          <text
            x={left + 6}
            y={ROW_H / 2 + 12}
            style={{ 
              fontSize: Math.max(7 * zoomLevel, 6), 
              fontFamily: 'JetBrains Mono', 
              fill: color, 
              pointerEvents: 'none',
              opacity: 0.8
            }}
          >
            {flight.airline.split(' ')[0]} {/* First word of airline */}
          </text>
        </g>
      )}
      {width > 40 * zoomLevel && width <= 60 * zoomLevel && (
        <text
          x={left + 6}
          y={ROW_H / 2 + 4}
          style={{ 
            fontSize: Math.max(8 * zoomLevel, 7), 
            fontFamily: 'JetBrains Mono', 
            fill: color, 
            pointerEvents: 'none' 
          }}
        >
          {flight.flight_number}
        </text>
      )}
    </g>
  )
}

export default function Timeline() {
  const scrollRef = useRef(null)
  const [selectedFlight, setSelectedFlight] = useState(null)
  const [dragState, setDragState] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [stands, setStands] = useState([])

  const fetcher = useCallback(() => getFlights({ sort: 'scheduled_time', order: 'asc', per_page: 50 }), [])
  const { data, loading, error, refetch } = useFetch(fetcher, [])

  // Load stands data
  useEffect(() => {
    getStands().then(setStands).catch(console.error)
  }, [])

  const flights = data?.data ?? []
  const rows = groupByStand(flights)
  const terminalGroups = groupByTerminal(rows)
  const conflicts = checkConflicts(flights)

  const totalH = rows.length * ROW_H + Object.keys(terminalGroups).length * 30 // Add space for terminal headers
  const SVG_W = 1400 * zoomLevel
  const INNER_W = (1400 - LEFT_W) * zoomLevel

  const handleDragStart = (flight, event) => {
    const rect = event.currentTarget.closest('svg').getBoundingClientRect()
    setDragState({
      flight,
      startX: event.clientX - rect.left,
      startY: event.clientY - rect.top,
      originalStand: flight.assigned_stand
    })
  }

  const handleMouseMove = (event) => {
    if (!dragState) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Update drag state with current position
    setDragState(prev => ({
      ...prev,
      currentX: x,
      currentY: y
    }))
  }

  const handleMouseUp = async (event) => {
    if (!dragState) return
    
    try {
      const rect = event.currentTarget.closest('svg').getBoundingClientRect()
      const y = event.clientY - rect.top - HEADER_H
      
      // Account for terminal groupings in the layout
      let currentRowY = 0
      const terminalGroups = groupByTerminal(rows)
      let targetStand = null
      
      for (const [terminal, terminalRows] of Object.entries(terminalGroups)) {
        currentRowY += 30 // Terminal header height
        
        for (let i = 0; i < terminalRows.length; i++) {
          const rowTop = currentRowY + i * ROW_H
          const rowBottom = rowTop + ROW_H
          
          if (y >= rowTop && y < rowBottom) {
            targetStand = terminalRows[i][0]
            break
          }
        }
        
        if (targetStand) break
        currentRowY += terminalRows.length * ROW_H
      }
      
      if (targetStand && targetStand !== dragState.originalStand) {
        console.log('Reassigning flight', dragState.flight.flight_number, 'to stand', targetStand)
        await reassignFlight(dragState.flight.id, targetStand)
        await refetch()
      }
    } catch (error) {
      console.error('Failed to reassign flight:', error)
      const errorMessage = error?.detail?.error || error?.message || 'Unknown error occurred'
      alert(`Failed to reassign flight: ${errorMessage}`)
    }
    
    setDragState(null)
  }

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.5, 4))
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.5, 0.5))
  const handleResetZoom = () => setZoomLevel(1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              {rows.length} stands · {flights.length} flights · 00:00 – 24:00 UTC
            </span>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'On Time', color: 'var(--green)' },
                { label: 'Delayed', color: 'var(--amber)' },
                { label: 'Early',   color: 'var(--accent)' },
                { label: 'Conflict', color: 'var(--rose)' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, display: 'inline-block' }} />
                  <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Zoom Controls */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Zoom: {Math.round(zoomLevel * 100)}%
            </span>
            <button onClick={handleZoomOut} style={{ 
              padding: '4px 8px', 
              background: 'var(--bg-surface)', 
              border: '1px solid var(--border)',
              color: 'var(--text)',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}>−</button>
            <button onClick={handleResetZoom} style={{ 
              padding: '4px 8px', 
              background: 'var(--bg-surface)', 
              border: '1px solid var(--border)',
              color: 'var(--text)',
              borderRadius: '4px',
              fontSize: '10px',
              cursor: 'pointer'
            }}>Reset</button>
            <button onClick={handleZoomIn} style={{ 
              padding: '4px 8px', 
              background: 'var(--bg-surface)', 
              border: '1px solid var(--border)',
              color: 'var(--text)',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}>+</button>
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
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setDragState(null)}
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
                    style={{ fontSize: Math.max(9 * zoomLevel, 7), fontFamily: 'JetBrains Mono', fill: 'var(--text-muted)' }}
                  >
                    {h.toString().padStart(2, '0')}:00
                  </text>
                </g>
              )
            })}

            {/* Terminal Groups and Rows */}
            {(() => {
              let currentY = HEADER_H
              const terminalColors = { T1: '#3b82f6', T2: '#f59e0b', T3: '#10b981' }
              
              return Object.entries(terminalGroups).map(([terminal, terminalRows]) => (
                <g key={terminal}>
                  {/* Terminal Header */}
                  <rect
                    x={0} y={currentY} width={SVG_W} height={25}
                    fill={terminalColors[terminal]}
                    opacity={0.1}
                  />
                  <text
                    x={8}
                    y={currentY + 16}
                    style={{ fontSize: 12, fontFamily: 'JetBrains Mono', fill: terminalColors[terminal], fontWeight: 'bold' }}
                  >
                    {terminal}
                  </text>
                  
                  {(() => {
                    currentY += 30
                    return terminalRows.map(([standId, standFlights], rowIdx) => {
                      const y = currentY + rowIdx * ROW_H
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
                                containerWidth={1400 - LEFT_W}
                                zoomLevel={zoomLevel}
                                onClick={setSelectedFlight}
                                onDragStart={handleDragStart}
                                isConflict={conflicts.has(f.id)}
                                isDragging={dragState?.flight.id === f.id}
                              />
                            ))}
                          </g>
                        </g>
                      )
                    })
                  })()}
                  
                  {(() => { currentY += terminalRows.length * ROW_H; return null })()}
                </g>
              ))
            })()}

            {/* Current-time marker */}
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

            {/* Drag Preview */}
            {dragState && (
              <g transform={`translate(${dragState.currentX || dragState.startX}, ${dragState.currentY || dragState.startY})`}>
                <rect
                  x={-20} y={-10} width={40} height={20} rx={4}
                  fill="var(--accent-dim)" stroke="var(--accent)" strokeWidth={1}
                  opacity={0.8}
                />
                <text
                  x={0} y={4}
                  textAnchor="middle"
                  style={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: 'var(--accent)' }}
                >
                  {dragState.flight.flight_number}
                </text>
              </g>
            )}
          </svg>
        </div>
      )}

      {/* Flight Detail Panel */}
      {selectedFlight && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          width: '320px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-bright)',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '16px' }}>{selectedFlight.flight_number}</h3>
            <button 
              onClick={() => setSelectedFlight(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'grid', gap: '8px', fontSize: '13px', fontFamily: 'JetBrains Mono' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Airline:</span> {selectedFlight.airline}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Aircraft:</span> {selectedFlight.aircraft_type}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Route:</span> {selectedFlight.origin} → {selectedFlight.destination}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Stand:</span> {selectedFlight.assigned_stand}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Block Time:</span> {fmtTime(selectedFlight.block_time_start)} - {fmtTime(selectedFlight.block_time_end)}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> 
              <span style={{ color: STATUS_META[selectedFlight.status]?.color || 'var(--text)' }}>
                {selectedFlight.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div><span style={{ color: 'var(--text-muted)' }}>Passengers:</span> {selectedFlight.pax_count}</div>
          </div>
        </div>
      )}
    </div>
  )
}
