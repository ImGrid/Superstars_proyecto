import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { listPublicConvocatoriasQuerySchema } from '@superstars/shared';
import { Public } from '../auth/decorators/public.decorator';
import { PublicService } from './public.service';

@Public()
@Controller('public/convocatorias')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  // GET /api/public/convocatorias
  @Get()
  async findAll(@Query() query: Record<string, unknown>) {
    const parsed = listPublicConvocatoriasQuerySchema.parse(query);
    return this.publicService.findConvocatorias(parsed);
  }

  // GET /api/public/convocatorias/:id
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.publicService.findConvocatoriaById(id);
  }

  // GET /api/public/convocatorias/:id/resultados
  @Get(':id/resultados')
  async findResultados(@Param('id', ParseIntPipe) id: number) {
    return this.publicService.findResultados(id);
  }
}
