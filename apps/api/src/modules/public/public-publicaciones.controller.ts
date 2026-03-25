import { Controller, Get, Param, Query } from '@nestjs/common';
import { listPublicPublicacionesQuerySchema } from '@superstars/shared';
import { Public } from '../auth/decorators/public.decorator';
import { PublicService } from './public.service';

@Public()
@Controller('public/publicaciones')
export class PublicPublicacionesController {
  constructor(private readonly publicService: PublicService) {}

  // GET /api/public/publicaciones
  @Get()
  async findAll(@Query() query: Record<string, unknown>) {
    const parsed = listPublicPublicacionesQuerySchema.parse(query);
    return this.publicService.findPublicaciones(parsed);
  }

  // GET /api/public/publicaciones/categorias
  @Get('categorias')
  async findCategorias() {
    return this.publicService.findCategorias();
  }

  // GET /api/public/publicaciones/:slug
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.publicService.findPublicacionBySlug(slug);
  }
}
