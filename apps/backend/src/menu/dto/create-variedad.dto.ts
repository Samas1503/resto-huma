import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

// Contrato: contracts/menu.ts → CrearVariedadDto
// precio* opcionales: null/ausente = usa el precio del producto (override por variedad)
export class CreateVariedadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  precioArs?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioUsd?: number;
}
