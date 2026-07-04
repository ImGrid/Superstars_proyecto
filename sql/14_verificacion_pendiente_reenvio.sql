-- Agrega soporte para reenvio de codigo con cooldown progresivo y tope absoluto
-- Defensa contra el ataque "resend resetea rate limit" (HackTricks 2FA bypass):
--   - reenvios_solicitados: contador persistente del numero de reenvios para esta verificacion
--                           NO se resetea con cada codigo nuevo (solo en re-registracion completa)
--                           Permite enforcar tope absoluto (RESEND_MAX = 6) y cooldown progresivo
--   - ultimo_envio_at: marca del ultimo envio de codigo, usado para calcular cooldown server-side
-- La tabla esta vacia al momento de aplicar (verificado), por eso DEFAULT now() es seguro

BEGIN;

ALTER TABLE verificacion_pendiente
    ADD COLUMN reenvios_solicitados INT         NOT NULL DEFAULT 0,
    ADD COLUMN ultimo_envio_at      TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE verificacion_pendiente
    ADD CONSTRAINT chk_verif_pendiente_reenvios CHECK (reenvios_solicitados >= 0);

COMMIT;
