import { UnauthorizedException } from '@nestjs/common';
import { Rol, Usuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';

const usuario: Usuario = {
  id: 'u1',
  nombre: 'Ana',
  email: 'ana@resto.com',
  passwordHash: '',
  rol: Rol.admin,
  activo: true,
  createdAt: new Date(),
};

const make = () => {
  const prisma = {
    usuario: { findUnique: vi.fn() },
    refreshToken: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const jwt = {
    signAsync: vi.fn().mockResolvedValue('token-firmado'),
    verifyAsync: vi.fn(),
  };
  const config = { get: (_k: string, defecto?: string) => defecto };
  const usuarios = { crear: vi.fn() };
  const clientes = { upsertGoogle: vi.fn() };
  const service = new AuthService(
    prisma as never,
    jwt as never,
    config as never,
    usuarios as never,
    clientes as never,
  );
  return { service, prisma, jwt, usuarios, clientes };
};

describe('AuthService', () => {
  beforeEach(async () => {
    usuario.passwordHash = await bcrypt.hash('secreto123', 10);
    usuario.activo = true;
  });

  it('login emite access+refresh y persiste el hash del refresh', async () => {
    const { service, prisma, jwt } = make();
    prisma.usuario.findUnique.mockResolvedValue(usuario);

    const tokens = await service.login({ email: usuario.email, password: 'secreto123' });

    expect(tokens).toEqual({ accessToken: 'token-firmado', refreshToken: 'token-firmado' });
    expect(jwt.signAsync).toHaveBeenCalledTimes(2);
    expect(prisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ usuarioId: 'u1' }) }),
    );
  });

  it('login rechaza password incorrecta y usuario inactivo', async () => {
    const { service, prisma } = make();
    prisma.usuario.findUnique.mockResolvedValue(usuario);
    await expect(service.login({ email: usuario.email, password: 'mal' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    usuario.activo = false;
    await expect(
      service.login({ email: usuario.email, password: 'secreto123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refresh rota: revoca el token usado y emite un par nuevo', async () => {
    const { service, prisma, jwt } = make();
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1', tipo: 'refresh', jti: 'j1' });
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      usuarioId: 'u1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      usuario,
    });

    const tokens = await service.refresh({ refreshToken: 'rt-viejo' });

    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rt1' } }),
    );
    expect(tokens.refreshToken).toBe('token-firmado');
  });

  it('refresh con token ya revocado invalida toda la sesión', async () => {
    const { service, prisma, jwt } = make();
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1', tipo: 'refresh', jti: 'j1' });
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      usuarioId: 'u1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      usuario,
    });

    await expect(service.refresh({ refreshToken: 'rt-viejo' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: 'u1', revokedAt: null } }),
    );
  });

  it('refresh rechaza un access token usado como refresh', async () => {
    const { service, jwt } = make();
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1', email: usuario.email, rol: 'admin' });
    await expect(service.refresh({ refreshToken: 'access' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
