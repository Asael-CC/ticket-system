import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import { RoleGuard } from './components/RoleGuard'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Tickets from './pages/Tickets'
import TicketDetail from './pages/TicketDetail'
import Queues from './pages/Queues'
import QueueDetail from './pages/QueueDetail'
import NewTicket from './pages/NewTicket'
import Users from './pages/Users'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token)
  return token ? <>{children}</> : <Navigate to="/login" />
}

// Customer route - only for CUSTOMER role (reserved for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CustomerRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)

  if (!token) return <Navigate to="/login" />
  if (user?.role !== 'CUSTOMER') return <Navigate to="/" />
  return <>{children}</>
}

// Staff route - for AGENT, SUPERVISOR, ADMIN
function StaffRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)

  if (!token) return <Navigate to="/login" />
  if (!['AGENT', 'SUPERVISOR', 'ADMIN'].includes(user?.role || '')) return <Navigate to="/" />
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        {/* Dashboard - available to all authenticated users */}
        <Route index element={<Dashboard />} />

        {/* Tickets - available to all */}
        <Route path="tickets" element={<Tickets />} />
        <Route path="tickets/new" element={<NewTicket />} />
        <Route path="tickets/:id" element={<TicketDetail />} />

        {/* Queues - only for staff (AGENT, SUPERVISOR, ADMIN) */}
        <Route
          path="queues"
          element={
            <StaffRoute>
              <Queues />
            </StaffRoute>
          }
        />
        <Route
          path="queues/:id"
          element={
            <StaffRoute>
              <QueueDetail />
            </StaffRoute>
          }
        />

        {/* Users - only for ADMIN */}
        <Route
          path="users"
          element={
            <RoleGuard allowedRoles={['ADMIN']}>
              <Users />
            </RoleGuard>
          }
        />
      </Route>
    </Routes>
  )
}

export default App
