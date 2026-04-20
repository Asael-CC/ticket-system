import { useQuery } from '@tanstack/react-query'
import {
  Ticket,
  Clock,
  AlertCircle,
  CheckCircle,
  Users,
  Inbox,
} from 'lucide-react'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useRole } from '../components/RoleGuard'

interface Metrics {
  total: number
  open: number
  inProgress: number
  pending: number
  resolvedToday: number
  slaBreached: number
  myTickets: number
  unassigned: number
}

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const { isCustomer, isAgent, isStaff } = useRole()

  // Only fetch metrics for staff (AGENT, SUPERVISOR, ADMIN)
  const { data: metricsData } = useQuery<{ metrics: Metrics }>({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const response = await api.get('/dashboard/metrics')
      return response.data
    },
    enabled: isStaff, // Only run for staff
  })

  // Fetch customer's own tickets (all statuses to calculate dashboard metrics)
  const { data: customerTicketsData } = useQuery({
    queryKey: ['customer-tickets-count'],
    queryFn: async () => {
      const response = await api.get('/tickets?limit=100') // Fetch all tickets, no status filter
      return response.data
    },
    enabled: isCustomer, // Only run for customers
  })

  // Recent activity - only for staff
  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const response = await api.get('/dashboard/recent-activity')
      return response.data
    },
    enabled: isStaff,
  })

  const metrics = metricsData?.metrics

  // Cards for staff (AGENT, SUPERVISOR, ADMIN)
  const staffCards = [
    {
      title: 'Mis Tickets',
      value: metrics?.myTickets || 0,
      icon: Ticket,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      show: isAgent,
    },
    {
      title: 'Sin Asignar',
      value: metrics?.unassigned || 0,
      icon: Inbox,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      show: true,
    },
    {
      title: 'Abiertos',
      value: metrics?.open || 0,
      icon: Ticket,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      show: true,
    },
    {
      title: 'En Progreso',
      value: metrics?.inProgress || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      show: true,
    },
    {
      title: 'Resueltos Hoy',
      value: metrics?.resolvedToday || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      show: true,
    },
    {
      title: 'SLA Violado',
      value: metrics?.slaBreached || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      show: true,
    },
  ]

  // Cards for customers
  const customerCards = [
    {
      title: 'Mis Tickets Abiertos',
      value: customerTicketsData?.tickets?.filter((t: any) => t.status === 'OPEN').length || 0,
      icon: Ticket,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Mis Tickets en Progreso',
      value: customerTicketsData?.tickets?.filter((t: any) => t.status === 'IN_PROGRESS').length || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Total Mis Tickets',
      value: customerTicketsData?.pagination?.total || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {user?.name}
        </h1>
        <p className="text-gray-600 mt-1">
          Aquí está el resumen de tu sistema de tickets
        </p>
      </div>

      {/* Metrics Grid - Staff View */}
      {isStaff && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffCards.filter((card) => card.show).map((card) => (
            <div key={card.title} className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                </div>
                <div className={`${card.bgColor} p-3 rounded-lg`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Grid - Customer View */}
      {isCustomer && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {customerCards.map((card) => (
            <div key={card.title} className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                </div>
                <div className={`${card.bgColor} p-3 rounded-lg`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity - Only for staff */}
        {isStaff && (
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity?.activities?.length > 0 ? (
                recentActivity.activities.slice(0, 5).map((activity: any) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.user.name}</span>{' '}
                        {activity.action === 'CREATED' && 'creó el ticket'}
                        {activity.action === 'UPDATED' && 'actualizó el ticket'}
                        {activity.action === 'ASSIGNED' && 'asignó el ticket'}
                        {activity.action === 'COMMENT_ADDED' && 'añadió un comentario'}
                        {activity.action === 'STATUS_CHANGED' && 'cambió el estado'}
                      </p>
                      {activity.ticket && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {activity.ticket.number}: {activity.ticket.subject}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(activity.createdAt).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No hay actividad reciente</p>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Quick Actions */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Acciones Rápidas</h2>
          </div>
          <div className="p-6 space-y-3">
            <a
              href="/tickets/new"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Crear Ticket</p>
                <p className="text-sm text-gray-500">Crear un nuevo ticket de soporte</p>
              </div>
            </a>

            {isStaff && (
              <a
                href="/queues"
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Ver Colas</p>
                  <p className="text-sm text-gray-500">Gestionar colas de trabajo</p>
                </div>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
