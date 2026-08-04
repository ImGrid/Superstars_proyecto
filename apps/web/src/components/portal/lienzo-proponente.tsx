// Lienzo tintado para las paginas del proponente.
//
// El portal renderiza todo dentro de <main class="p-4 md:p-6"> con fondo blanco,
// y las tarjetas tambien son blancas: medido, el contraste entre tarjeta y fondo
// es 1.00, o sea ninguno, y lo unico que las separa es un borde de 1.23:1. Sin
// una capa intermedia el ojo no puede agrupar por region y todo se lee plano.
//
// Los margenes negativos sacan el componente fuera del padding de <main> para
// que el tinte llegue hasta los bordes, y despues se repone ese mismo padding.
// Se aplica solo aca y no en el layout del portal porque el layout lo comparten
// tambien administrador, responsable y evaluador.
// secondary-100 (#f1f5f9) da 1.10 contra el blanco de las tarjetas. Se probo
// secondary-50 y a 1.03 no se percibe. De referencia, Mercado Pago usa 1.17.
export function LienzoProponente({ children }: { children: React.ReactNode }) {
  return (
    // overflow-x-clip: los margenes negativos hacen el lienzo tan ancho como la
    // ventana; sin esto aparece una barra horizontal cuando el navegador reserva
    // espacio para la barra vertical.
    <div className="-m-4 min-h-[calc(100dvh-4rem)] overflow-x-clip bg-secondary-100 p-4 md:-m-6 md:p-6">
      {children}
    </div>
  );
}
