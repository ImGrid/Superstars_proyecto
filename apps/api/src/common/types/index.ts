// Formato estandar de respuesta de error del API
export interface ErrorResponse {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  errors?: { path: string; message: string }[];
}
