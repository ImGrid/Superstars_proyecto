import { Controller, Get } from '@nestjs/common';
import { RolUsuario } from '@superstars/shared';
import type { AuthUser } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // GET /api/dashboard/admin
  // KPIs globales del programa, distribuciones para graficos y alertas operativas
  @Get('admin')
  @Roles(RolUsuario.ADMINISTRADOR)
  async getAdmin() {
    return this.dashboardService.getAdminStats();
  }

  // GET /api/dashboard/responsable
  // Datos filtrados a las convocatorias asignadas al responsable autenticado.
  // Se permite al admin tambien para que pueda inspeccionar la vista del responsable
  // pasando user.id si en el futuro queremos exponerlo (por ahora usa su propio id)
  @Get('responsable')
  @Roles(RolUsuario.RESPONSABLE_CONVOCATORIA, RolUsuario.ADMINISTRADOR)
  async getResponsable(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getResponsableStats(user.id);
  }

  // GET /api/dashboard/evaluador
  // Datos filtrados al evaluador autenticado: postulaciones por calificar y progreso
  @Get('evaluador')
  @Roles(RolUsuario.EVALUADOR)
  async getEvaluador(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getEvaluadorStats(user.id);
  }
}
