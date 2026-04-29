import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateFaqDto,
  UpdateFaqDto,
  ListFaqQueryDto,
  PaginatedResponse,
  FaqResponse,
} from '@superstars/shared';
import { FaqRepository } from './faq.repository';

@Injectable()
export class FaqService {
  constructor(private readonly faqRepository: FaqRepository) {}

  // Listar preguntas generales (endpoint publico /faq — sin convocatoria asignada)
  async findAllPublic(): Promise<FaqResponse[]> {
    return this.faqRepository.findAllPublic();
  }

  // Listar preguntas de una convocatoria especifica (endpoint publico /faq/convocatoria/:id)
  async findByConvocatoriaId(convocatoriaId: number): Promise<FaqResponse[]> {
    return this.faqRepository.findByConvocatoriaId(convocatoriaId);
  }

  // Listar FAQs con paginacion y filtros opcionales (admin)
  async findAll(query: ListFaqQueryDto): Promise<PaginatedResponse<FaqResponse>> {
    const { page, limit } = query;
    const { data, total } = await this.faqRepository.findAll(query);
    const totalPages = Math.ceil(total / limit);

    return { data, total, page, limit, totalPages };
  }

  // Obtener FAQ por ID (admin)
  async findById(id: number): Promise<FaqResponse> {
    const faq = await this.faqRepository.findById(id);
    if (!faq) {
      throw new NotFoundException('Pregunta frecuente no encontrada');
    }
    return faq;
  }

  // Crear FAQ (admin)
  async create(dto: CreateFaqDto): Promise<FaqResponse> {
    return this.faqRepository.create(dto);
  }

  // Actualizar FAQ (admin)
  async update(id: number, dto: UpdateFaqDto): Promise<FaqResponse> {
    const updated = await this.faqRepository.update(id, dto);
    if (!updated) {
      throw new NotFoundException('Pregunta frecuente no encontrada');
    }
    return updated;
  }

  // Eliminar FAQ (admin)
  async delete(id: number): Promise<void> {
    const deleted = await this.faqRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException('Pregunta frecuente no encontrada');
    }
  }
}
