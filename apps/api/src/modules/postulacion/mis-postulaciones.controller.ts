import { Controller, Get } from '@nestjs/common';
import { RolUsuario } from '@superstars/shared';
import type { AuthUser } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PostulacionService } from './postulacion.service';

@Controller('mis-postulaciones')
export class MisPostulacionesController {
  constructor(private readonly postulacionService: PostulacionService) {}

  // GET /api/mis-postulaciones
  @Get()
  @Roles(RolUsuario.PROPONENTE)
  async findAll(@CurrentUser() user: AuthUser) {
    return this.postulacionService.findAllMine(user.id);
  }
}
