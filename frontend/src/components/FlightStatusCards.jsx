import { useCallback, useState, useEffect } from 'react'
import { getFlightStatusMetrics } from '../api'
import { useFetch } from '../hooks/useFetch'
import { LoadingScreen, ErrorBanner } from './ui'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Users, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  RefreshCw,
  Plane,
  Activity,
  Timer,
  CheckCircle
} from 'lucide-react'

function MetricCard({ icon: Icon, title, subtitle, children, accent = false, status = 'normal' }) {
  const getStatusColor = () => {
    switch (status) {
      case 'success': return { bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.2)', icon: '#22c55e' }
      case 'warning': return { bg: 'rgba(251, 191, 36, 0.08)', border: 'rgba(251, 191, 36, 0.2)', icon: '#fbbf24' }
      case 'danger': return { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)', icon: '#ef4444' }
      default: return { bg: 'var(--accent-dim)', border: 'rgba(56,189,248,0.2)', icon: 'var(--accent)' }
    }
  }

  const statusColors = getStatusColor()

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        transition: 'all 0.3s ease',
        width: '100%',
        height: 'auto',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = 'translateY(-2px)'
        e.target.style.boxShadow = '0 8px 25px 0 rgba(0, 0, 0, 0.1)'
        e.target.style.borderColor = accent ? statusColors.border : 'var(--border)'
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0)'
        e.target.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
        e.target.style.borderColor = 'var(--border)'
      }}
    >
      {/* Background Pattern */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '100px',
          height: '100px',
          background: `linear-gradient(135deg, ${statusColors.bg} 0%, transparent 70%)`,
          borderRadius: '0 16px 0 100px',
        }}
      />
      
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: statusColors.bg,
              border: `1px solid ${statusColors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: statusColors.icon,
            }}
          >
            <Icon size={22} />
          </div>
          <div>
            <h3
              className="font-display font-semibold"
              style={{ color: 'var(--text-primary)', fontSize: '16px', margin: 0, lineHeight: '1.2' }}
            >
              {title}
            </h3>
            {subtitle && (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

function TrendIndicator({ trend, previous, current, label }) {
  if (trend === 'stable' || !previous) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
        <Minus size={12} />
        <span className="font-mono">{label || 'No change'}</span>
      </div>
    )
  }

  const isUp = trend === 'up'
  const TrendIcon = isUp ? TrendingUp : TrendingDown
  const change = Math.abs(current - (previous || 0)).toFixed(1)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: isUp ? 'var(--green)' : 'var(--rose)',
        padding: '4px 8px',
        borderRadius: '6px',
        background: isUp ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      }}
    >
      <TrendIcon size={12} />
      <span className="font-mono">{isUp ? '+' : '-'}{change}% vs last period</span>
    </div>
  )
}

function ProgressBar({ value, max, color = 'var(--accent)', height = 6 }) {
  const percentage = Math.min((value / max) * 100, 100)
  
  return (
    <div
      style={{
        width: '100%',
        height: height,
        background: 'var(--bg-raised)',
        borderRadius: height / 2,
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          width: `${percentage}%`,
          height: '100%',
          background: color,
          borderRadius: height / 2,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  )
}

function MiniChart({ data, color = 'var(--accent)' }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  
  return (
    <div style={{ display: 'flex', alignItems: 'end', gap: '2px', height: '30px', width: '60px' }}>
      {data.map((value, index) => {
        const height = ((value - min) / (max - min || 1)) * 24 + 4
        return (
          <div
            key={index}
            style={{
              width: '6px',
              height: `${height}px`,
              background: color,
              borderRadius: '2px',
              opacity: 0.7 + (index / data.length) * 0.3,
            }}
          />
        )
      })}
    </div>
  )
}

export default function FlightStatusCards() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  
  const fetcher = useCallback(() => getFlightStatusMetrics(), [])
  const { data: metrics, loading, error, refetch } = useFetch(fetcher, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setLastUpdated(new Date())
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch()
      setLastUpdated(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [refetch])

  if (loading && !metrics) {
    return (
      <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
        <LoadingScreen label="LOADING METRICS…" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '60px' }}>
        <ErrorBanner error={error} />
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={handleRefresh}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'JetBrains Mono',
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              border: '1px solid rgba(56,189,248,0.3)',
              cursor: 'pointer',
            }}
          >
            Retry Connection
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

  // Calculate status for each metric
  const getOTPStatus = (performance) => {
    if (performance >= 85) return 'success'
    if (performance >= 70) return 'warning'
    return 'danger'
  }

  const getUtilizationStatus = (percentage) => {
    if (percentage <= 70) return 'success'
    if (percentage <= 85) return 'warning'
    return 'danger'
  }

  const getAlertsStatus = (alerts) => {
    if (alerts.critical > 0) return 'danger'
    if (alerts.warning > 0) return 'warning'
    return 'success'
  }

  return (
    <div style={{ padding: '40px', height: '100%', overflow: 'auto', width: '100%' }}>
      {/* Enhanced Header */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1
              className="font-display font-bold"
              style={{ color: 'var(--text-primary)', fontSize: '32px', margin: '0 0 8px 0' }}
            >
              Flight Operations Dashboard
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', margin: '0 0 8px 0' }}>
              Real-time operational metrics and performance indicators
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <Activity size={14} />
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              <span>•</span>
              <span>Auto-refresh: 30s</span>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 18px',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: 'JetBrains Mono',
              background: isRefreshing ? 'var(--bg-raised)' : 'var(--accent-dim)',
              border: `1px solid ${isRefreshing ? 'var(--border)' : 'rgba(56,189,248,0.3)'}`,
              color: isRefreshing ? 'var(--text-muted)' : 'var(--accent)',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isRefreshing ? 0.7 : 1,
            }}
          >
            <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Quick Stats Bar */}
        <div style={{ 
          display: 'flex', 
          gap: '24px', 
          padding: '16px 20px',
          background: 'var(--bg-raised)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} style={{ color: 'var(--green)' }} />
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              System Status: <strong style={{ color: 'var(--green)' }}>Operational</strong>
            </span>
          </div>
          <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plane size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Active Flights: <strong>24</strong>
            </span>
          </div>
          <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Timer size={16} style={{ color: 'var(--amber)' }} />
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Peak Hours: <strong>14:00-18:00</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Metric Cards Grid */}
      <div
        className="dashboard-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '28px',
          marginBottom: '48px',
          width: '100%',
        }}
      >
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @media (max-width: 1400px) {
            .dashboard-grid {
              grid-template-columns: 1fr 1fr !important;
              gap: 24px !important;
            }
          }
          @media (max-width: 768px) {
            .dashboard-grid {
              grid-template-columns: 1fr !important;
              gap: 20px !important;
            }
          }
        `}</style>

        {/* Enhanced On-Time Performance */}
        <MetricCard 
          icon={Clock} 
          title="On-Time Performance" 
          subtitle="Flight punctuality rate"
          accent 
          status={getOTPStatus(otp.current)}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span
                  className="font-mono font-bold"
                  style={{ color: 'var(--text-primary)', fontSize: '40px', lineHeight: '1' }}
                >
                  {otp.current}
                </span>
                <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '16px' }}>%</span>
              </div>
              <MiniChart data={[78, 82, 79, 85, 83, 87, otp.current]} color="var(--accent)" />
            </div>
            
            <ProgressBar 
              value={otp.current} 
              max={100} 
              color={otp.current >= 85 ? 'var(--green)' : otp.current >= 70 ? 'var(--amber)' : 'var(--rose)'}
            />
            
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <TrendIndicator trend={otp.trend} previous={otp.previous} current={otp.current} />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Target: 85%
              </div>
            </div>

            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-raised)', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Today's Breakdown</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--green)' }}>On-time: 18</span>
                <span style={{ color: 'var(--amber)' }}>Delayed: 4</span>
                <span style={{ color: 'var(--accent)' }}>Early: 2</span>
              </div>
            </div>
          </div>
        </MetricCard>

        {/* Enhanced Stand Utilization */}
        <MetricCard 
          icon={MapPin} 
          title="Stand Utilization" 
          subtitle="Current occupancy rate"
          status={getUtilizationStatus(util.percentage)}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                  <span
                    className="font-mono font-bold"
                    style={{ color: 'var(--text-primary)', fontSize: '32px', lineHeight: '1' }}
                  >
                    {util.occupied}/{util.total}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>stands</span>
                </div>
                <div className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  {util.percentage}% occupied
                </div>
              </div>
              
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontFamily: 'JetBrains Mono',
                  fontWeight: 'bold',
                  background: util.percentage > 85 
                    ? 'rgba(239, 68, 68, 0.15)' 
                    : util.percentage > 70 
                      ? 'rgba(251, 191, 36, 0.15)' 
                      : 'rgba(34, 197, 94, 0.15)',
                  color: util.percentage > 85 
                    ? 'var(--rose)' 
                    : util.percentage > 70 
                      ? 'var(--amber)' 
                      : 'var(--green)',
                  border: `3px solid ${util.percentage > 85 
                    ? 'rgba(239, 68, 68, 0.3)' 
                    : util.percentage > 70 
                      ? 'rgba(251, 191, 36, 0.3)' 
                      : 'rgba(34, 197, 94, 0.3)'}`,
                }}
              >
                {util.percentage}%
              </div>
            </div>

            <ProgressBar 
              value={util.occupied} 
              max={util.total} 
              color={util.percentage > 85 ? 'var(--rose)' : util.percentage > 70 ? 'var(--amber)' : 'var(--green)'}
            />

            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <div style={{ padding: '8px', background: 'var(--bg-raised)', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ color: 'var(--green)', fontWeight: 'bold' }}>Contact</div>
                <div style={{ color: 'var(--text-muted)' }}>6/7 stands</div>
              </div>
              <div style={{ padding: '8px', background: 'var(--bg-raised)', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Remote</div>
                <div style={{ color: 'var(--text-muted)' }}>1/3 stands</div>
              </div>
            </div>
          </div>
        </MetricCard>

        {/* Enhanced Upcoming Arrivals */}
        <MetricCard 
          icon={Users} 
          title="Upcoming Arrivals" 
          subtitle="Next 2 hours forecast"
          status={arrivals.delayed > arrivals.on_time ? 'warning' : 'success'}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span
                  className="font-mono font-bold"
                  style={{ color: 'var(--text-primary)', fontSize: '40px', lineHeight: '1' }}
                >
                  {arrivals.total}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>flights</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plane size={16} style={{ color: 'var(--accent)', transform: 'rotate(-45deg)' }} />
              </div>
            </div>
            
            {arrivals.total > 0 ? (
              <>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                  <div
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '12px 8px',
                      borderRadius: '8px',
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                    }}
                  >
                    <div className="font-mono font-bold" style={{ color: 'var(--green)', fontSize: '20px' }}>
                      {arrivals.on_time}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>On-time</div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '12px 8px',
                      borderRadius: '8px',
                      background: 'rgba(251, 191, 36, 0.1)',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                    }}
                  >
                    <div className="font-mono font-bold" style={{ color: 'var(--amber)', fontSize: '20px' }}>
                      {arrivals.delayed}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Delayed</div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '12px 8px',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                    }}
                  >
                    <div className="font-mono font-bold" style={{ color: 'var(--accent)', fontSize: '20px' }}>
                      {arrivals.early}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Early</div>
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-raised)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Next Arrival</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>SQ321</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Singapore Airlines</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>
                        14:45
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--green)' }}>On-time</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '32px 16px',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                }}
              >
                No upcoming arrivals
              </div>
            )}
          </div>
        </MetricCard>

        {/* Enhanced Active Alerts */}
        <MetricCard 
          icon={AlertTriangle} 
          title="Active Alerts" 
          subtitle="Operational notifications"
          status={getAlertsStatus(alerts)}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span
                  className="font-mono font-bold"
                  style={{ color: 'var(--text-primary)', fontSize: '40px', lineHeight: '1' }}
                >
                  {alerts.total}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>alerts</span>
              </div>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: alerts.critical > 0 ? 'var(--rose)' : alerts.warning > 0 ? 'var(--amber)' : 'var(--green)',
                  animation: alerts.critical > 0 ? 'pulse 2s infinite' : 'none',
                }}
              />
            </div>

            {alerts.total > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {alerts.critical > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={14} style={{ color: 'var(--rose)' }} />
                      <span style={{ fontSize: '13px', color: 'var(--rose)', fontWeight: 'semibold' }}>Critical</span>
                    </div>
                    <span className="font-mono font-bold" style={{ fontSize: '16px', color: 'var(--rose)' }}>
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
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(251, 191, 36, 0.1)',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={14} style={{ color: 'var(--amber)' }} />
                      <span style={{ fontSize: '13px', color: 'var(--amber)', fontWeight: 'semibold' }}>Warning</span>
                    </div>
                    <span className="font-mono font-bold" style={{ fontSize: '16px', color: 'var(--amber)' }}>
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
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={14} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 'semibold' }}>Info</span>
                    </div>
                    <span className="font-mono font-bold" style={{ fontSize: '16px', color: 'var(--accent)' }}>
                      {alerts.info}
                    </span>
                  </div>
                )}

                <div style={{ marginTop: '12px', padding: '10px', background: 'var(--bg-raised)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Latest Alert</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    QR501 delay - Gate conflict at A1-01
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    2 minutes ago
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '32px 16px',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  textAlign: 'center',
                }}
              >
                <CheckCircle size={24} style={{ color: 'var(--green)', marginBottom: '8px' }} />
                All systems operational
              </div>
            )}
          </div>
        </MetricCard>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}