import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

/** Inicia un cobro online por la pasarela activa (canal virtual). */
export class IniciarCobroDto {
  @IsString()
  @IsNotEmpty()
  pedidoId!: string;

  @IsInt()
  @Min(1)
  montoArs!: number;
}

export class ReembolsarCobroDto {
  @IsString()
  @IsNotEmpty()
  pagoId!: string;
}
