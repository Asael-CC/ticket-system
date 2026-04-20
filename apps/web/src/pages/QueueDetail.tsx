import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Users,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import api from '../services/api'
import Badge from '../components/Badge'

const statusOptions = [
  { value: 'OPEN', label: 'Abierto' },
  { value: 'IN_PROGRESS', label: 'En Progreso' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'all', label: 'Todos' },
]

export default function QueueDetail() {
  const { id } = useParams()
  const [status, setStatus] = useState('OPEN')
  const [page, setPage] = useState(1)

  const { data: queueData } = useQuery({
    queryKey: ['queue', id],
    queryFn: async () => {
      const response = await api.get(`/queues/${id}`)
      return response.data
    },
  })

  const { data: ticketsData } = useQuery({
    queryKey: ['queue-tickets', id, status, page],
    queryFn: async () => {
      const response = await api.get(`/queues/${id}/tickets?status=${status}&page=${page}`)
      return response.data
    },
  })

  const queue = queueData?.queue
  const tickets = ticketsData?.tickets || []
  const pagination = ticketsData?.pagination

  if (!queue) {
    return <div className="text-center py-8">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/queues" className="btn-ghost">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${queue.color}20` }}
            >
              <span style={{ color: queue.color, fontWeight: 'bold' }}>
                {queue.name[0]}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{queue.name}</h1>
          </div>
          <p className="text-gray-600 mt-1">{queue.description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Agentes</p>
              <p className="text-2xl font-bold text-gray-900">{queue.agents.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tickets Activos</p>
              <p className="text-2xl font-bold text-gray-900">{queue.tickets.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="input w-auto"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Ticket</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Prioridad</th>
                <th className="table-header">Asignado</th>
                <th className="table-header">Creado</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center py-8 text-gray-500">
                    No hay tickets en esta cola
                  </td>
                </tr>
              ) : (
                tickets.map((ticket: any) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        {ticket.number}
                      </Link>
                      <p className="text-sm text-gray-600 truncate max-w-xs">
                        {ticket.subject}
                      </p>
                    </td>
                    <td className="table-cell">
                      <Badge status={ticket.status} />
                    </td>
                    <td className="table-cell">
                      <Badge priority={ticket.priority} />
                    </td>
                    <td className="table-cell">
                      {ticket.assignedTo?.name || (
                        <span className="text-gray-400">Sin asignar</span>
                      )}
                    </td>
                    <td className="table-cell text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString('es-ES')}
                    </td>
                    <td className="table-cell">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Página {page} de {pagination.pages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.pages}
                className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
