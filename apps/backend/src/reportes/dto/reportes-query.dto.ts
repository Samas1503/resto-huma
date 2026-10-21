import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';

// Rango de fechas ISO 8601 (YYYY-MM-DD o fecha-hora completa), ambos opcionales.
// `hasta` solo-fecha se interpreta como día inclusive (fin del día).
export class RangoFechasQueryDto {
  @IsOptional()
  @IsISO8601()
  desde?: string;

  @IsOptional()
  @IsISO8601()
  hasta?: string;
}

export class ProductosTopQueryDto extends RangoFechasQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number;
}
