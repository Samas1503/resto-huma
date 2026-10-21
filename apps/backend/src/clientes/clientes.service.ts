import { Injectable, NotFoundException } from '@nestjs/common';
import { Cliente, Direccion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

// Contrato de salida: ClienteDto / DireccionDto (packages/shared contracts/usuarios.ts)
export interface ClienteDto {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  direcciones: {
    calle: string;
    ciudad: string;
    referencia?: string;
    esPrincipal?: boolean;
  }[];
}

const toDto = (cliente: Cliente & { direcciones: Direccion[] }): ClienteDto => ({
  id: cliente.id,
  nombre: cliente.nombre,
  email: cliente.email,
  telefono: cliente.telefono,
  direcciones: cliente.direcciones.map(({ calle, ciudad, referencia, esPrincipal }) => ({
    calle,
    ciudad,
    ...(referencia ? { referencia } : {}),
    esPrincipal,
  })),
});

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  // Upsert por cuenta Google: vincula googleId si el email ya existía.
  async upsertGoogle(data: { googleId: string; email: string; nombre: string }): Promise<ClienteDto> {
    const existente = await this.prisma.cliente.findFirst({
      where: { OR: [{ googleId: data.googleId }, { email: data.email }] },
    });
    const cliente = existente
      ? await this.prisma.cliente.update({
          where: { id: existente.id },
          data: { googleId: data.googleId, nombre: data.nombre },
          include: { direcciones: true },
        })
      : await this.prisma.cliente.create({
          data: { googleId: data.googleId, email: data.email, nombre: data.nombre },
          include: { direcciones: true },
        });
    return toDto(cliente);
  }

  async me(id: string): Promise<ClienteDto> {
    const cliente = await this.prisma.cliente.findUnique({ where: { id }, include: { direcciones: true } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return toDto(cliente);
  }
}
