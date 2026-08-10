import { isAxiosError } from "axios";

// El backend responde 400 con "Debes registrar tu empresa antes de postular"
// (postulacion.service.resolveEmpresaId). Se busca la palabra en vez de la
// frase exacta para que un cambio de redaccion no rompa la deteccion en
// silencio y devuelva al error rojo generico.
const PALABRA_SIN_EMPRESA = "empresa";

// Respuestas que no cambian por reintentar: el recurso no existe (404) o falta
// un requisito del usuario (400). Reintentarlas solo multiplica peticiones y,
// peor, deja el error como "sin datos", que se confunde con "aun no hay nada".
export function esRespuestaDefinitiva(status?: number): boolean {
  return status === 404 || status === 400;
}

// Distingue "todavia no tiene empresa registrada" de cualquier otro fallo.
// Sin esto, el 400 se trataba igual que "aun no postulo" y la interfaz ofrecia
// postular a alguien que no podia guardar nada.
export function esFaltaEmpresa(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  if (error.response?.status !== 400) return false;
  const mensaje = (error.response?.data as { message?: string } | undefined)?.message;
  return typeof mensaje === "string" && mensaje.toLowerCase().includes(PALABRA_SIN_EMPRESA);
}
