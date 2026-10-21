import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CrearMesaDto {
  @IsInt()
  @Min(1)
  numero: number;

  @IsInt()
  @Min(1)
  capacidad: number;

  @IsString()
  @IsOptional()
  zona?: string;
}
