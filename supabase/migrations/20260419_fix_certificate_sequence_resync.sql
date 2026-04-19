-- ==============================================================================
-- MIGRACIÓN PERMANENTE: Blindar numeración de certificados
-- Archivo: 20260419_fix_certificate_sequence_resync.sql
-- Proyecto: Grupo Gerencia / Academia
-- Aplica:
--   1. Nueva versión de delete_certificate_reclaim_number (MAX real + FOR UPDATE)
--   2. Nueva RPC resync_course_certificate_sequence
--   3. Backfill one-shot para alinear todas las secuencias existentes
-- ==============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. REEMPLAZAR delete_certificate_reclaim_number
--    Cambios respecto a la versión anterior:
--    - Ya NO decrementa ingenuamente (last_number - 1)
--    - Recalcula el MAX real tras borrar con FOR UPDATE (row-level lock)
--    - Garantía total anti-race-condition: el UPDATE es atómico y basado en realidad
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.delete_certificate_reclaim_number(p_certificate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_course_id       uuid;
    v_max_remaining   integer;
BEGIN
    -- Obtener el curso ANTES de borrar (y bloquear la fila de secuencia contra concurrencia)
    SELECT e.course_id INTO v_course_id
    FROM public.certificates c
    JOIN public.enrollments e ON e.id = c.enrollment_id
    WHERE c.id = p_certificate_id;

    -- Si no existe el cert, salir silenciosamente
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Bloquear la fila de secuencia del curso (FOR UPDATE).
    -- Esto garantiza que ninguna otra transacción concurrent pueda modificarla
    -- hasta que esta transacción termine (COMMIT/ROLLBACK).
    PERFORM last_number
    FROM public.course_certificate_sequences
    WHERE course_id = v_course_id
    FOR UPDATE;

    -- Borrar el certificado
    DELETE FROM public.certificates WHERE id = p_certificate_id;

    -- Recalcular el MAX REAL tras el borrado
    SELECT COALESCE(MAX(c2.registration_number), 100)
    INTO v_max_remaining
    FROM public.certificates c2
    JOIN public.enrollments e2 ON e2.id = c2.enrollment_id
    WHERE e2.course_id = v_course_id
      AND c2.registration_number IS NOT NULL;

    -- Actualizar (o insertar) la secuencia al MAX real
    INSERT INTO public.course_certificate_sequences (course_id, last_number)
    VALUES (v_course_id, GREATEST(v_max_remaining, 100))
    ON CONFLICT (course_id) DO UPDATE
        SET last_number = GREATEST(EXCLUDED.last_number, 100);
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. NUEVA RPC: resync_course_certificate_sequence(p_course_id)
--    Alinea la secuencia de un curso al MAX real de certificados emitidos.
--    Útil para el botón "Resincronizar ahora" del panel de admin.
--    Devuelve un json con el estado antes y después.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.resync_course_certificate_sequence(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_previous_last   integer;
    v_max_real        integer;
    v_new_last        integer;
BEGIN
    -- Solo admins
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acceso denegado: solo administradores';
    END IF;

    -- Leer secuencia actual (con lock para evitar concurrencia)
    SELECT last_number INTO v_previous_last
    FROM public.course_certificate_sequences
    WHERE course_id = p_course_id
    FOR UPDATE;

    -- Si no existe aún, arrancar desde 100
    IF NOT FOUND THEN
        v_previous_last := 100;
    END IF;

    -- Calcular el MAX real de certificados emitidos
    SELECT COALESCE(MAX(c.registration_number), 100)
    INTO v_max_real
    FROM public.certificates c
    JOIN public.enrollments e ON e.id = c.enrollment_id
    WHERE e.course_id = p_course_id
      AND c.registration_number IS NOT NULL;

    v_new_last := GREATEST(v_max_real, 100);

    -- Insertar o actualizar la secuencia
    INSERT INTO public.course_certificate_sequences (course_id, last_number)
    VALUES (p_course_id, v_new_last)
    ON CONFLICT (course_id) DO UPDATE
        SET last_number = EXCLUDED.last_number;

    RETURN jsonb_build_object(
        'course_id',    p_course_id,
        'previous_last', v_previous_last,
        'new_last',     v_new_last,
        'next_number',  v_new_last + 1,
        'changed',      v_previous_last IS DISTINCT FROM v_new_last
    );
END;
$$;

-- Permitir que admins autenticados llamen a la RPC
GRANT EXECUTE ON FUNCTION public.resync_course_certificate_sequence(uuid) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. BACKFILL ONE-SHOT
--    Alinea TODAS las secuencias existentes al MAX real en el momento de aplicar
--    esta migración. Solo debe ejecutarse una vez (el INSERT ... ON CONFLICT
--    garantiza idempotencia si se repite).
-- ─────────────────────────────────────────────────────────────────────────────

-- 3-A. Actualizar filas existentes en course_certificate_sequences
UPDATE public.course_certificate_sequences cs
SET last_number = GREATEST(
    COALESCE((
        SELECT MAX(c.registration_number)
        FROM public.certificates c
        JOIN public.enrollments e ON e.id = c.enrollment_id
        WHERE e.course_id = cs.course_id
          AND c.registration_number IS NOT NULL
    ), 100),
    100
);

-- 3-B. Insertar filas para cursos con certificados pero sin secuencia registrada
INSERT INTO public.course_certificate_sequences (course_id, last_number)
SELECT
    e.course_id,
    GREATEST(COALESCE(MAX(c.registration_number), 100), 100)
FROM public.certificates c
JOIN public.enrollments e ON e.id = c.enrollment_id
WHERE c.registration_number IS NOT NULL
GROUP BY e.course_id
ON CONFLICT (course_id) DO NOTHING;

-- 3-C. Reporte del backfill (visible en los logs de migración)
DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.course_certificate_sequences;
    RAISE NOTICE 'Backfill completado: % cursos con secuencia registrada', v_count;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VERIFICACIÓN FINAL DE LA MIGRACIÓN
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
    cs.course_id,
    c.title                                                 AS curso,
    cs.last_number                                          AS secuencia,
    COALESCE(MAX(cert.registration_number), 0)              AS max_real,
    cs.last_number + 1                                      AS proximo_numero,
    CASE
        WHEN cs.last_number >= COALESCE(MAX(cert.registration_number), 0)
        THEN '✅ OK'
        ELSE '🔥 REVISAR'
    END                                                     AS estado
FROM public.course_certificate_sequences cs
LEFT JOIN public.courses c          ON c.id  = cs.course_id
LEFT JOIN public.enrollments e      ON e.course_id = cs.course_id
LEFT JOIN public.certificates cert  ON cert.enrollment_id = e.id
GROUP BY cs.course_id, c.title, cs.last_number
ORDER BY estado DESC, c.title;
