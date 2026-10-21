import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Usuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto.js';

// Contrato de salida: UsuarioDto (packages/shared contracts/usuarios.ts) — nunca expone passwordHash.
export type UsuarioDto = Pick<Usuario, 'id' | 'nombre' | 'email' | 'rol' | 'activo'>;

const toDto = ({ id, nombre, email, rol, activo }: Usuario): UsuarioDto => ({ id, nombre, email, rol, activo });

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearUsuarioDto): Promise<UsuarioDto> {
    const existe = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (existe) throw new ConflictException('Email ya registrado');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const usuario = await this.prisma.usuario.create({
      data: { nombre: dto.nombre, email: dto.email, passwordHash, rol: dto.rol },
    });
    return toDto(usuario);
  }

  async findAll(): Promise<UsuarioDto[]> {
    const usuarios = await this.prisma.usuario.findMany({ orderBy: { createdAt: 'asc' } });
    return usuarios.map(toDto);
  }

  async findOne(id: string): Promise<UsuarioDto> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return toDto(usuario);
  }

  async actualizar(id: string, dto: ActualizarUsuarioDto): Promise<UsuarioDto> {
    await this.findOne(id);
    if (dto.email) {
      const existe = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
      if (existe && existe.id !== id) throw new ConflictException('Email ya registrado');
    }
    const { password, ...resto } = dto;
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: {
        ...resto,
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      },
    });
    // Si quedó inactivo, revocar sus refresh tokens vigentes.
    if (dto.activo === false) await this.revocarTokens(id);
    return toDto(usuario);
  }

  async desactivar(id: string): Promise<UsuarioDto> {
    await this.findOne(id);
    await this.revocarTokens(id);
    const usuario = await this.prisma.usuario.update({ where: { id }, data: { activo: false } });
    return toDto(usuario);
  }

  private revocarTokens(usuarioId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { usuarioId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
