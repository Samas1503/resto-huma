import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Rol } from '@prisma/client';
import { JwtUser } from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Claims del JWT de empleados (access token).
export interface AccessTokenPayload {
  sub: string;
  email: string;
  rol: Rol;
}

// Claims del JWT de clientes (emitido por /auth/google). No tiene Rol de staff.
export interface ClienteJwt {
  sub: string;
  email: string;
  tipo: 'cliente';
}

// Claims del refresh token persistido (hash) en RefreshToken.
export interface RefreshTokenPayload {
  sub: string;
  tipo: 'refresh';
  jti: string;
}

export type JwtPayload = AccessTokenPayload | ClienteJwt | RefreshTokenPayload;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Devuelve el user que queda en request.user (JwtUser staff o ClienteJwt).
  // Los refresh tokens (tipo='refresh') no sirven como access: se rechazan.
  async validate(payload: JwtPayload): Promise<JwtUser | ClienteJwt> {
    if ('tipo' in payload) {
      if (payload.tipo === 'cliente') return { sub: payload.sub, email: payload.email, tipo: 'cliente' };
      throw new UnauthorizedException('Token inválido');
    }
    const usuario = await this.prisma.usuario.findUnique({ where: { id: payload.sub } });
    if (!usuario?.activo) throw new UnauthorizedException('Usuario inexistente o inactivo');
    return { sub: usuario.id, email: usuario.email, rol: usuario.rol };
  }
}
