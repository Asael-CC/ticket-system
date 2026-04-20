import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Users,
  Ticket,
  ArrowRight,
  Plus,
} from 'lucide-react'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'

export default function Queues() {
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR'

  const { data: queues, isLoading } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => {
      const response = await api.get('/queues')
      return response.data.queues
    },
  })

  if (isLoading) {
    return <div className="text-center py-8">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Colas de Trabajo</h1>
          <p className="text-gray-600 mt-1">Gestiona las colas y los tickets asignados</p>
        </div>
        {isAdmin && (
          <button className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Cola
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {queues?.map((queue: any) => (
          <Link
            key={queue.id}
            to={`/queues/${queue.id}`}
            className="card p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${queue.color}20` }}
                >
                  <Ticket className="w-6 h-6" style={{ color: queue.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{queue.name}</h3>
                  <p className="text-sm text-gray-500">{queue.description}</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>

            <div className="mt-6 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {queue.agentCount} agentes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {queue.ticketCount} tickets activos
                </span>
              </div>
            </div>

            {queue.slaConfig && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  SLA: Primera respuesta en {queue.slaConfig.firstResponseTimeMinutes}min,
                  Resolución en {queue.slaConfig.resolutionTimeMinutes}min
                </p>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
