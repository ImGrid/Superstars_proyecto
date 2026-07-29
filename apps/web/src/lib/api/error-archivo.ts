// Mensajes de error para las transferencias de archivos.
// Cuando la transferencia se corta a medias el servidor nunca responde, asi que
// `error.response` viene vacio y el codigo del error es lo unico que dice que paso.
// Sin esto el usuario solo ve un mensaje generico y no sabe si el problema fue
// su conexion, el archivo o el sistema.

type ErrorTransferencia = {
  code?: string;
  response?: { data?: { message?: string | string[] } };
};

// mensaje que mando el backend, si alcanzo a responder
function mensajeDelServidor(error: unknown): string | null {
  const msg = (error as ErrorTransferencia)?.response?.data?.message;
  if (!msg) {
    return null;
  }
  return Array.isArray(msg) ? msg[0] : msg;
}

function codigo(error: unknown): string | undefined {
  return (error as ErrorTransferencia)?.code;
}

// Error al subir un archivo. `fallback` es el mensaje para cualquier otra causa.
export function mensajeErrorSubida(error: unknown, fallback: string): string {
  const delServidor = mensajeDelServidor(error);
  if (delServidor) {
    return delServidor;
  }

  if (codigo(error) === "ECONNABORTED") {
    return "La subida se interrumpió porque la conexión está lenta. El archivo no se guardó, vuelve a intentarlo.";
  }

  if (codigo(error) === "ERR_NETWORK") {
    return "Se perdió la conexión a internet. El archivo no se guardó, revisa tu red y vuelve a intentarlo.";
  }

  return fallback;
}

// Error al descargar un archivo. `fallback` es el mensaje para cualquier otra causa.
export function mensajeErrorDescarga(error: unknown, fallback: string): string {
  const delServidor = mensajeDelServidor(error);
  if (delServidor) {
    return delServidor;
  }

  if (codigo(error) === "ECONNABORTED") {
    return "La descarga se interrumpió porque la conexión está lenta. Vuelve a intentarlo.";
  }

  if (codigo(error) === "ERR_NETWORK") {
    return "Se perdió la conexión a internet. Revisa tu red y vuelve a intentarlo.";
  }

  return fallback;
}
