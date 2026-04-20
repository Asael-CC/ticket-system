import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Clock,
  User,
  Layers,
  MessageSquare,
  CheckCircle,
  Loader2,
  Inbox,
} from 'lucide-react'
import api from '../services/api'
import Badge from '../components/Badge'
import { TicketStatus, Priority, Role } from '@ticket-system/shared'
import { useAuthStore } from '../stores/auth'

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')
  const [isInternal, setIsInternal] = useState(true)

  // Obtener usuario actual para validar permisos
  const currentUser = useAuthStore((state) => state.user)
  const isCustomer = currentUser?.role === Role.CUSTOMER

  const { data, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const response = await api.get(`/tickets/${id}`)
      return response.data
    },
  })

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await api.get('/users/agents')
      return response.data.agents
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await api.patch(`/tickets/${id}`, updates)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
    },
  })

  const takeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/tickets/${id}/take`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
    },
  })

  const commentMutation = useMutation({
    mutationFn: async (data: { content: string; isInternal: boolean }) => {
      const response = await api.post('/comments', {
        ...data,
        ticketId: id,
      })
      return response.data
    },
    onSuccess: () => {
      setComment('')
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
    },
  })

  if (isLoading) {
    return <div className="text-center py-8">Cargando...</div>
  }

  if (!data?.ticket) {
    return <div className="text-center py-8">Ticket no encontrado</div>
  }

  const ticket = data.ticket

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/tickets')}
            className="btn-ghost"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ticket.number}</h1>
            <p className="text-gray-600">{ticket.subject}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isCustomer && !ticket.assignedTo && (
            <button
              onClick={() => takeMutation.mutate()}
              disabled={takeMutation.isPending}
              className="btn-primary"
            >
              {takeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Inbox className="w-4 h-4 mr-2" />
              )}
              Tomar Ticket
            </button>
          )}

          {!isCustomer ? (
            <select
              value={ticket.status}
              onChange={(e) => updateMutation.mutate({ status: e.target.value })}
              className="input w-auto"
            >
              <option value="OPEN">Abierto</option>
              <option value="IN_PROGRESS">En Progreso</option>
              <option value="PENDING">Pendiente</option>
              <option value="RESOLVED">Resuelto</option>
              <option value="CLOSED">Cerrado</option>
            </select>
          ) : (
            <Badge status={ticket.status} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Descripción</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Comments */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Comentarios</h2>
            </div>

            <div className="p-6 space-y-4">
              {ticket.comments?.length > 0 ? (
                ticket.comments.map((c: any) => (
                  <div
                    key={c.id}
                    className={`p-4 rounded-lg ${
                      c.isInternal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{c.author.name}</span>
                        {c.isInternal && (
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                            Interno
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(c.createdAt).toLocaleString('es-ES')}
                      </span>
                    </div>
                    <p className="text-gray-700">{c.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No hay comentarios</p>
              )}
            </div>

            {/* Add Comment */}
            <div className="p-6 border-t border-gray-200">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Añadir un comentario..."
                className="input min-h-[100px] mb-3"
              />
              <div className="flex items-center justify-between">
                {!isCustomer && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">Comentario interno</span>
                  </label>
                )}
                <button
                  onClick={() => commentMutation.mutate({ content: comment, isInternal })}
                  disabled={!comment.trim() || commentMutation.isPending}
                  className="btn-primary"
                >
                  {commentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <MessageSquare className="w-4 h-4 mr-2" />
                  )}
                  Añadir Comentario
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Estado</label>
              <div className="mt-1">
                <Badge status={ticket.status} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Prioridad</label>
              <div className="mt-1">
                <select
                  value={ticket.priority}
                  onChange={(e) => updateMutation.mutate({ priority: e.target.value })}
                  className="input"
                >
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>
            </div>

            {!isCustomer && (
              <div>
                <label className="text-sm font-medium text-gray-500">Asignado a</label>
                <select
                  value={ticket.assignedTo?.id || ''}
                  onChange={(e) => updateMutation.mutate({ assignedToId: e.target.value || null })}
                  className="input mt-1"
                >
                  <option value="">Sin asignar</option>
                  {agents?.map((agent: any) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.activeTickets} tickets)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-500">Solicitante</label>
              <p className="mt-1 text-sm text-gray-900">{ticket.requester.name}</p>
              <p className="text-xs text-gray-500">{ticket.requester.email}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Cola</label>
              <div className="mt-1">
                <span
                  className="inline-flex items-center px-2 py-1 rounded text-sm"
                  style={{
                    backgroundColor: `${ticket.queue.color}20`,
                    color: ticket.queue.color,
                  }}
                >
                  {ticket.queue.name}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Creado</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(ticket.createdAt).toLocaleString('es-ES')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
