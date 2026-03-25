import { jwtVerify } from "jose";
import type { RolUsuario } from "@superstars/shared";

// payload decodificado del access token
export interface TokenPayload {
  sub: number;
  email: string;
  rol: RolUsuario;
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// verifica firma JWT y retorna payload o null si es invalido/expirado
export async function verifyAccessToken(
  token: string,
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    // verificar que los campos requeridos existen
    if (
      typeof payload.sub !== "number" ||
      typeof payload.email !== "string" ||
      typeof payload.rol !== "string"
    ) {
      return null;
    }

    return {
      sub: payload.sub as number,
      email: payload.email as string,
      rol: payload.rol as RolUsuario,
    };
  } catch {
    return null;
  }
}
