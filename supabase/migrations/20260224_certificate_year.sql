-- =============================================================================
-- Migración: Añadir año al número de registro del certificado
-- Fecha: 2026-02-24
-- El admin puede indicar el año al generar (ej. 2025, 2026).
-- El número de registro se almacena como "101 - 2025" en metadata.
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_certificate_v2(
    p_enrollment_id uuid,
    p_preferences   jsonb    DEFAULT '{}'::jsonb,
    p_year          integer  DEFAULT NULL        -- Año del certificado (si es null, usa el año actual)
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
    v_year              integer;
BEGIN
    -- Año del certificado: el que indica el admin, o el año actual si no se especifica
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::integer);

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

    -- Número de registro atómico por curso
    WITH upsert AS (
        INSERT INTO course_certificate_sequences (course_id, last_number)
        VALUES (v_course_id, 101)
        ON CONFLICT (course_id) DO UPDATE
            SET last_number = course_certificate_sequences.last_number + 1
        RETURNING last_number
    )
    SELECT last_number INTO v_registration_code FROM upsert;

    -- Obtener snapshot de la plantilla del curso
    SELECT certificate_template INTO v_course_template
    FROM courses
    WHERE id = v_course_id;

    -- Preparar metadata incluyendo año del certificado
    v_metadata := p_preferences || jsonb_build_object(
        'generated_at',        now(),
        'registration_number', v_registration_code,
        'registration_year',   v_year,
        'template_snapshot',   v_course_template
    );

    -- Insertar certificado
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
        'id',                  v_certificate_id,
        'registration_number', v_registration_code,
        'registration_year',   v_year,
        'is_new',              true
    );
END;
$$;
