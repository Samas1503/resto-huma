import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ActualizarMesaDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  numero?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacidad?: number;

  @IsString()
  @IsOptional()
  zona?: string;
}
