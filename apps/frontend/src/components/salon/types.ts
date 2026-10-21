// Tipos de vista del módulo salón: espejo de las respuestas reales de la API.
// Los contratos de @resto-huma/shared cubren los DTOs base; acá se agregan las
// relaciones que incluye el backend (reservas.service includeBase, turnos.service
// includeAsignaciones).
import type { EstadoReserva, Rol, TipoTurno } from '@resto-huma/shared';

// MozoMesaTurno con usuario y mesa (GET /turnos → includeAsignaciones).
export interface AsignacionMozo {
  id: string;
  turnoId: string;
  usuarioId: string;
  mesaId: string;
  usuario: { id: string; nombre: string; rol: Rol };
  mesa: { id: string; numero: number; zona: string | null };
}

export interface TurnoView {
  id: string;
  tipo: TipoTurno;
  apertura: string;
  cierre: string | null;
  mozoMesaTurnos: AsignacionMozo[];
}

// GET /reservas y /reservas/del-dia incluyen cliente y mesa.
export interface ReservaView {
  id: string;
  clienteId: string | null;
  mesaId: string;
  fechaHora: string;
  cantidadPersonas: number;
  telefonoContacto: string;
  estado: EstadoReserva;
  notas: string | null;
  cliente: { id: string; nombre: string; telefono: string | null } | null;
  mesa: { id: string; numero: number; zona: string | null; capacidad: number };
}
