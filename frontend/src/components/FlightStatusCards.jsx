import { useCallback } from 'react'
import { getFlightStatusMetrics } from '../api'
import { useFetch } from '../hooks/useFetch'
import { LoadingScreen, ErrorBanner } from './ui'
import { TrendingUp, TrendingDown, Minus, Users, MapPin, Clock, AlertTriangle, RefreshCw } from 'lucide-react'

function MetricCard({ icon: Icon, title, children, accent = false }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.target.style.borderColor = accent ? 'rgba(56,189,248,0.3)' : 'var(--border)'
        e.target.style.background = 'var(--bg-raised)'
      }}
      onMouseLeave={(e) => {
        e.target.style.borderColor = 'var(--border)'
        e.target.style.background = 'var(--bg-surface)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'var(--accent-dim)',
            border: '1px solid rgba(56,189,248,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)',
          }}
        >
          <Icon size={18} />
        </div>
        <div>
          <h3
            className="font-display font-semibold"
            style={{ color: 'var(--text-primary)', fontSize: '14px', margin: 0, lineHeight: '1.2' }}
          >
            {title}
          </h3>
        </div>
      </div>
      <div>{children}</div>
    </div>
  )
}

function TrendIndicator({ trend, previous, current }) {
  if (trend === 'stable' || !previous) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
        <Minus size={10} />
        <span className="font-mono">No change</span>
      </div>
    )
  }

  const isUp = trend === 'up'
  const TrendIcon = isUp ? TrendingUp : TrendingDown
  const change = Math.abs(current - previous).toFixed(1)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        color: isUp ? 'var(--green)' : 'var(--rose)',
      }}
    >
      <TrendIcon size={10} />
      <span className="font-mono">{isUp ? '+' : '-'}{change}%</span>
    </div>
  )
}

export default function FlightStatusCards() {
  const fetcher = useCallback(() => getFlightStatusMetrics(), [])
  const { data: metrics, loading, error, refetch } = useFetch(fetcher, [])

  if (loading) {
    return (
      <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <LoadingScreen label="LOADING METRICS…" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px' }}>
        <ErrorBanner error={error} />
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={refetch}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono',
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              border: '1px solid rgba(56,189,248,0.3)',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return null
  }

  const {
    on_time_performance: otp,
    stand_utilization: util,
    upcoming_arrivals: arrivals,
    active_alerts: alerts,
  } = metrics

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1
            className="font-display font-bold"
            style={{ color: 'var(--text-primary)', fontSize: '24px', margin: '0 0 8px 0' }}
          >
            Flight Status Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Real-time operational metrics and performance indicators
          </p>
        </div>
        
        <button
          onClick={refetch}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'JetBrains Mono',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.target.style.background = 'var(--accent-dim)'
            e.target.style.color = 'var(--accent)'
            e.target.style.borderColor = 'rgba(56,189,248,0.3)'
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'var(--bg-raised)'
            e.target.style.color = 'var(--text-secondary)'
            e.target.style.borderColor = 'var(--border)'
          }}
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {/* On-Time Performance */}
        <MetricCard icon={Clock} title="On-Time Performance" accent>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
              <span
                className="font-mono font-bold"
                style={{ color: 'var(--text-primary)', fontSize: '32px', lineHeight: '1' }}
              >
                {otp.current}
              </span>
              <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>%</span>
            </div>
            <TrendIndicator trend={otp.trend} previous={otp.previous} current={otp.current} />
            {otp.previous && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Previous: {otp.previous}%
              </div>
            )}
          </div>
        </MetricCard>

        {/* Stand Utilization */}
        <MetricCard icon={MapPin} title="Stand Utilization">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                  <span
                    className="font-mono font-bold"
                    style={{ color: 'var(--text-primary)', fontSize: '24px', lineHeight: '1' }}
                  >
                    {util.occupied}/{util.total}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>stands</span>
                </div>
                <div className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  {util.percentage}% occupied
                </div>
              </div>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono',
                  fontWeight: 'bold',
                  background: util.percentage > 80 
                    ? 'rgba(251,113,133,0.15)' 
                    : util.percentage > 60 
                      ? 'rgba(251,191,36,0.15)' 
                      : 'rgba(74,222,128,0.15)',
                  color: util.percentage > 80 
                    ? 'var(--rose)' 
                    : util.percentage > 60 
                      ? 'var(--amber)' 
                      : 'var(--green)',
                }}
              >
                {util.percentage}%
              </div>
            </div>
          </div>
        </MetricCard>

        {/* Upcoming Arrivals */}
        <MetricCard icon={Users} title="Upcoming Arrivals">
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
              <span
                className="font-mono font-bold"
                style={{ color: 'var(--text-primary)', fontSize: '32px', lineHeight: '1' }}
              >
                {arrivals.total}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>flights</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Next 2 hours
            </div>
            
            {arrivals.total > 0 ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <div
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 4px',
                    borderRadius: '6px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="font-mono font-bold" style={{ color: 'var(--green)', fontSize: '16px' }}>
                    {arrivals.on_time}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>On-time</div>
                </div>
                <div
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 4px',
                    borderRadius: '6px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="font-mono font-bold" style={{ color: 'var(--amber)', fontSize: '16px' }}>
                    {arrivals.delayed}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Delayed</div>
                </div>
                <div
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 4px',
                    borderRadius: '6px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="font-mono font-bold" style={{ color: 'var(--accent)', fontSize: '16px' }}>
                    {arrivals.early}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Early</div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '16px',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                }}
              >
                No upcoming arrivals
              </div>
            )}
          </div>
        </MetricCard>

        {/* Active Alerts */}
        <MetricCard icon={AlertTriangle} title="Active Alerts">
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
              <span
                className="font-mono font-bold"
                style={{ color: 'var(--text-primary)', fontSize: '32px', lineHeight: '1' }}
              >
                {alerts.total}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>alerts</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Requires attention
            </div>

            {alerts.total > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {alerts.critical > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      background: 'rgba(251,113,133,0.1)',
                      border: '1px solid rgba(251,113,133,0.2)',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: 'var(--rose)' }}>Critical</span>
                    <span className="font-mono font-bold" style={{ fontSize: '12px', color: 'var(--rose)' }}>
                      {alerts.critical}
                    </span>
                  </div>
                )}
                {alerts.warning > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      background: 'rgba(251,191,36,0.1)',
                      border: '1px solid rgba(251,191,36,0.2)',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: 'var(--amber)' }}>Warning</span>
                    <span className="font-mono font-bold" style={{ fontSize: '12px', color: 'var(--amber)' }}>
                      {alerts.warning}
                    </span>
                  </div>
                )}
                {alerts.info > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      background: 'rgba(56,189,248,0.1)',
                      border: '1px solid rgba(56,189,248,0.2)',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: 'var(--accent)' }}>Info</span>
                    <span className="font-mono font-bold" style={{ fontSize: '12px', color: 'var(--accent)' }}>
                      {alerts.info}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '16px',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                }}
              >
                No active alerts
              </div>
            )}
          </div>
        </MetricCard>
      </div>
    </div>
  )
}