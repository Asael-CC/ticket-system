import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import api from '../services/api'
import Badge from '../components/Badge'
import { useRole } from '../components/RoleGuard'
import { Ticket, TicketStatus, Priority } from '@ticket-system/shared'

const statusOptions: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'OPEN', label: 'Abierto' },
  { value: 'IN_PROGRESS', label: 'En Progreso' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'RESOLVED', label: 'Resuelto' },
  { value: 'CLOSED', label: 'Cerrado' },
]

const priorityOptions: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

export default function Tickets() {
  const { isCustomer, isStaff } = useRole()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const status = searchParams.get('status') || ''
  const priority = searchParams.get('priority') || ''

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', { page, status, priority, search }],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      if (status) params.set('status', status)
      if (priority) params.set('priority', priority)
      if (search) params.set('search', search)

      const response = await api.get(`/tickets?${params.toString()}`)
      return response.data
    },
  })

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set(key, value)
    } else {
      newParams.delete(key)
    }
    newParams.set('page', '1')
    setSearchParams(newParams)
  }

  const tickets = data?.tickets || []
  const pagination = data?.pagination

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-gray-600 mt-1">Gestiona todos los tickets de soporte</p>
        </div>
        <Link to="/tickets/new" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Ticket
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número, asunto o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  updateFilter('search', search)
                }
              }}
              className="input pl-10"
            />
          </div>
          {isStaff && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </button>
          )}
        </div>

        {showFilters && isStaff && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="label">Estado</label>
              <select
                value={status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="input w-40"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Prioridad</label>
              <select
                value={priority}
                onChange={(e) => updateFilter('priority', e.target.value)}
                className="input w-40"
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
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
                {isStaff && <th className="table-header">Solicitante</th>}
                {isStaff && <th className="table-header">Asignado</th>}
                {isStaff && <th className="table-header">Cola</th>}
                <th className="table-header">Creado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={isStaff ? 7 : 4} className="table-cell text-center py-8">
                    Cargando...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={isStaff ? 7 : 4} className="table-cell text-center py-8 text-gray-500">
                    No se encontraron tickets
                  </td>
                </tr>
              ) : (
                tickets.map((ticket: Ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="table-cell">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="block"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-primary-600">
                            {ticket.number}
                          </span>
                          <span className="text-gray-600 truncate max-w-xs">
                            {ticket.subject}
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td className="table-cell">
                      <Badge status={ticket.status} />
                    </td>
                    <td className="table-cell">
                      <Badge priority={ticket.priority} />
                    </td>
                    {isStaff && <td className="table-cell">{ticket.requester.name}</td>}
                    {isStaff && (
                      <td className="table-cell">
                        {ticket.assignedTo?.name || (
                          <span className="text-gray-400">Sin asignar</span>
                        )}
                      </td>
                    )}
                    {isStaff && (
                      <td className="table-cell">
                        <span
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${ticket.queue.color}20`,
                            color: ticket.queue.color,
                          }}
                        >
                          {ticket.queue.name}
                        </span>
                      </td>
                    )}
                    <td className="table-cell text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString('es-ES')}
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
            <p className="text-sm text-gray-600">
              Mostrando {((page - 1) * pagination.limit) + 1} a{' '}
              {Math.min(page * pagination.limit, pagination.total)} de{' '}
              {pagination.total} tickets
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateFilter('page', (page - 1).toString())}
                disabled={page === 1}
                className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Página {page} de {pagination.pages}
              </span>
              <button
                onClick={() => updateFilter('page', (page + 1).toString())}
                disabled={page === pagination.pages}
                className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
