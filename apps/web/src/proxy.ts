import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/verify-token";
import { isRoleAllowed, getDefaultRoute } from "@/lib/auth/route-config";

// Todo el portal cuelga de /dashboard; el resto del sitio es publico o es /auth.
// Antes se usaba una lista blanca de rutas publicas, pero eso hacia que cualquier
// URL inexistente (ej. /pagina-que-no-existe) redirigiera a login con un 307 en vez
// de devolver un 404. Los buscadores tomaban esas URLs fantasma como validas.
const PORTAL_PREFIX = "/dashboard";

function requiereAutenticacion(pathname: string): boolean {
  return pathname === PORTAL_PREFIX || pathname.startsWith(`${PORTAL_PREFIX}/`);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // publico, /auth y rutas inexistentes pasan directo
  // (las inexistentes las resuelve Next con not-found.tsx y un 404 real)
  if (!requiereAutenticacion(pathname)) {
    return NextResponse.next();
  }

  // verificar cookie de access_token
  const tokenCookie = request.cookies.get("access_token");
  if (!tokenCookie?.value) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // verificar firma JWT y extraer rol (chequeo optimista)
  const payload = await verifyAccessToken(tokenCookie.value);
  if (!payload) {
    // token invalido o expirado — redirigir a login
    // el interceptor axios hara refresh si es necesario
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // verificar que el rol tiene acceso a esta ruta
  if (!isRoleAllowed(pathname, payload.rol)) {
    // redirigir a la ruta default del rol
    const defaultRoute = getDefaultRoute(payload.rol);
    return NextResponse.redirect(new URL(defaultRoute, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // excluir archivos estaticos, imagenes, datos geo e iconos del sitio
    "/((?!_next/static|_next/image|images|geo|favicon.ico|icon.png|apple-icon.png|sitemap.xml|robots.txt).*)",
  ],
};
