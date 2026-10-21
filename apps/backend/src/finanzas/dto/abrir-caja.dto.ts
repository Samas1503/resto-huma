import { IsInt, IsOptional, IsString, Min } from 'class-validator';

// Espejo validado de AbrirCajaDto (shared/contracts/finanzas.ts) + turnoId opcional.
export class AbrirCajaDto {
  @IsInt()
  @Min(0)
  montoInicialArs!: number;

  /** Si se omite, se toma el turno abierto más reciente. */
  @IsOptional()
  @IsString()
  turnoId?: string;
}
