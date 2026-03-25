import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/verify-token";
import { isRoleAllowed, getDefaultRoute } from "@/lib/auth/route-config";

// rutas que no requieren autenticacion
const publicPaths = [
  "/",
  "/concursos",
  "/resultados",
  "/noticias",
  "/faq",
  "/contacto",
  "/auth/login",
  "/auth/registro",
];

function isPublicPath(pathname: string): boolean {
  if (publicPaths.includes(pathname)) return true;

  // sub-rutas publicas
  if (pathname.startsWith("/concursos/")) return true;
  if (pathname.startsWith("/resultados/")) return true;
  if (pathname.startsWith("/noticias/")) return true;
  if (pathname.startsWith("/auth/")) return true;

  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // rutas publicas pasan directo
  if (isPublicPath(pathname)) {
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
    // excluir archivos estaticos, imagenes y favicon
    "/((?!_next/static|_next/image|images|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
