import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import api from '../services/api'
import { Priority } from '@ticket-system/shared'

export default function NewTicket() {
  const navigate = useNavigate()
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [queueId, setQueueId] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')

  const { data: queues } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => {
      const response = await api.get('/queues')
      return response.data.queues
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: {
      subject: string
      description: string
      priority: Priority
      queueId: string
      category?: string
    }) => {
      const response = await api.post('/tickets', data)
      return response.data
    },
    onSuccess: (data) => {
      navigate(`/tickets/${data.ticket.id}`)
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Error al crear el ticket')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!queueId) {
      setError('Debes seleccionar una cola')
      return
    }

    createMutation.mutate({
      subject,
      description,
      priority,
      queueId,
      category: category || undefined,
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/tickets')}
        className="btn-ghost mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver a Tickets
      </button>

      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Crear Nuevo Ticket</h1>
          <p className="text-gray-600 mt-1">Completa la información del ticket</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="subject" className="label">
              Asunto *
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input"
              placeholder="Describe brevemente el problema"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="label">
              Descripción *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input min-h-[150px]"
              placeholder="Describe el problema en detalle..."
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="queue" className="label">
                Cola *
              </label>
              <select
                id="queue"
                value={queueId}
                onChange={(e) => setQueueId(e.target.value)}
                className="input"
                required
              >
                <option value="">Selecciona una cola</option>
                {queues?.map((queue: any) => (
                  <option key={queue.id} value={queue.id}>
                    {queue.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="label">
                Prioridad
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="input"
              >
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="category" className="label">
              Categoría
            </label>
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
              placeholder="Ej: Hardware, Software, Red, etc."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              Crear Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
