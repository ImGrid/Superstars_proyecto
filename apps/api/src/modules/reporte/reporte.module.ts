import { Module } from '@nestjs/common';
import { ReporteController } from './reporte.controller';
import { ReporteService } from './reporte.service';
import { ReporteRepository } from './reporte.repository';
import { AuditoriaReporteService } from './auditoria-reporte.service';
import { PdfService } from './export/pdf.service';

// Modulo de reportes descargables (solo administrador).
//
// A proposito NO importa DashboardModule ni ningun otro modulo de negocio, y
// tiene su propio repositorio con consultas explicitas. El acoplamiento seria
// el agujero: si compartiera consultas con el dashboard, cualquier columna que
// se agregara alla terminaria exportada en un archivo con datos personales sin
// que nadie lo hubiera decidido. Es el mismo criterio que ObservadorModule.
//
// DrizzleModule es @Global, no hace falta importarlo.
@Module({
  controllers: [ReporteController],
  providers: [ReporteService, ReporteRepository, AuditoriaReporteService, PdfService],
})
export class ReporteModule {}
