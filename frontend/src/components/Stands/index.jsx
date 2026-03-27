import { useState, useCallback } from 'react'
import { getStands, getStandSchedule, reassignFlight, getFlights } from '../../api'
import { useFetch } from '../../hooks/useFetch'
import { fmtTime } from '../../utils'
import { Badge, OpBadge, LoadingScreen, EmptyState, ErrorBanner, Spinner } from '../ui'
import { GitBranch, ChevronRight, X, AlertTriangle } from 'lucide-react'

function StandCard({ stand, onSelect, selected }) {
  const isActive = selected?.id === stand.id

  return (
    <button
      onClick={() => onSelect(stand)}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '10px 12px',
        borderRadius: 8,
        cursor: 'pointer',
        background: isActive ? 'var(--accent-dim)' : 'var(--bg-raised)',
        border: `1px solid ${isActive ? 'rgba(56,189,248,0.3)' : 'var(--border)'}`,
        transition: 'all 0.14s',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="font-mono font-medium" style={{ fontSize: 13, color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
          {stand.id}
        </span>
        {stand.is_occupied && (
          <span
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--rose)',
              boxShadow: '0 0 6px var(--rose)',
            }}
          />
        )}
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <span className="badge badge-blue" style={{ fontSize: 9 }}>{stand.terminal}</span>
        <span className="badge" style={{ fontSize: 9, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          {stand.type}
        </span>
        <span className="badge" style={{ fontSize: 9, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          MAX {stand.max_aircraft_size}
        </span>
        {stand.has_plb && (
          <span className="badge badge-green" style={{ fontSize: 9 }}>PLB</span>
        )}
      </div>
      {stand.current_flight && (
        <div className="font-mono" style={{ fontSize: 10, color: 'var(--rose)' }}>
          ● {stand.current_flight}
        </div>
      )}
    </button>
  )
}

function ReassignModal({ flight, stands, onClose, onSuccess }) {
  const [targetId, setTargetId] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  async function handleReassign() {
    if (!targetId) return
    setLoading(true)
    setError(null)
    try {
      await reassignFlight(flight.id, targetId)
      onSuccess()
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const eligible = stands.filter(s =>
    s.id !== flight.assigned_stand &&
    ['A','B','C','D','E','F'].indexOf(flight.aircraft_size) <=
    ['A','B','C','D','E','F'].indexOf(s.max_aircraft_size)
  )

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(8,12,20,0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-bright)',
          borderRadius: 12,
          padding: 24,
          width: 420,
          maxHeight: '80vh',
          display: 'flex', flexDirection: 'column', gap: 16,
          animation: 'slideUp 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 className="font-display font-semibold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Reassign Flight</h2>
            <p className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>{flight.flight_number}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 6, background: 'var(--amber-dim)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <AlertTriangle size={12} style={{ color: 'var(--amber)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--amber)' }}>
            Currently at <strong>{flight.assigned_stand}</strong>. Aircraft size: <strong>{flight.aircraft_size}</strong>
          </span>
        </div>

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            Compatible stands ({eligible.length}):
          </p>
          {eligible.map(s => (
            <button
              key={s.id}
              onClick={() => setTargetId(s.id)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: targetId === s.id ? 'var(--accent-dim)' : 'var(--bg-surface)',
                border: `1px solid ${targetId === s.id ? 'rgba(56,189,248,0.4)' : 'var(--border)'}`,
                color: targetId === s.id ? 'var(--accent)' : 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                textAlign: 'left',
                transition: 'all 0.12s',
              }}
            >
              <span className="font-mono text-sm">{s.id}</span>
              <div style={{ display: 'flex', gap: 5 }}>
                <span className="badge" style={{ fontSize: 9, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {s.terminal}
                </span>
                <span className="badge" style={{ fontSize: 9, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  MAX {s.max_aircraft_size}
                </span>
                {s.is_occupied && (
                  <span className="badge badge-rose" style={{ fontSize: 9 }}>OCCUPIED</span>
                )}
              </div>
            </button>
          ))}
          {eligible.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
              No compatible stands available
            </p>
          )}
        </div>

        {error && <ErrorBanner error={error} />}

        <button
          onClick={handleReassign}
          disabled={!targetId || loading}
          style={{
            padding: '9px 16px',
            borderRadius: 7,
            cursor: (!targetId || loading) ? 'not-allowed' : 'pointer',
            background: (!targetId || loading) ? 'var(--bg-surface)' : 'var(--accent)',
            border: 'none',
            color: (!targetId || loading) ? 'var(--text-muted)' : 'var(--bg-base)',
            fontFamily: 'Syne',
            fontWeight: 700,
            fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.15s',
          }}
        >
          {loading ? <><Spinner size={14} /> Reassigning…</> : `Assign to ${targetId || '…'}`}
        </button>
      </div>
    </div>
  )
}

function StandSchedulePanel({ stand, onClose }) {
  const [reassignFlight_, setReassignFlight] = useState(null)
  const fetcher = useCallback(() => getStandSchedule(stand.id), [stand.id])
  const { data: schedule, loading, error, refetch } = useFetch(fetcher, [stand.id])

  const standsFetcher = useCallback(() => getStands(), [])
  const { data: allStands } = useFetch(standsFetcher, [])
  const stands = allStands ?? []

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div>
          <span className="font-display font-semibold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
            Stand {stand.id}
          </span>
          <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
            <span className="badge badge-blue" style={{ fontSize: 9 }}>{stand.terminal}</span>
            <span className="badge" style={{ fontSize: 9, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {stand.type.toUpperCase()}
            </span>
            <span className="badge" style={{ fontSize: 9, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              MAX {stand.max_aircraft_size}
            </span>
            {stand.has_plb && <span className="badge badge-green" style={{ fontSize: 9 }}>PLB</span>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={15} />
        </button>
      </div>

      {error && <div style={{ padding: '8px 16px' }}><ErrorBanner error={error} /></div>}

      {loading ? (
        <LoadingScreen label="LOADING SCHEDULE…" />
      ) : (schedule ?? []).length === 0 ? (
        <EmptyState icon="🛫" title="No flights assigned" subtitle="This stand has no scheduled flights" />
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
            SCHEDULED FLIGHTS · {schedule.length} total
          </p>
          {schedule.map(f => (
            <div
              key={f.id}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="font-mono font-medium" style={{ fontSize: 13, color: 'var(--accent)' }}>{f.flight_number}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <OpBadge operation={f.operation} />
                  <Badge status={f.status} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{f.airline}</span>
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.aircraft_type}</span>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>BLOCK</div>
                  <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
                    {fmtTime(f.block_time_start)} – {fmtTime(f.block_time_end)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 1 }}>ROUTE</div>
                  <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
                    {f.origin} → {f.destination}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setReassignFlight(f)}
                style={{
                  marginTop: 2, padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono',
                  display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content',
                  transition: 'all 0.12s',
                }}
              >
                <GitBranch size={10} />
                Reassign
              </button>
            </div>
          ))}
        </div>
      )}

      {reassignFlight_ && (
        <ReassignModal
          flight={reassignFlight_}
          stands={stands}
          onClose={() => setReassignFlight(null)}
          onSuccess={() => { setReassignFlight(null); refetch() }}
        />
      )}
    </div>
  )
}

export default function StandsPage() {
  const [terminal, setTerminal]   = useState('')
  const [selected, setSelected]   = useState(null)

  const fetcher = useCallback(() => getStands({ terminal }), [terminal])
  const { data: stands, loading, error } = useFetch(fetcher, [terminal])

  const standsArr = stands ?? []
  const occupied  = standsArr.filter(s => s.is_occupied).length

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Left: stand list */}
      <div
        style={{
          width: 260,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border)',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {/* Toolbar */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['', 'T1', 'T2'].map(t => (
              <button
                key={t}
                onClick={() => { setTerminal(t); setSelected(null) }}
                style={{
                  padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11,
                  fontFamily: 'JetBrains Mono',
                  background: terminal === t ? 'var(--accent-dim)' : 'transparent',
                  border: `1px solid ${terminal === t ? 'rgba(56,189,248,0.3)' : 'var(--border)'}`,
                  color: terminal === t ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {t || 'All'}
              </button>
            ))}
          </div>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
            {standsArr.length} stands · <span style={{ color: 'var(--rose)' }}>{occupied} occupied</span>
          </div>
        </div>

        {error && <div style={{ padding: '8px 12px' }}><ErrorBanner error={error} /></div>}

        {loading ? (
          <LoadingScreen label="LOADING STANDS…" />
        ) : standsArr.length === 0 ? (
          <EmptyState icon="🏗" title="No stands" />
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {standsArr.map(s => (
              <StandCard key={s.id} stand={s} onSelect={setSelected} selected={selected} />
            ))}
          </div>
        )}
      </div>

      {/* Right: schedule panel or placeholder */}
      {selected ? (
        <StandSchedulePanel stand={selected} onClose={() => setSelected(null)} />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <GitBranch size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p className="font-display font-semibold" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Select a stand</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>View schedule and manage assignments</p>
          </div>
        </div>
      )}
    </div>
  )
}
