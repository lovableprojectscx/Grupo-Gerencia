-- =============================================================================
-- Migración: Correcciones de auditoría del sistema de certificados
-- Fecha: 2026-02-23
-- =============================================================================

-- A. Tabla para secuencias atómicas de números de registro por curso
--    Elimina la race condition del MAX+1 frágil anterior.
CREATE TABLE IF NOT EXISTS course_certificate_sequences (
    course_id UUID PRIMARY KEY REFERENCES courses(id),
    last_number INTEGER NOT NULL DEFAULT 100
);

-- B. Migración inicial: poblar con los máximos actuales por curso
--    Garantiza que los certificados futuros continúen desde el último número usado.
INSERT INTO course_certificate_sequences (course_id, last_number)
SELECT e.course_id, COALESCE(MAX(c.registration_number), 100)
FROM certificates c
JOIN enrollments e ON c.enrollment_id = e.id
GROUP BY e.course_id
ON CONFLICT (course_id) DO UPDATE
SET last_number = GREATEST(course_certificate_sequences.last_number, EXCLUDED.last_number);

-- C & D. Actualizar generate_certificate_v2:
--    - Usa operación atómica (INSERT ... ON CONFLICT DO UPDATE) para evitar race conditions
--    - Incluye template_snapshot en metadata para versionado de plantilla
CREATE OR REPLACE FUNCTION generate_certificate_v2(
    p_enrollment_id uuid,
    p_preferences jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_enrollment        record;
    v_course_id         uuid;
    v_certificate_id    uuid;
    v_registration_code integer;
    v_existing_cert_id  uuid;
    v_metadata          jsonb;
    v_course_template   jsonb;
BEGIN
    -- Obtener detalles de la matrícula
    SELECT * INTO v_enrollment
    FROM enrollments
    WHERE id = p_enrollment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Enrollment not found';
    END IF;

    v_course_id := v_enrollment.course_id;

    -- Verificar si ya existe certificado para esta matrícula
    SELECT id INTO v_existing_cert_id
    FROM certificates
    WHERE enrollment_id = p_enrollment_id;

    IF v_existing_cert_id IS NOT NULL THEN
        RETURN jsonb_build_object('id', v_existing_cert_id, 'is_new', false);
    END IF;

    -- Número de registro atómico: INSERT con ON CONFLICT DO UPDATE garantiza
    -- que dos transacciones simultáneas obtengan números distintos (sin race condition).
    WITH upsert AS (
        INSERT INTO course_certificate_sequences (course_id, last_number)
        VALUES (v_course_id, 101)
        ON CONFLICT (course_id) DO UPDATE
            SET last_number = course_certificate_sequences.last_number + 1
        RETURNING last_number
    )
    SELECT last_number INTO v_registration_code FROM upsert;

    -- Obtener snapshot actual de la plantilla del curso para versionado
    SELECT certificate_template INTO v_course_template
    FROM courses
    WHERE id = v_course_id;

    -- Preparar metadata incluyendo snapshot de plantilla
    v_metadata := p_preferences || jsonb_build_object(
        'generated_at',      now(),
        'registration_number', v_registration_code,
        'template_snapshot', v_course_template
    );

    -- Insertar nuevo certificado
    INSERT INTO certificates (
        enrollment_id,
        code,
        metadata,
        registration_number
    ) VALUES (
        p_enrollment_id,
        gen_random_uuid(),
        v_metadata,
        v_registration_code
    )
    RETURNING id INTO v_certificate_id;

    RETURN jsonb_build_object(
        'id',                v_certificate_id,
        'registration_number', v_registration_code,
        'is_new',            true
    );
END;
$$;
