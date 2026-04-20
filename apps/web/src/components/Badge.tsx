import { Priority, TicketStatus } from '@ticket-system/shared'

interface BadgeProps {
  status?: TicketStatus
  priority?: Priority
  children?: React.ReactNode
  variant?: 'default' | 'outline'
}

const statusClasses: Record<TicketStatus, string> = {
  OPEN: 'status-open',
  IN_PROGRESS: 'status-in_progress',
  PENDING: 'status-pending',
  RESOLVED: 'status-resolved',
  CLOSED: 'status-closed',
}

const priorityClasses: Record<Priority, string> = {
  LOW: 'priority-low',
  MEDIUM: 'priority-medium',
  HIGH: 'priority-high',
  URGENT: 'priority-urgent',
}

const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En Progreso',
  PENDING: 'Pendiente',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
}

const priorityLabels: Record<Priority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

export default function Badge({ status, priority, children, variant = 'default' }: BadgeProps) {
  const classes = status
    ? statusClasses[status]
    : priority
    ? priorityClasses[priority]
    : 'bg-gray-100 text-gray-800'

  const label = children || (status ? statusLabels[status] : priority ? priorityLabels[priority] : '')

  if (variant === 'outline') {
    return (
      <span className={`badge ${classes.replace('bg-', 'border-2 border-').replace('text-', 'bg-transparent ')}`}>
        {label}
      </span>
    )
  }

  return <span className={`badge ${classes}`}>{label}</span>
}
