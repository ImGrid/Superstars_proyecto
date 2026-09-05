import axios, { type AxiosInstance } from "axios";

// instancia Axios para uso en el browser
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// instancia para transferir archivos (subidas y descargas). Es igual a apiClient
// salvo por el limite de tiempo: mover varios MB por una conexion lenta tarda
// mucho mas de 15s y cortar ahi cancela transferencias que iban bien.
//
// El limite es absoluto: axios corta a los N ms aunque la transferencia vaya
// avanzando bien. Con el techo anterior de 120s, subir el maximo permitido
// exigia unos 7 Mbps sostenidos; por debajo de eso la subida moria siempre al
// final, que es el peor momento posible. Con 15 minutos entra el caso lento
// (unos 0,9 Mbps para 100 MB), y la barra de progreso ya le muestra al usuario
// que la cosa avanza en vez de dejarlo mirando un spinner mudo.
const apiFileClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 900_000,
  withCredentials: true,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
  },
});

// porcentaje ya enviado de una subida. Axios no siempre conoce el total
// (p.ej. si el navegador no lo informa); en ese caso devuelve 0 y la barra
// se queda indeterminada en vez de mostrar un numero inventado.
export function porcentajeSubida(e: { loaded: number; total?: number }): number {
  if (!e.total) {
    return 0;
  }
  return Math.min(100, Math.round((e.loaded * 100) / e.total));
}

// flag para evitar multiples refreshes simultaneos
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(undefined);
    }
  });
  failedQueue = [];
}

// renovacion de sesion vencida. Se aplica a los dos clientes y comparten el flag,
// asi dos peticiones en paralelo no disparan dos refreshes. El refresh siempre
// sale por apiClient (es corto) y el reintento vuelve por el cliente que origino
// la peticion, para no perder el limite de tiempo largo de los archivos.
function attachRefreshInterceptor(instance: AxiosInstance) {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // si es 401 y no es el propio refresh endpoint
      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url?.includes("/auth/refresh")
      ) {
        if (isRefreshing) {
          // esperar a que termine el refresh en curso
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(() => instance(originalRequest));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          await apiClient.post("/auth/refresh");
          processQueue(null);
          return instance(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError);
          // redirigir a login si el refresh falla
          if (typeof window !== "undefined") {
            window.location.href = "/auth/login";
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
}

attachRefreshInterceptor(apiClient);
attachRefreshInterceptor(apiFileClient);

export { apiClient, apiFileClient };
