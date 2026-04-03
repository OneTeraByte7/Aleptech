import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import { Sidebar }   from './components/Sidebar'
import { Header }    from './components/Header'
import Dashboard     from './components/Dashboard'
import FlightStatusCards from './components/FlightStatusCards'
import Timeline      from './components/Timeline'
import StandsPage    from './components/Stands'
import GraphPage     from './components/Graph'
import LandingPage   from './components/LandingPage'
import { ChatPanel } from './components/Chat'
import { ThemeProvider, useTheme } from './components/ThemeContext'

function AppLayout() {
  const { isDarkMode, toggleTheme } = useTheme()

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--bg-base)',
        transition: 'background 0.3s ease',
      }}
    >
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />

        <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <Outlet />
        </main>
      </div>

      <ChatPanel />
    </div>
  )
}

function LandingPageWrapper() {
  const { isDarkMode, toggleTheme } = useTheme()
  return <LandingPage isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
}

export default function App() {
  const router = createBrowserRouter(
    [
      {
        path: '/',
        element: <LandingPageWrapper />,
      },
      {
        path: '/app',
        element: <AppLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'metrics', element: <FlightStatusCards /> },
          { path: 'timeline', element: <Timeline /> },
          { path: 'stands', element: <StandsPage /> },
          { path: 'graph', element: <GraphPage /> },
        ],
      },
      // Redirect old routes to new structure
      {
        path: '/timeline',
        element: <Navigate to="/app/timeline" replace />
      },
      {
        path: '/stands', 
        element: <Navigate to="/app/stands" replace />
      },
      {
        path: '/graph',
        element: <Navigate to="/app/graph" replace />
      },
      {
        path: '/metrics',
        element: <Navigate to="/app/metrics" replace />
      },
      // Catch-all redirect
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ],
    { future: { v7_startTransition: true, v7_relativeSplatPath: true } },
  )

  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
