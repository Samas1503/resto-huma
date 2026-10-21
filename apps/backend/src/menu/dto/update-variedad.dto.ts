import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

// PATCH parcial; para quitar el override de precio usar null explícito en el service
export class UpdateVariedadDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  precioArs?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioUsd?: number | null;

  @IsOptional()
  @IsBoolean()
  disponible?: boolean;
}
