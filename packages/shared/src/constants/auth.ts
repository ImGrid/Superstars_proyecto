// Constantes del flujo de verificacion por codigo. Compartidas entre backend
// (enforcement server-side) y frontend (UX del countdown). Mantenerlas en un
// solo lugar evita drift entre lo que el frontend muestra y lo que el server
// permite.

// Tope absoluto de reenvios antes de forzar re-registro completo
// (evita brute force via resend — HackTricks 2FA bypass)
export const RESEND_MAX = 6;

// Cooldown progresivo entre reenvios (en segundos), patron Twilio para SMS 2FA
// indice = numero de reenvios YA hechos. Despues del 5to+ se mantiene en 240s
// hasta llegar al RESEND_MAX
export const RESEND_COOLDOWNS_SEG: readonly number[] = [30, 40, 60, 90, 120, 240];

// Devuelve el cooldown requerido (en segundos) antes del proximo reenvio,
// dado cuantos reenvios ya se hicieron
export function computeResendCooldownSec(reenviosHechos: number): number {
  const idx = Math.min(reenviosHechos, RESEND_COOLDOWNS_SEG.length - 1);
  return RESEND_COOLDOWNS_SEG[idx];
}

// Tiempo de vida del codigo de verificacion (mostrado en el correo y en UI)
export const VERIFICACION_EXPIRACION_MINUTOS = 15;
