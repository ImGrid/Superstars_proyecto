import { SetMetadata } from '@nestjs/common';

// Nombre del param en la ruta que contiene el concursoId
export const CHECK_CONCURSO_KEY = 'checkConcursoParam';

// Marca un endpoint para que ConcursoAccessGuard verifique acceso
export const CheckConcurso = (paramName = 'id') =>
  SetMetadata(CHECK_CONCURSO_KEY, paramName);
