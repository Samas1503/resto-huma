import { IsInt, Min } from 'class-validator';

// Espejo validado de CerrarCajaDto (shared/contracts/finanzas.ts).
export class CerrarCajaDto {
  /** Efectivo físico contado en el cajón al cierre. */
  @IsInt()
  @Min(0)
  dineroFisicoArs!: number;
}
