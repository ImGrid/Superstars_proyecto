import { apiClient, apiFileClient } from "./client";
import type {
  ReporteCatalogoResponse,
  ReporteQueryDto,
  TipoReporte,
  FormatoReporte,
} from "@superstars/shared";

// GET /api/reportes
// Catalogo: que reportes hay, cuantas filas tendria cada uno y en que formatos.
export function getCatalogoReportes() {
  return apiClient
    .get<ReporteCatalogoResponse>("/reportes")
    .then((r) => r.data);
}

// Archivo descargado, ya con el nombre que le puso el servidor
export interface DescargaReporte {
  blob: Blob;
  nombreArchivo: string;
}

// El servidor manda el nombre en Content-Disposition. Si no llegara (por ejemplo
// si un proxy lo quita), se arma uno para que el archivo no caiga como "descarga".
function nombreDesdeCabecera(
  cabecera: string | undefined,
  tipo: TipoReporte,
  formato: FormatoReporte,
): string {
  const extension = formato === "pdf" ? "pdf" : "xlsx";
  if (!cabecera) return `superstar-${tipo}.${extension}`;

  const coincidencia = /filename="?([^"]+)"?/.exec(cabecera);
  if (!coincidencia) return `superstar-${tipo}.${extension}`;

  // el backend lo manda codificado para admitir acentos
  try {
    return decodeURIComponent(coincidencia[1]);
  } catch {
    return coincidencia[1];
  }
}

// GET /api/reportes/:tipo
//
// Devuelve el archivo. Los filtros que no apliquen al reporte pedido los ignora
// el servidor, asi que se pueden mandar todos sin revisar cuales corresponden.
export function descargarReporte(
  tipo: TipoReporte,
  filtros: Partial<ReporteQueryDto>,
): Promise<DescargaReporte> {
  const params: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor === undefined || valor === null || valor === "") continue;
    params[clave] = String(valor);
  }

  return apiFileClient
    .get(`/reportes/${tipo}`, { params, responseType: "blob" })
    .then((r) => ({
      blob: r.data as Blob,
      nombreArchivo: nombreDesdeCabecera(
        r.headers["content-disposition"] as string | undefined,
        tipo,
        (filtros.formato ?? "excel") as FormatoReporte,
      ),
    }));
}

// Guarda el archivo en el equipo de la persona.
export function guardarArchivo({ blob, nombreArchivo }: DescargaReporte): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

// Lee el mensaje de error de una descarga que fallo.
//
// Con responseType "blob" axios entrega TAMBIEN el cuerpo del error como Blob,
// asi que `error.response.data.message` viene vacio y el mensaje del servidor se
// pierde. Y aqui esos mensajes importan: "el servidor esta generando otro
// reporte", "la generacion de PDF no esta configurada", "demasiadas descargas".
// Sin leer el Blob, la persona solo veria un texto generico.
export async function mensajeErrorReporte(
  error: unknown,
  respaldo: string,
): Promise<string> {
  const respuesta = (
    error as { response?: { status?: number; data?: unknown } }
  )?.response;

  if (respuesta?.data instanceof Blob) {
    try {
      const texto = await respuesta.data.text();
      const cuerpo = JSON.parse(texto) as { message?: string | string[] };
      const mensaje = Array.isArray(cuerpo.message)
        ? cuerpo.message[0]
        : cuerpo.message;
      if (mensaje) return mensaje;
    } catch {
      // el cuerpo no era JSON; se sigue con los casos de mas abajo
    }
  }

  // Cuando ni siquiera hay respuesta, el codigo del error es lo unico que
  // distingue un corte de conexion de una demora.
  const codigo = (error as { code?: string })?.code;
  if (codigo === "ECONNABORTED") {
    return "La descarga tardó demasiado. El reporte puede ser muy grande; prueba con un filtro o vuelve a intentarlo.";
  }
  if (codigo === "ERR_NETWORK") {
    return "Se perdió la conexión a internet. Revisa tu red y vuelve a intentarlo.";
  }

  return respaldo;
}
