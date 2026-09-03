-- Limpieza de usuarios de prueba que ensuciaban los reportes
--
-- El cliente pidio que los registros de prueba no aparezcan en las
-- exportaciones. Las postulaciones de prueba ya se borraron a mano; quedaban
-- usuarios proponentes de prueba que igual salian en el reporte de contactos.
--
-- Se borran por CORREO EXACTO, nunca por patron. Un filtro tipo
-- email LIKE '%test%' es una bomba de tiempo: manana se registra una persona
-- real cuyo correo contiene esa cadena y desaparece del reporte sin que nadie
-- se entere.
--
-- NO se borra proponente@superstars.com: es la cuenta con la que el equipo
-- entra al portal como proponente para probar el sistema. Sin ella no hay
-- forma de revisar la vista del postulante.
--
-- NO se borra poncehar0331@gmail.com (empresa BioAndes Cooperativa): es una
-- cuenta del equipo que no estaba en el pedido. Si tambien debe irse, agregar
-- su correo a la lista de abajo y volver a correr el script; hay que borrar
-- primero su empresa, porque fk_empresa_usuario es RESTRICT.
--
-- El script es idempotente: correrlo dos veces no falla ni borra de mas.
-- Antes de borrar comprueba que ninguno de los usuarios tenga datos reales
-- colgando. Si alguno los tuviera, aborta sin borrar nada en vez de destruir
-- informacion; eso puede pasar si el script se corre meses despues, cuando esa
-- cuenta ya se uso de verdad.
--
-- Verificacion en sql/26_verify_limpiar_usuarios_de_prueba.sql
-- No tiene rollback: los datos borrados no se pueden reconstruir. Hacer respaldo
-- antes de aplicarlo en produccion.

BEGIN;

DO $$
DECLARE
    correos text[] := ARRAY[
        'innovaplast@test.com',
        'ecoverde@test.com',
        'poncehar0331+prueba1@gmail.com'
    ];
    v_encontrados int;
    v_con_datos   int;
    v_borrados    int;
    v_detalle     text;
BEGIN
    SELECT count(*) INTO v_encontrados
    FROM usuario WHERE email = ANY(correos);

    IF v_encontrados = 0 THEN
        RAISE NOTICE 'Nada que hacer: ninguno de los correos existe (el script ya se aplico).';
        RETURN;
    END IF;

    -- Guarda de seguridad: ninguno debe tener datos reales asociados.
    SELECT count(*), string_agg(email, ', ') INTO v_con_datos, v_detalle
    FROM usuario u
    WHERE u.email = ANY(correos)
      AND (
            EXISTS (SELECT 1 FROM empresa e WHERE e.usuario_id = u.id)
         OR EXISTS (SELECT 1 FROM responsable_convocatoria rc WHERE rc.usuario_id = u.id)
         OR EXISTS (SELECT 1 FROM convocatoria c WHERE c.created_by = u.id)
         OR EXISTS (SELECT 1 FROM calificacion ca WHERE ca.evaluador_id = u.id)
         OR EXISTS (SELECT 1 FROM asignacion_evaluador ae WHERE ae.evaluador_id = u.id OR ae.asignado_por = u.id)
         OR EXISTS (SELECT 1 FROM evaluador_categoria ec WHERE ec.evaluador_id = u.id OR ec.asignado_por = u.id)
         OR EXISTS (SELECT 1 FROM notificacion_email n WHERE n.destinatario_id = u.id)
      );

    IF v_con_datos > 0 THEN
        RAISE EXCEPTION
            'Abortado: % usuario(s) de la lista tienen datos asociados (%). Revisar a mano antes de borrar.',
            v_con_datos, v_detalle;
    END IF;

    -- sesion_refresh_token y reset_password_pendiente se van solas (ON DELETE CASCADE);
    -- acceso_observador y descarga_reporte conservan el rastro con usuario_id en NULL.
    DELETE FROM usuario WHERE email = ANY(correos);
    GET DIAGNOSTICS v_borrados = ROW_COUNT;

    RAISE NOTICE 'Usuarios de prueba borrados: %', v_borrados;
END $$;

COMMIT;
