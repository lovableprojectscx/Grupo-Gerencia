-- =============================================================================
-- Migración: Añadir año al número de registro del certificado
-- Fecha: 2026-03-05
-- El admin puede indicar el año al generar (ej. 2025, 2026).
-- Si no, el sistema leerá el año de la plantilla del curso. Como fallback, el año actual.
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_certificate_v2(
    p_enrollment_id uuid,
    p_preferences   jsonb    DEFAULT '{}'::jsonb,
    p_year          integer  DEFAULT NULL
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
    v_template_year     integer;
BEGIN
    -- Obtener detalles de la matrícula
    SELECT * INTO v_enrollment
    FROM enrollments
    WHERE id = p_enrollment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Enrollment not found';
    END IF;

    v_course_id := v_enrollment.course_id;

    -- Obtener snapshot de la plantilla del curso
    SELECT certificate_template INTO v_course_template
    FROM courses
    WHERE id = v_course_id;

    -- Extraer el año de la plantilla si existe
    BEGIN
        v_template_year := (v_course_template->>'registrationYear')::integer;
    EXCEPTION WHEN others THEN
        v_template_year := NULL;
    END;

    -- Año del certificado: 1. p_year (manual), 2. plantilla, 3. año actual
    v_year := COALESCE(p_year, v_template_year, EXTRACT(YEAR FROM NOW())::integer);

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
