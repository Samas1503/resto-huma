import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Usuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClienteDto, ClientesService } from '../clientes/clientes.service.js';
import { CrearUsuarioDto } from '../usuarios/dto/crear-usuario.dto.js';
import { UsuarioDto, UsuariosService } from '../usuarios/usuarios.service.js';
import { GoogleAuthDto } from './dto/google-auth.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { RefreshTokenPayload } from './jwt.strategy.js';

// Contrato de salida: TokensDto (packages/shared contracts/usuarios.ts)
export interface TokensDto {
  accessToken: string;
  refreshToken: string;
}

export interface GoogleAuthResponse {
  accessToken: string;
  cliente: ClienteDto;
}

// "15m" / "7d" → segundos. Fallback a `defecto` ante formato inesperado.
function ttlSegundos(ttl: string, defecto: number): number {
  const match = /^(\d+)\s*([smhd])$/.exec(ttl.trim());
  if (!match) return Number(ttl) || defecto;
  const factor = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return Number(match[1]) * factor;
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client();
  private readonly accessTtl: number;
  private readonly refreshTtl: number;
  private readonly clienteTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly usuarios: UsuariosService,
    private readonly clientes: ClientesService,
  ) {
    this.accessTtl = ttlSegundos(this.config.get('JWT_ACCESS_TTL', '15m'), 900);
    this.refreshTtl = ttlSegundos(this.config.get('JWT_REFRESH_TTL', '7d'), 604800);
    // Sesión de cliente (portal público): más larga porque no hay refresh de clientes.
    this.clienteTtl = ttlSegundos(this.config.get('JWT_CLIENT_TTL', '30d'), 2592000);
  }

  // POST /auth/register — solo admin (guard en controller). Crea empleado.
  register(dto: CrearUsuarioDto): Promise<UsuarioDto> {
    return this.usuarios.crear(dto);
  }

  async login(dto: LoginDto): Promise<TokensDto> {
    const usuario = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    const ok = usuario && (await bcrypt.compare(dto.password, usuario.passwordHash));
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');
    if (!usuario.activo) throw new UnauthorizedException('Usuario inactivo');
    return this.emitirTokens(usuario);
  }

  // Rotación: el refresh usado queda revocado y se emite un par nuevo.
  async refresh(dto: RefreshDto): Promise<TokensDto> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
    if (payload.tipo !== 'refresh') throw new UnauthorizedException('Refresh token inválido');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(dto.refreshToken) },
      include: { usuario: true },
    });
    if (!stored) throw new UnauthorizedException('Refresh token inválido');

    const ahora = new Date();
    if (stored.revokedAt || stored.expiresAt < ahora) {
      // Reuso de token ya rotado/revocado → invalidar toda la sesión del usuario.
      await this.prisma.refreshToken.updateMany({
        where: { usuarioId: stored.usuarioId, revokedAt: null },
        data: { revokedAt: ahora },
      });
      throw new UnauthorizedException('Refresh token revocado o expirado');
    }
    if (!stored.usuario.activo) throw new UnauthorizedException('Usuario inactivo');

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: ahora } });
    return this.emitirTokens(stored.usuario);
  }

  // Cliente virtual: verifica idToken de Google y emite JWT propio (claim tipo='cliente').
  async google(dto: GoogleAuthDto): Promise<GoogleAuthResponse> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) throw new ServiceUnavailableException('Google OAuth no configurado (GOOGLE_CLIENT_ID)');
    const ticket = await this.googleClient
      .verifyIdToken({ idToken: dto.idToken, audience: clientId })
      .catch(() => null);
    const payload = ticket?.getPayload();
    if (!payload?.sub || !payload.email) throw new UnauthorizedException('Token de Google inválido');

    const cliente = await this.clientes.upsertGoogle({
      googleId: payload.sub,
      email: payload.email,
      nombre: payload.name ?? payload.email,
    });
    const accessToken = await this.jwt.signAsync(
      { sub: cliente.id, email: cliente.email, tipo: 'cliente' },
      { expiresIn: this.clienteTtl },
    );
    return { accessToken, cliente };
  }

  private async emitirTokens(usuario: Usuario): Promise<TokensDto> {
    const accessToken = await this.jwt.signAsync(
      { sub: usuario.id, email: usuario.email, rol: usuario.rol },
      { expiresIn: this.accessTtl },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: usuario.id, tipo: 'refresh', jti: randomUUID() },
      { expiresIn: this.refreshTtl },
    );
    await this.prisma.refreshToken.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
      },
    });
    return { accessToken, refreshToken };
  }
}
