import { Rol } from '../enums.js';

export interface LoginDto { email: string; password: string }
export interface TokensDto { accessToken: string; refreshToken: string }
export interface CrearUsuarioDto {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
}
export interface UsuarioDto {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
}
export interface ClienteDto {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  direcciones: DireccionDto[];
}
export interface DireccionDto {
  calle: string;
  ciudad: string;
  referencia?: string;
  esPrincipal?: boolean;
}
export interface GoogleAuthDto { idToken: string }
