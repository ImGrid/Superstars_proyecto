"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavLink {
  label: string;
  href: string;
}

// links de navegacion del sitio publico
const navLinks: NavLink[] = [
  { label: "Inicio", href: "/" },
  { label: "Nosotros", href: "/#nosotros" },
  { label: "Como funciona", href: "/#como-funciona" },
  { label: "Concursos", href: "/concursos" },
  { label: "Noticias", href: "/noticias" },
  { label: "Resultados", href: "/resultados" },
  { label: "FAQ", href: "/faq" },
  { label: "Contacto", href: "/contacto" },
];

// rutas con hero oscuro donde el navbar inicia transparente
const darkHeroRoutes = ["/", "/concursos", "/noticias", "/faq"];

export function PublicNavbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const hasDarkHero = darkHeroRoutes.includes(pathname);

  // detectar scroll para cambiar fondo del navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // determinar si un link es ancla dentro de la landing
  const isAnchorLink = (href: string) => href.startsWith("/#");

  // determinar si un link esta activo
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (isAnchorLink(href)) return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  // manejar click en link ancla
  const handleAnchorClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (isAnchorLink(href) && pathname === "/") {
      e.preventDefault();
      const id = href.replace("/#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
    setOpen(false);
  };

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 shadow-sm backdrop-blur-md"
          : hasDarkHero
            ? "bg-transparent"
            : "bg-primary-800"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className={`font-heading text-xl font-bold tracking-tight transition-colors ${
              scrolled ? "text-primary-700" : "text-white"
            }`}
          >
            SUPERIMPACT360
          </span>
        </Link>

        {/* links desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              scroll={!isAnchorLink(link.href)}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? scrolled
                    ? "text-orange-600"
                    : "text-orange-400"
                  : scrolled
                    ? "text-secondary-700 hover:text-primary-700"
                    : "text-white/80 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA + mobile menu */}
        <div className="flex items-center gap-3">
          <Button
            asChild
            size="sm"
            className="hidden bg-orange-600 text-white hover:bg-orange-700 md:inline-flex"
          >
            <Link href="/auth/login">Acceso Empresas</Link>
          </Button>

          {/* hamburguesa mobile */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`md:hidden ${
                  scrolled
                    ? "text-secondary-700"
                    : "text-white hover:bg-white/10"
                }`}
              >
                <Menu className="size-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-white p-0">
              <SheetTitle className="sr-only">Menu de navegacion</SheetTitle>
              <div className="flex h-full flex-col">
                {/* header del sheet */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <Link
                    href="/"
                    className="flex items-center gap-2"
                    onClick={() => setOpen(false)}
                  >
                    <span className="font-heading text-lg font-bold tracking-tight text-primary-700">
                      SUPERIMPACT360
                    </span>
                  </Link>
                </div>

                {/* links mobile */}
                <div className="flex-1 overflow-y-auto py-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      scroll={!isAnchorLink(link.href)}
                      onClick={(e) => handleAnchorClick(e, link.href)}
                      className={`block px-6 py-3 text-sm font-medium transition-colors ${
                        isActive(link.href)
                          ? "bg-orange-50 text-orange-600"
                          : "text-secondary-700 hover:bg-secondary-50"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {/* CTA mobile */}
                <div className="border-t p-4">
                  <Button
                    asChild
                    className="w-full bg-orange-600 text-white hover:bg-orange-700"
                  >
                    <Link href="/auth/login" onClick={() => setOpen(false)}>
                      Acceso Empresas
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
