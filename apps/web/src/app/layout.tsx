import type { Metadata } from "next";
import { IBM_Plex_Sans, Open_Sans } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next";
import { QueryProvider } from "@/lib/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// fuentes oficiales de marca. Open Sans = cuerpo (--font-sans); IBM Plex Sans =
// titulos (--font-heading/--font-display). globals.css las referencia por var().
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const ibmPlex = IBM_Plex_Sans({
  variable: "--font-ibm-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  // base para resolver URLs relativas (canonical, imagenes de Open Graph)
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SUPERIMPACT360 - Plataforma de Competencias Empresariales",
    template: "%s | SUPERIMPACT360",
  },
  description:
    "Plataforma de competencias empresariales en Bolivia. Postula tu empresa y compite por un monto.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${openSans.variable} ${ibmPlex.variable} font-sans antialiased`}
      >
        <NuqsAdapter>
          <QueryProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </QueryProvider>
        </NuqsAdapter>
        <Toaster />
      </body>
    </html>
  );
}
