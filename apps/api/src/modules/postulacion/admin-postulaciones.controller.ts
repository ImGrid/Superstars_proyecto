import { Controller, Get, Query } from '@nestjs/common';
import { RolUsuario, listPostulacionesQuerySchema } from '@superstars/shared';
import type { AuthUser } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PostulacionService } from './postulacion.service';

// endpoint cross-concurso para admin y responsable
@Controller('postulaciones')
export class AdminPostulacionesController {
  constructor(private readonly postulacionService: PostulacionService) {}

  // GET /api/postulaciones?concursoId=6&estado=enviado&page=1&limit=20
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  async findAll(
    @Query() rawQuery: Record<string, string>,
    @CurrentUser() user: AuthUser,
  ) {
    const query = listPostulacionesQuerySchema.parse(rawQuery);
    return this.postulacionService.findAllAdmin(query, user);
  }
}
