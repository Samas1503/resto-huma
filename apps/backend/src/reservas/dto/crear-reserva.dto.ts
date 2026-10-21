import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

// Contrato: CrearReservaDto (packages/shared contracts/salon.ts)
export class CrearReservaDto {
  // Opcional en el contrato, pero schema.prisma lo declara NOT NULL:
  // el service lo exige hasta que A1 ajuste el schema (ver pendientes).
  @IsString()
  @IsOptional()
  clienteId?: string;

  @IsString()
  @IsNotEmpty()
  mesaId: string;

  @IsDateString()
  fechaHora: string;

  @IsInt()
  @Min(1)
  cantidadPersonas: number;

  @IsString()
  @IsNotEmpty()
  telefonoContacto: string;

  @IsString()
  @IsOptional()
  notas?: string;
}
