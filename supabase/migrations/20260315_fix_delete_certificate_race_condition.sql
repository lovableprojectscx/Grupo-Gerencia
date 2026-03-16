-- ==============================================================================
-- Fix: delete_certificate_reclaim_number — race condition al decrementar secuencia
-- Problema: dos borrados simultáneos del último certificado podían decrementar
-- la secuencia dos veces. El UPDATE ahora es condicional y atómico:
-- solo actualiza si last_number NO cambió entre el SELECT y el UPDATE.
-- ==============================================================================

CREATE OR REPLACE FUNCTION delete_certificate_reclaim_number(p_certificate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cert_record record;
    v_course_id uuid;
    v_current_seq integer;
BEGIN
    -- Obtener el certificado a borrar
    SELECT c.registration_number, e.course_id INTO v_cert_record
    FROM certificates c
    JOIN enrollments e ON c.enrollment_id = e.id
    WHERE c.id = p_certificate_id;

    -- Si no existe, salir silenciosamente
    IF NOT FOUND THEN
        RETURN;
    END IF;

    v_course_id := v_cert_record.course_id;

    -- Borrar el certificado
    DELETE FROM certificates WHERE id = p_certificate_id;

    -- Leer la secuencia actual
    SELECT last_number INTO v_current_seq
    FROM course_certificate_sequences
    WHERE course_id = v_course_id;

    -- Decrementar SOLO si el certificado borrado era el último de la secuencia
    -- y el UPDATE es condicional (WHERE last_number = v_current_seq) para
    -- evitar la race condition donde dos transacciones paralelas decrementan dos veces.
    IF v_current_seq IS NOT NULL
       AND v_current_seq = v_cert_record.registration_number
       AND v_current_seq > 100
    THEN
        UPDATE course_certificate_sequences
        SET last_number = last_number - 1
        WHERE course_id = v_course_id
          AND last_number = v_current_seq;  -- condición atómica anti-race
    END IF;
END;
$$;
