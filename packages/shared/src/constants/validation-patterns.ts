// Patrones y limites de validacion compartidos entre frontend (zodResolver)
// y backend (createEmpresaSchema.parse).
//
// Mantener todo en un solo modulo facilita auditar y modificar reglas sin
// buscar regex regados por el codigo.

// NIT boliviano: 7 a 13 dígitos numéricos. Mantenemos el rango amplio porque
// el cliente confirmó que algunas empresas pequeñas usan documentos de menor
// longitud. Cuando una empresa no tiene NIT, el campo es opcional (el schema
// permite vacío); este regex solo aplica cuando el usuario tipea algo.
export const NIT_REGEX = /^\d{7,13}$/;

// Teléfonos bolivianos y formatos comunes:
//   78912345        (móvil 8 dígitos sin prefijo)
//   2-2345678       (fijo La Paz con guion)
//   +591 7 1234567  (con código país y espacios)
//   (591)78912345
// Permitimos dígitos, espacios, guion, paréntesis, opcionalmente prefijo +
// con un total de 6 a 20 caracteres (ajustado a la realidad: las cifras
// reales en BD van de 7 a 14 caracteres).
export const TELEFONO_REGEX = /^\+?[\d\s()-]{6,20}$/;

// Registro SEPREC: código alfanumérico, entre 4 y 30 caracteres. Además de
// guiones aceptamos barras y espacios porque en la BD de producción hay
// registros reales con ese formato (ej. "198/24"): con el regex anterior esa
// empresa no podía volver a guardar su perfil, y como el campo es opcional un
// dato así frenaba todo el registro.
export const SEPREC_REGEX = /^[A-Za-z0-9/\s-]{4,30}$/;

// Año de fundación: rango razonable. La empresa más vieja en datos reales
// declara 1972. Bajamos el piso a 1900 por margen y subimos el techo al año
// actual (calculado en runtime, no se hardcodea aquí).
export const ANIO_FUNDACION_MIN = 1900;

// Edad mínima del representante legal de la empresa (la persona de contacto).
// 18 años alinea con la mayoría de edad civil en Bolivia y es el umbral
// estándar para firmar contratos.
export const EDAD_MINIMA_REPRESENTANTE = 18;

// Edad máxima razonable. Evita capturar fechas absurdas como 1800.
export const EDAD_MAXIMA_REPRESENTANTE = 100;

// Límites de empleados. El tope alto (99999) cubre cualquier empresa real;
// el chequeo existe para evitar valores absurdos via cliente directo.
export const EMPLEADOS_MAX = 99999;

// Limites de longitud para texto libre. Coinciden con los placeholders del
// formulario y evitan payloads gigantes que abulten el JSONB de postulacion
// cuando se snapshotee.
export const RAZON_SOCIAL_MIN = 2;
export const RAZON_SOCIAL_MAX = 200;
export const CIUDAD_MIN = 2;
export const CIUDAD_MAX = 120;
export const DIRECCION_MIN = 4;
export const DIRECCION_MAX = 200;
export const CONTACTO_CARGO_MAX = 100;
export const DESCRIPCION_MAX_PALABRAS = 200;
