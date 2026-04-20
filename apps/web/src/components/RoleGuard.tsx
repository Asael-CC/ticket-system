import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

type Role = 'ADMIN' | 'SUPERVISOR' | 'AGENT' | 'CUSTOMER'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: Role[]
  fallback?: React.ReactNode
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    return <Navigate to="/login" />
  }

  const hasRole = allowedRoles.includes(user.role as Role)

  if (!hasRole) {
    if (fallback) {
      return <>{fallback}</>
    }
    return <Navigate to="/" />
  }

  return <>{children}</>
}

// Hook para verificar permisos
export function useRole() {
  const user = useAuthStore((state) => state.user)

  return {
    user,
    role: user?.role as Role | undefined,
    isAdmin: user?.role === 'ADMIN',
    isSupervisor: user?.role === 'SUPERVISOR',
    isAgent: user?.role === 'AGENT',
    isCustomer: user?.role === 'CUSTOMER',
    isStaff: user?.role === 'ADMIN' || user?.role === 'SUPERVISOR' || user?.role === 'AGENT',
    canManageUsers: user?.role === 'ADMIN' || user?.role === 'SUPERVISOR',
    canManageQueues: user?.role === 'ADMIN' || user?.role === 'SUPERVISOR',
    canAssignTickets: user?.role === 'ADMIN' || user?.role === 'SUPERVISOR' || user?.role === 'AGENT',
    canViewInternalComments: user?.role === 'ADMIN' || user?.role === 'SUPERVISOR' || user?.role === 'AGENT',
    canCreateInternalComments: user?.role === 'ADMIN' || user?.role === 'SUPERVISOR' || user?.role === 'AGENT',
    canChangeTicketStatus: user?.role === 'ADMIN' || user?.role === 'SUPERVISOR' || user?.role === 'AGENT',
    canViewAllTickets: user?.role === 'ADMIN' || user?.role === 'SUPERVISOR' || user?.role === 'AGENT',
    canViewQueues: user?.role === 'ADMIN' || user?.role === 'SUPERVISOR' || user?.role === 'AGENT',
  }
}
