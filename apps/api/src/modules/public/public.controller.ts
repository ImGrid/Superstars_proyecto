import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { listPublicConcursosQuerySchema } from '@superstars/shared';
import { Public } from '../auth/decorators/public.decorator';
import { PublicService } from './public.service';

@Public()
@Controller('public/concursos')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  // GET /api/public/concursos
  @Get()
  async findAll(@Query() query: Record<string, unknown>) {
    const parsed = listPublicConcursosQuerySchema.parse(query);
    return this.publicService.findConcursos(parsed);
  }

  // GET /api/public/concursos/:id
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.publicService.findConcursoById(id);
  }

  // GET /api/public/concursos/:id/resultados
  @Get(':id/resultados')
  async findResultados(@Param('id', ParseIntPipe) id: number) {
    return this.publicService.findResultados(id);
  }
}
