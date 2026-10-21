import { Module } from '@nestjs/common';
import { MesasController } from './mesas.controller.js';
import { MesasService } from './mesas.service.js';
import { TurnosController } from './turnos.controller.js';
import { TurnosService } from './turnos.service.js';

@Module({
  controllers: [MesasController, TurnosController],
  providers: [MesasService, TurnosService],
  exports: [MesasService, TurnosService],
})
export class SalonModule {}
