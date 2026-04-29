import { SetMetadata } from '@nestjs/common';

// Nombre del param en la ruta que contiene el convocatoriaId
export const CHECK_CONVOCATORIA_KEY = 'checkConvocatoriaParam';

// Marca un endpoint para que ConvocatoriaAccessGuard verifique acceso
export const CheckConvocatoria = (paramName = 'id') =>
  SetMetadata(CHECK_CONVOCATORIA_KEY, paramName);
