import { Module } from '@nestjs/common';
import { ObservadorController } from './observador.controller';
import { ObservadorService } from './observador.service';
import { ObservadorRepository } from './observador.repository';
import { AuditoriaObservadorService } from './auditoria.service';

// Modulo del rol observador (financiador de solo lectura).
//
// A proposito NO importa ConvocatoriaModule, PostulacionModule ni ningun otro
// modulo de negocio: tiene su propio repositorio con proyecciones explicitas.
// El acoplamiento seria el agujero — si compartiera consultas con el admin,
// cualquier columna nueva que se agregara alla se filtraria aca sin que nadie
// lo decidiera. StorageModule y DrizzleModule son @Global, no hace falta
// importarlos.
@Module({
  controllers: [ObservadorController],
  providers: [ObservadorService, ObservadorRepository, AuditoriaObservadorService],
})
export class ObservadorModule {}
