import { EstadoMesa, EstadoReserva, TipoTurno } from '../enums.js';

export interface MesaDto {
  id: string;
  numero: number;
  capacidad: number;
  zona: string | null;
  estado: EstadoMesa;
}
export interface CrearReservaDto {
  clienteId?: string | null;
  mesaId: string;
  fechaHora: string;
  cantidadPersonas: number;
  telefonoContacto: string;
  notas?: string;
}
export interface ReservaDto extends CrearReservaDto {
  id: string;
  clienteId: string | null;
  estado: EstadoReserva;
}
export interface AbrirTurnoDto { tipo: TipoTurno }
export interface AsignarMozoMesaDto { usuarioId: string; mesaId: string }
