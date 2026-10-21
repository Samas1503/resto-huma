import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post } from '@nestjs/common';
import { Auth, CurrentUser } from '../common/index.js';
import type { JwtUser } from '../common/index.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto.js';
import { UsuariosService } from './usuarios.service.js';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  @Auth('admin')
  findAll() {
    return this.usuarios.findAll();
  }

  @Get(':id')
  @Auth('admin')
  findOne(@Param('id') id: string) {
    return this.usuarios.findOne(id);
  }

  @Post()
  @Auth('admin')
  crear(@Body() dto: CrearUsuarioDto) {
    return this.usuarios.crear(dto);
  }

  @Patch(':id')
  @Auth('admin')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarUsuarioDto, @CurrentUser() user: JwtUser) {
    if (id === user.sub && (dto.activo === false || (dto.rol && dto.rol !== 'admin'))) {
      throw new ForbiddenException('No podés quitarte el rol admin ni desactivarte a vos mismo');
    }
    return this.usuarios.actualizar(id, dto);
  }

  @Delete(':id')
  @Auth('admin')
  desactivar(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    if (id === user.sub) throw new ForbiddenException('No podés desactivarte a vos mismo');
    return this.usuarios.desactivar(id);
  }
}
