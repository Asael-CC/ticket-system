// Utilidades compartidas

export const generateTicketNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `TICK-${year}-${random}`;
};

export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeTime = (date: Date | string): string => {
  const now = new Date();
  const d = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Hace unos segundos';
  if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
  if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
  if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
  return formatDate(date);
};

export const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-500',
  IN_PROGRESS: 'bg-yellow-500',
  PENDING: 'bg-orange-500',
  RESOLVED: 'bg-green-500',
  CLOSED: 'bg-gray-500',
};

export const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-400',
  MEDIUM: 'bg-blue-400',
  HIGH: 'bg-orange-400',
  URGENT: 'bg-red-500',
};

export const calculateSLADeadline = (
  createdAt: Date,
  slaMinutes: number,
  businessHoursOnly: boolean = true
): Date => {
  if (!businessHoursOnly) {
    return new Date(createdAt.getTime() + slaMinutes * 60000);
  }

  // Implementación básica de SLA en horario laboral
  // En producción se debería considerar fines de semana y festivos
  const deadline = new Date(createdAt);
  let minutesRemaining = slaMinutes;

  while (minutesRemaining > 0) {
    const hour = deadline.getHours();

    // Si estamos fuera del horario laboral (9-18), avanzar al siguiente día 9am
    if (hour < 9) {
      deadline.setHours(9, 0, 0, 0);
    } else if (hour >= 18) {
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(9, 0, 0, 0);
    }

    // Si es fin de semana, avanzar al lunes
    const day = deadline.getDay();
    if (day === 0) { // Domingo
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(9, 0, 0, 0);
    } else if (day === 6) { // Sábado
      deadline.setDate(deadline.getDate() + 2);
      deadline.setHours(9, 0, 0, 0);
    }

    deadline.setMinutes(deadline.getMinutes() + 1);
    minutesRemaining--;
  }

  return deadline;
};

export * from './types';
