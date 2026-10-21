import { createParamDecorator, ExecutionContext, SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { CanActivate, Injectable, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Rol } from '@prisma/client';

// ─── Decoradores ─────────────────────────────────────────────
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);

export interface JwtUser { sub: string; email: string; rol: Rol }
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtUser => ctx.switchToHttp().getRequest().user,
);

// ─── Guards ──────────────────────────────────────────────────
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required?.length) return true;
    const { user } = ctx.switchToHttp().getRequest();
    if (!user || !required.includes(user.rol)) throw new ForbiddenException('Rol insuficiente');
    return true;
  }
}

// Atajo: @Auth('admin', 'cajero') = JWT + rol
export const Auth = (...roles: Rol[]) =>
  applyDecorators(Roles(...roles), UseGuards(JwtAuthGuard, RolesGuard));
