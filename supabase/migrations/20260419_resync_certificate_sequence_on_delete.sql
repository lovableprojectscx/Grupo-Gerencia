-- ============================================================================
-- Migration: Resincronización automática de secuencia al borrar certificado
-- Fecha: 2026-04-19
--
-- CONTEXTO
--   La versión previa de delete_certificate_reclaim_number
--   (20260315_fix_delete_certificate_race_condition.sql) solo decrementaba
--   last_number cuando el certificado borrado era exactamente el último emitido.
--   Esto provocaba que al borrar certificados intermedios o fuera de orden,
--   last_number se quedaba desfasado arriba, y los próximos certificados
--   salían con números con huecos (ej. existe 101 pero el siguiente sale 121).
--
-- SOLUCIÓN DEFINITIVA
--   1. Al borrar un certificado, recalcular last_number al MAX real
--      (registration_number) de los certificados restantes del curso.
--   2. Si no quedan certificados, dejar last_number en 100 para que el
--      próximo generado sea 101.
--   3. Usar SELECT ... FOR UPDATE sobre la fila de secuencia del curso para
--      evitar race condition con generate_certificate_v2 ejecutándose en
--      paralelo. Esto serializa las modificaciones por curso.
--
-- COMPATIBILIDAD
--   Misma firma pública que la versión anterior: void delete_certificate_reclaim_number(uuid).
--   El frontend sigue funcionando sin cambios (courseService.ts).
--
-- RESINCRONIZACIÓN EXPLÍCITA (nueva)
--   Se añade también resync_course_certificate_sequence(p_course_id uuid)
--   para poder disparar manualmente el realineamiento desde la UI o desde
--   un script administrativo, por si alguna vez se hace una limpieza directa
--   por SQL sin pasar por las RPCs.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Reemplazar delete_certificate_reclaim_number con versión resincronizante
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_certificate_reclaim_number(p_certificate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_course_id   uuid;
    v_real_max    integer;
    v_seq_exists  boolean;
BEGIN
    -- 1. Obtener el course_id del certificado a borrar
    SELECT e.course_id
      INTO v_course_id
    FROM certificates c
    JOIN enrollments  e ON c.enrollment_id = e.id
    WHERE c.id = p_certificate_id;

    -- Si no existe el certificado, salir silenciosamente (idempotente)
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- 2. Bloquear la fila de secuencia del curso (FOR UPDATE) para serializar
    --    con cualquier generate_certificate_v2 o resync paralelo sobre el
    --    mismo curso. Si no existe la fila, la creamos con el default 100.
    SELECT true INTO v_seq_exists
    FROM course_certificate_sequences
    WHERE course_id = v_course_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO course_certificate_sequences (course_id, last_number)
        VALUES (v_course_id, 100)
        ON CONFLICT (course_id) DO NOTHING;

        -- Re-bloquear ahora que existe
        PERFORM 1
        FROM course_certificate_sequences
        WHERE course_id = v_course_id
        FOR UPDATE;
    END IF;

    -- 3. Borrar el certificado
    DELETE FROM certificates
    WHERE id = p_certificate_id;

    -- 4. Recalcular el MAX real AFTER el DELETE y con la fila de secuencia
    --    ya bloqueada (así nadie puede insertar mientras calculamos).
    SELECT COALESCE(MAX(c.registration_number), 100)
      INTO v_real_max
    FROM certificates c
    JOIN enrollments  e ON c.enrollment_id = e.id
    WHERE e.course_id = v_course_id;

    -- 5. Actualizar last_number al MAX real, pero NUNCA por debajo de 100
    UPDATE course_certificate_sequences
    SET last_number = GREATEST(100, v_real_max)
    WHERE course_id = v_course_id;
END;
$$;


-- ----------------------------------------------------------------------------
-- 2. Nueva RPC: resync_course_certificate_sequence
--    Permite al admin resincronizar manualmente un curso sin borrar nada.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resync_course_certificate_sequence(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_real_max      integer;
    v_old_last      integer;
    v_new_last      integer;
BEGIN
    -- Bloquear la fila de secuencia del curso
    SELECT last_number
      INTO v_old_last
    FROM course_certificate_sequences
    WHERE course_id = p_course_id
    FOR UPDATE;

    -- Si no existe la fila, la creamos en 100
    IF NOT FOUND THEN
        INSERT INTO course_certificate_sequences (course_id, last_number)
        VALUES (p_course_id, 100)
        ON CONFLICT (course_id) DO NOTHING;
        v_old_last := 100;

        PERFORM 1
        FROM course_certificate_sequences
        WHERE course_id = p_course_id
        FOR UPDATE;
    END IF;

    -- Calcular MAX real de certificados existentes
    SELECT COALESCE(MAX(c.registration_number), 100)
      INTO v_real_max
    FROM certificates c
    JOIN enrollments  e ON c.enrollment_id = e.id
    WHERE e.course_id = p_course_id;

    v_new_last := GREATEST(100, v_real_max);

    UPDATE course_certificate_sequences
    SET last_number = v_new_last
    WHERE course_id = p_course_id;

    RETURN jsonb_build_object(
        'course_id',      p_course_id,
        'previous_last',  v_old_last,
        'new_last',       v_new_last,
        'next_number',    v_new_last + 1,
        'changed',        (v_old_last IS DISTINCT FROM v_new_last)
    );
END;
$$;


-- ----------------------------------------------------------------------------
-- 3. Resincronización ÚNICA e inmediata de toda la base al aplicar
--    esta migración (one-shot backfill). Corrige el desfase actual.
-- ----------------------------------------------------------------------------
UPDATE course_certificate_sequences s
SET last_number = GREATEST(100, COALESCE((
    SELECT MAX(c.registration_number)
    FROM certificates c
    JOIN enrollments  e ON c.enrollment_id = e.id
    WHERE e.course_id = s.course_id
), 100))
WHERE s.last_number IS DISTINCT FROM GREATEST(100, COALESCE((
    SELECT MAX(c.registration_number)
    FROM certificates c
    JOIN enrollments  e ON c.enrollment_id = e.id
    WHERE e.course_id = s.course_id
), 100));


-- ----------------------------------------------------------------------------
-- 4. Permisos para llamar a las RPCs desde el cliente con rol authenticated
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION delete_certificate_reclaim_number(uuid)
    TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION resync_course_certificate_sequence(uuid)
    TO authenticated, service_role;
