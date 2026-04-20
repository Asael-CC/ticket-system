import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users as UsersIcon,
  Plus,
  Edit2,
  Check,
  X,
  User,
  Shield,
  Headphones,
  UserCircle,
} from 'lucide-react'
import api from '../services/api'
import { useRole } from '../components/RoleGuard'

interface UserData {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'SUPERVISOR' | 'AGENT' | 'CUSTOMER'
  isActive: boolean
  createdAt: string
  activeTickets?: number
}

const roleLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ADMIN: {
    label: 'Administrador',
    color: 'bg-red-100 text-red-800',
    icon: <Shield className="w-3 h-3" />,
  },
  SUPERVISOR: {
    label: 'Supervisor',
    color: 'bg-purple-100 text-purple-800',
    icon: <User className="w-3 h-3" />,
  },
  AGENT: {
    label: 'Agente',
    color: 'bg-blue-100 text-blue-800',
    icon: <Headphones className="w-3 h-3" />,
  },
  CUSTOMER: {
    label: 'Cliente',
    color: 'bg-green-100 text-green-800',
    icon: <UserCircle className="w-3 h-3" />,
  },
}

export default function Users() {
  const { isAdmin } = useRole()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'AGENT' as UserData['role'],
  })

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users')
      return response.data.users as UserData[]
    },
  })

  // Create user mutation
  const createUser = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; role: UserData['role'] }) => {
      const response = await api.post('/users', data)
      return response.data.user
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowModal(false)
      resetForm()
    },
  })

  // Update user mutation
  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserData> }) => {
      const response = await api.patch(`/users/${id}`, data)
      return response.data.user
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditingUser(null)
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'AGENT' as UserData['role'],
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createUser.mutate(formData)
  }

  const handleUpdateRole = (userId: string, newRole: UserData['role']) => {
    updateUser.mutate({ id: userId, data: { role: newRole } })
  }

  const handleToggleActive = (user: UserData) => {
    updateUser.mutate({ id: user.id, data: { isActive: !user.isActive } })
  }

  if (isLoading) {
    return <div className="text-center py-8">Cargando usuarios...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-1">
            Crea y administra usuarios del sistema
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                Usuario
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                Rol
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                Estado
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                Tickets Activos
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                Creado
              </th>
              {isAdmin && (
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users?.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-700 font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {editingUser?.id === user.id ? (
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value as UserData['role'])}
                      className="input text-sm"
                      autoFocus
                      onBlur={() => setEditingUser(null)}
                    >
                      <option value="ADMIN">Administrador</option>
                      <option value="SUPERVISOR">Supervisor</option>
                      <option value="AGENT">Agente</option>
                      <option value="CUSTOMER">Cliente</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        roleLabels[user.role]?.color || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {roleLabels[user.role]?.icon}
                      {roleLabels[user.role]?.label || user.role}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleActive(user)}
                    disabled={!isAdmin || updateUser.isPending}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      user.isActive
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    } ${!isAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    {user.isActive ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Activo
                      </>
                    ) : (
                      <>
                        <X className="w-3 h-3 mr-1" />
                        Inactivo
                      </>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-900">
                    {user.activeTickets || 0}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-primary-600 hover:text-primary-900 p-1 hover:bg-primary-50 rounded"
                      title="Editar rol"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-primary-600" />
                Crear Nuevo Usuario
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nombre completo</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="label">Correo electrónico</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="input"
                  placeholder="usuario@empresa.com"
                />
              </div>

              <div>
                <label className="label">Contraseña</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="input"
                  placeholder="••••••••"
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo 6 caracteres
                </p>
              </div>

              <div>
                <label className="label">Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as typeof formData.role,
                    })
                  }
                  className="input"
                >
                  <option value="ADMIN">Administrador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="AGENT">Agente</option>
                  <option value="CUSTOMER">Cliente</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.role === 'ADMIN'
                    ? 'Acceso total al sistema'
                    : formData.role === 'SUPERVISOR'
                    ? 'Gestiona colas, usuarios y métricas'
                    : formData.role === 'AGENT'
                    ? 'Atiende tickets asignados'
                    : 'Solo crea tickets y comenta'}
                </p>
              </div>

              {createUser.isError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {createUser.error instanceof Error
                    ? createUser.error.message
                    : 'Error al crear usuario'}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createUser.isPending}
                  className="btn-primary"
                >
                  {createUser.isPending ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
