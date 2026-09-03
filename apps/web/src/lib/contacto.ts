// Datos de contacto del programa. Viven en un solo lugar para que el numero y
// el correo no queden repetidos (y desincronizados) en el pie, la pagina de
// contacto y el banner.

export const CONTACT_EMAIL = "bolivia@fundes.org";

// numero de WhatsApp con codigo de pais de Bolivia (591), sin espacios ni signos
export const WHATSAPP_NUMERO = "59169932699";

// como se muestra en pantalla
export const WHATSAPP_DISPLAY = "+591 69932699";

// mensaje con el que se abre la conversacion, para que la persona no empiece
// de cero y el equipo sepa de donde viene el contacto
const WHATSAPP_MENSAJE = "Hola, tengo una consulta sobre el programa Empresas SUPERSTAR.";

// enlace que abre WhatsApp directamente (app o web, segun el dispositivo)
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(
  WHATSAPP_MENSAJE,
)}`;
