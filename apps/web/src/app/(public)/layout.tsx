import { PublicNavbar } from "@/components/public/navbar";
import { PublicFooter } from "@/components/public/footer";

// La web publica reusa las fuentes oficiales de marca (IBM Plex Sans en titulos
// via font-display, Open Sans en cuerpo via font-body). Se cargan en el layout
// raiz y se heredan aqui; los tokens --font-display/--font-body las referencian.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="font-body">
      <PublicNavbar />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}
