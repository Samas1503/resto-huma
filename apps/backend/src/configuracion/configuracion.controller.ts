import { Body, Controller, Get, NotFoundException, Param, Put } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import { Auth } from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';

class SetConfigDto {
  @IsString()
  @MaxLength(500)
  valor!: string;
}

@Controller('configuracion')
export class ConfiguracionController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Auth('admin')
  async listar() {
    return this.prisma.configuracion.findMany({ orderBy: { clave: 'asc' } });
  }

  @Get(':clave')
  @Auth('admin')
  async una(@Param('clave') clave: string) {
    const cfg = await this.prisma.configuracion.findUnique({ where: { clave } });
    if (!cfg) throw new NotFoundException(`Configuracion ${clave} no existe`);
    return cfg;
  }

  @Put(':clave')
  @Auth('admin')
  async set(@Param('clave') clave: string, @Body() dto: SetConfigDto) {
    return this.prisma.configuracion.upsert({
      where: { clave },
      update: { valor: dto.valor },
      create: { clave, valor: dto.valor },
    });
  }
}
