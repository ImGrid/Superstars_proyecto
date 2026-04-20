import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  RolUsuario,
  createFaqSchema,
  updateFaqSchema,
  listFaqQuerySchema,
} from '@superstars/shared';
import type { CreateFaqDto, UpdateFaqDto } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { FaqService } from './faq.service';

// Endpoints publicos: GET /api/public/faq y GET /api/public/faq/concurso/:id
@Public()
@Controller('public/faq')
export class FaqPublicController {
  constructor(private readonly faqService: FaqService) {}

  // Preguntas generales (sin concurso asignado), agrupables por categoria en el frontend
  @Get()
  async findAllPublic() {
    return this.faqService.findAllPublic();
  }

  // Preguntas especificas de un concurso (para mostrar en la pagina del concurso)
  @Get('concurso/:id')
  async findByConcurso(@Param('id', ParseIntPipe) id: number) {
    return this.faqService.findByConcursoId(id);
  }
}

// Endpoints admin: /api/faq
@Controller('faq')
export class FaqAdminController {
  constructor(private readonly faqService: FaqService) {}

  // Listar con paginacion y filtros opcionales (admin/responsable)
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  async findAll(@Query() rawQuery: Record<string, string>) {
    const query = listFaqQuerySchema.parse(rawQuery);
    return this.faqService.findAll(query);
  }

  // Obtener por ID (admin/responsable)
  @Get(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.faqService.findById(id);
  }

  // Crear (admin/responsable)
  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateFaqDto) {
    const dto = createFaqSchema.parse(body);
    return this.faqService.create(dto);
  }

  // Actualizar (admin/responsable)
  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateFaqDto,
  ) {
    const dto = updateFaqSchema.parse(body);
    return this.faqService.update(id, dto);
  }

  // Eliminar (admin/responsable)
  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.faqService.delete(id);
  }
}
