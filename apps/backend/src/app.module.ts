import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { ClientesModule } from './clientes/clientes.module.js';
import { MenuModule } from './menu/menu.module.js';
import { SalonModule } from './salon/salon.module.js';
import { ReservasModule } from './reservas/reservas.module.js';
import { PedidosModule } from './pedidos/pedidos.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { InsumosModule } from './insumos/insumos.module.js';
import { FinanzasModule } from './finanzas/finanzas.module.js';
import { PagosModule } from './pagos/pagos.module.js';
import { ReportesModule } from './reportes/reportes.module.js';
import { ConfiguracionModule } from './configuracion/configuracion.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    ClientesModule,
    MenuModule,
    SalonModule,
    ReservasModule,
    PedidosModule,
    RealtimeModule,
    InsumosModule,
    FinanzasModule,
    PagosModule,
    ReportesModule,
    ConfiguracionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
