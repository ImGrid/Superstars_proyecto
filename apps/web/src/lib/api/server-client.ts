import "server-only";
import { cookies } from "next/headers";

const API_URL = process.env.API_URL;

// fetch wrapper para Server Components y Route Handlers
export async function serverFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const url = `${API_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: response.statusText,
      statusCode: response.status,
    }));
    throw error;
  }

  // manejar respuestas vacias (204)
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
