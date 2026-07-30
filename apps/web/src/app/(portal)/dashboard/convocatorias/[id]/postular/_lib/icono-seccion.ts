// Map de seccion.id -> icono Phosphor. Las dos secciones del template default son
// fijas (sec_contacto y sec_empresa); para secciones custom que el responsable
// agregue, devolvemos un icono generico de "lista" para no romper la UI.
// Vive aparte para que el wizard del proponente y la vista previa del builder
// muestren exactamente el mismo icono.
export function iconParaSeccion(seccionId: string): string {
  switch (seccionId) {
    case "sec_contacto":
      return "ph:user-circle-duotone";
    case "sec_empresa":
      return "ph:buildings-duotone";
    default:
      return "ph:list-bullets-duotone";
  }
}
