import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plane, Clock, Users, BarChart3, MessageSquare, Network, ArrowRight, Moon, Sun } from 'lucide-react'

export default function LandingPage({ isDarkMode, toggleTheme }) {
  const navigate = useNavigate()
  const [hoveredFeature, setHoveredFeature] = useState(null)

  const features = [
    {
      icon: BarChart3,
      title: 'Operations Dashboard',
      description: 'Real-time flight monitoring with advanced filtering and search capabilities',
      path: '/app',
      color: 'var(--accent)'
    },
    {
      icon: Clock,
      title: 'Timeline View',
      description: 'Interactive Gantt chart showing flight assignments across 24-hour operations',
      path: '/app/timeline',
      color: 'var(--green)'
    },
    {
      icon: Users,
      title: 'Stand Management',
      description: 'Comprehensive stand browser with occupancy status and scheduling',
      path: '/app/stands',
      color: 'var(--amber)'
    },
    {
      icon: Network,
      title: 'Resource Graph',
      description: 'Airport network visualization showing stands, gates, and connections',
      path: '/app/graph',
      color: 'var(--rose)'
    },
    {
      icon: MessageSquare,
      title: 'AI Operations Assistant',
      description: 'Intelligent chat interface for operations queries and assistance',
      path: '/app',
      color: 'var(--violet)'
    }
  ]

  return (
    <div className="landing-page" style={{
      minHeight: '100vh',
      background: isDarkMode 
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <header style={{
        padding: '20px 0',
        borderBottom: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: isDarkMode ? 'rgba(56,189,248,0.2)' : 'rgba(56,189,248,0.1)',
              border: '2px solid #38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Plane size={24} style={{ color: '#38bdf8' }} />
            </div>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: '800',
                fontFamily: 'Syne',
                background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Aleph Airport
              </h1>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: isDarkMode ? '#94a3b8' : '#64748b',
                fontFamily: 'JetBrains Mono'
              }}>
                Operations Management Platform
              </p>
            </div>
          </div>
          
          <button
            onClick={toggleTheme}
            style={{
              padding: '12px',
              borderRadius: '12px',
              background: isDarkMode ? '#334155' : '#f1f5f9',
              border: `1px solid ${isDarkMode ? '#475569' : '#e2e8f0'}`,
              color: isDarkMode ? '#f1f5f9' : '#1e293b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = isDarkMode ? '#475569' : '#e2e8f0'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = isDarkMode ? '#334155' : '#f1f5f9'
            }}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '80px 24px',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '56px',
          fontWeight: '800',
          lineHeight: '1.1',
          margin: '0 0 24px 0',
          fontFamily: 'Syne'
        }}>
          Intelligent Airport
          <br />
          <span style={{ color: '#38bdf8' }}>Operations Platform</span>
        </h2>
        
        <p style={{
          fontSize: '20px',
          lineHeight: '1.6',
          margin: '0 0 48px 0',
          color: isDarkMode ? '#94a3b8' : '#64748b',
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          Optimize aircraft stand assignments, monitor real-time operations, and manage airport resources with AI-powered insights and intuitive interfaces.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/app')}
            style={{
              padding: '16px 32px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
              border: 'none',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 16px rgba(56, 189, 248, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 8px 24px rgba(56, 189, 248, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 16px rgba(56, 189, 248, 0.3)'
            }}
          >
            Get Started
            <ArrowRight size={18} />
          </button>
          
          <button
            onClick={() => window.open('/api/docs', '_blank')}
            style={{
              padding: '16px 32px',
              borderRadius: '12px',
              background: 'transparent',
              border: `2px solid ${isDarkMode ? '#475569' : '#cbd5e1'}`,
              color: isDarkMode ? '#f1f5f9' : '#1e293b',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#38bdf8'
              e.target.style.color = '#38bdf8'
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = isDarkMode ? '#475569' : '#cbd5e1'
              e.target.style.color = isDarkMode ? '#f1f5f9' : '#1e293b'
            }}
          >
            View API Docs
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px 80px'
      }}>
        <h3 style={{
          fontSize: '36px',
          fontWeight: '700',
          textAlign: 'center',
          margin: '0 0 48px 0',
          fontFamily: 'Syne'
        }}>
          Comprehensive Operations Suite
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px'
        }}>
          {features.map((feature, index) => {
            const Icon = feature.icon
            const isHovered = hoveredFeature === index
            
            return (
              <div
                key={index}
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
                onClick={() => navigate(feature.path)}
                style={{
                  padding: '32px',
                  borderRadius: '16px',
                  background: isDarkMode ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                  boxShadow: isHovered 
                    ? '0 12px 32px rgba(0,0,0,0.1)' 
                    : '0 4px 16px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: `${feature.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  border: `2px solid ${feature.color}`
                }}>
                  <Icon size={28} style={{ color: feature.color }} />
                </div>
                
                <h4 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  margin: '0 0 12px 0',
                  fontFamily: 'Syne'
                }}>
                  {feature.title}
                </h4>
                
                <p style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  margin: 0,
                  color: isDarkMode ? '#94a3b8' : '#64748b'
                }}>
                  {feature.description}
                </p>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '20px',
                  color: feature.color,
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Explore <ArrowRight size={14} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
        padding: '32px 0',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px'
        }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: isDarkMode ? '#64748b' : '#94a3b8',
            fontFamily: 'JetBrains Mono'
          }}>
            Built with FastAPI + React • Full-Stack Take-Home Exercise
          </p>
        </div>
      </footer>
    </div>
  )
}