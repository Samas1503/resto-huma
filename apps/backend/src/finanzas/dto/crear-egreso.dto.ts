import { CategoriaEgreso } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

// Espejo validado de CrearEgresoDto (shared/contracts/finanzas.ts).
export class CrearEgresoDto {
  @IsEnum(CategoriaEgreso)
  categoria!: CategoriaEgreso;

  @IsInt()
  @Min(1)
  montoArs!: number;

  @IsString()
  @IsNotEmpty()
  descripcion!: string;
}
