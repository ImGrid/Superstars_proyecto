import { Anton, Poppins } from "next/font/google";
import { PublicNavbar } from "@/components/public/navbar";
import { PublicFooter } from "@/components/public/footer";

// Tipografia de la web publica (guia del disenador). Se cargan aqui y no en el
// layout raiz para que el portal no las descargue ni las preloadee.
// Anton: titulos de seccion. Poppins: cuerpo del texto publico.
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${anton.variable} ${poppins.variable} font-body`}>
      <PublicNavbar />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}
