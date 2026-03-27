import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { Sidebar }   from './components/Sidebar'
import { Header }    from './components/Header'
import Dashboard     from './components/Dashboard'
import Timeline      from './components/Timeline'
import StandsPage    from './components/Stands'
import { ChatPanel } from './components/Chat'

export default function App() {
  const Layout = () => (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--bg-base)',
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

  const router = createBrowserRouter(
    [
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'timeline', element: <Timeline /> },
          { path: 'stands', element: <StandsPage /> },
        ],
      },
    ],
    { future: { v7_startTransition: true, v7_relativeSplatPath: true } },
  )

  return <RouterProvider router={router} />
}
