-- ==============================================================================
-- Migration: Plantilla de certificado — fallback + refresh + bloqueo si vacía
-- Fecha: 2026-04-19
--
-- PROBLEMA
--   1. Cuando un curso se crea SIN certificate_template (empty array / null / sin
--      fields ni bgImage), al generar un certificado el template_snapshot queda
--      VACÍO. El estudiante no puede descargar nada.
--   2. Si el admin sube la plantilla DESPUÉS de que los certificados ya fueron
--      emitidos, los certificados viejos siguen con el snapshot vacío — nadie
--      refresca nada automáticamente.
--
-- SOLUCIÓN
--   A) generate_certificate_v2 se reforza con:
--        - Si el course.certificate_template está vacío, usa
--          site_settings.default_certificate_template como fallback.
--        - Si ninguno de los dos existe, RAISE EXCEPTION con mensaje claro
--          (nunca emite un cert "nacido roto").
--   B) Nueva RPC refresh_certificate_template_snapshot(p_certificate_id):
--        Reemplaza metadata.template_snapshot del certificado con el
--        certificate_template ACTUAL del curso asociado. Admin-only.
--   C) Nueva RPC refresh_course_certificates_template(p_course_id):
--        Bulk: refresca el snapshot de TODOS los certificados del curso.
--        Devuelve la cantidad actualizada. Admin-only.
--
-- SEGURIDAD
--   Las dos nuevas RPC validan role = 'admin'. No tocan registration_number
--   ni la secuencia — solo el snapshot visual.
-- ==============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- Helper interno: determina si un template JSONB es "usable"
-- (tiene al menos fields con contenido o alguna imagen de fondo)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._certificate_template_is_usable(p_template jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_template IS NULL THEN
        RETURN false;
    END IF;

    -- Si viene como array vacío [] o objeto vacío {} → no usable
    IF jsonb_typeof(p_template) = 'array' AND jsonb_array_length(p_template) = 0 THEN
        RETURN false;
    END IF;

    IF jsonb_typeof(p_template) = 'object' THEN
        -- Usable si tiene fields no-vacío O bgImageFront/bgImage con contenido
        IF jsonb_typeof(p_template->'fields') = 'array'
           AND jsonb_array_length(p_template->'fields') > 0 THEN
            RETURN true;
        END IF;

        IF COALESCE(p_template->>'bgImageFront', '') <> ''
           OR COALESCE(p_template->>'bgImage', '') <> '' THEN
            RETURN true;
        END IF;

        RETURN false;
    END IF;

    -- Otros tipos (string, number, boolean) no son templates válidos
    RETURN false;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. REEMPLAZAR generate_certificate_v2
--    Ahora con fallback a site_settings.default_certificate_template y error
--    claro si ninguno es usable.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_certificate_v2(
    p_enrollment_id uuid,
    p_preferences   jsonb    DEFAULT '{}'::jsonb,
    p_year          integer  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_enrollment        record;
    v_course_id         uuid;
    v_certificate_id    uuid;
    v_registration_code integer;
    v_existing_cert_id  uuid;
    v_metadata          jsonb;
    v_course_template   jsonb;
    v_site_default      jsonb;
    v_effective_template jsonb;
    v_template_source   text;      -- 'course', 'site_default' o 'none'
    v_year              integer;
    v_template_year     integer;
BEGIN
    -- Obtener matrícula
    SELECT * INTO v_enrollment FROM enrollments WHERE id = p_enrollment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Enrollment not found';
    END IF;
    v_course_id := v_enrollment.course_id;

    -- Obtener plantilla del curso
    SELECT certificate_template INTO v_course_template
    FROM courses WHERE id = v_course_id;

    -- Si no es usable, intentar con la default del sitio
    IF public._certificate_template_is_usable(v_course_template) THEN
        v_effective_template := v_course_template;
        v_template_source := 'course';
    ELSE
        SELECT default_certificate_template INTO v_site_default
        FROM site_settings LIMIT 1;

        IF public._certificate_template_is_usable(v_site_default) THEN
            v_effective_template := v_site_default;
            v_template_source := 'site_default';
        ELSE
            -- Ningún template disponible → bloquear emisión
            RAISE EXCEPTION
                'No se puede emitir el certificado: este curso no tiene plantilla configurada y no hay plantilla por defecto del sitio. Por favor, configure la plantilla del curso antes de emitir certificados.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    -- Extraer año de la plantilla efectiva
    BEGIN
        v_template_year := (v_effective_template->>'registrationYear')::integer;
    EXCEPTION WHEN others THEN
        v_template_year := NULL;
    END;

    v_year := COALESCE(p_year, v_template_year, EXTRACT(YEAR FROM NOW())::integer);

    -- ¿Ya existe un cert para esta matrícula?
    SELECT id INTO v_existing_cert_id
    FROM certificates WHERE enrollment_id = p_enrollment_id;

    IF v_existing_cert_id IS NOT NULL THEN
        RETURN jsonb_build_object('id', v_existing_cert_id, 'is_new', false);
    END IF;

    -- Número atómico
    WITH upsert AS (
        INSERT INTO course_certificate_sequences (course_id, last_number)
        VALUES (v_course_id, 101)
        ON CONFLICT (course_id) DO UPDATE
            SET last_number = course_certificate_sequences.last_number + 1
        RETURNING last_number
    )
    SELECT last_number INTO v_registration_code FROM upsert;

    v_metadata := p_preferences || jsonb_build_object(
        'generated_at',        now(),
        'registration_number', v_registration_code,
        'registration_year',   v_year,
        'template_snapshot',   v_effective_template,
        'template_source',     v_template_source
    );

    INSERT INTO certificates (enrollment_id, code, metadata, registration_number)
    VALUES (p_enrollment_id, gen_random_uuid(), v_metadata, v_registration_code)
    RETURNING id INTO v_certificate_id;

    RETURN jsonb_build_object(
        'id',                  v_certificate_id,
        'registration_number', v_registration_code,
        'registration_year',   v_year,
        'template_source',     v_template_source,
        'is_new',              true
    );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RPC: refresh_certificate_template_snapshot(p_certificate_id)
--    Actualiza el template_snapshot del certificado al template actual del curso
--    (o al site default si el del curso no es usable).
--    Útil cuando el admin subió la plantilla DESPUÉS de emitir el cert.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_certificate_template_snapshot(p_certificate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_course_id        uuid;
    v_course_template  jsonb;
    v_site_default     jsonb;
    v_new_template     jsonb;
    v_source           text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Acceso denegado: solo administradores';
    END IF;

    SELECT e.course_id INTO v_course_id
    FROM certificates c
    JOIN enrollments  e ON e.id = c.enrollment_id
    WHERE c.id = p_certificate_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Certificado no encontrado';
    END IF;

    SELECT certificate_template INTO v_course_template
    FROM courses WHERE id = v_course_id;

    IF public._certificate_template_is_usable(v_course_template) THEN
        v_new_template := v_course_template;
        v_source := 'course';
    ELSE
        SELECT default_certificate_template INTO v_site_default FROM site_settings LIMIT 1;
        IF public._certificate_template_is_usable(v_site_default) THEN
            v_new_template := v_site_default;
            v_source := 'site_default';
        ELSE
            RAISE EXCEPTION
                'No se puede refrescar: ni el curso ni el sitio tienen una plantilla configurada.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    UPDATE certificates
    SET metadata = COALESCE(metadata, '{}'::jsonb)
                   || jsonb_build_object(
                        'template_snapshot', v_new_template,
                        'template_source',   v_source,
                        'snapshot_refreshed_at', now()
                      )
    WHERE id = p_certificate_id;

    RETURN jsonb_build_object(
        'certificate_id',  p_certificate_id,
        'template_source', v_source,
        'refreshed',       true
    );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RPC: refresh_course_certificates_template(p_course_id)
--    Bulk: refresca el snapshot de TODOS los certificados del curso.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_course_certificates_template(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_course_template  jsonb;
    v_site_default     jsonb;
    v_new_template     jsonb;
    v_source           text;
    v_updated_count    integer;
    v_total_count      integer;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Acceso denegado: solo administradores';
    END IF;

    SELECT certificate_template INTO v_course_template
    FROM courses WHERE id = p_course_id;

    IF public._certificate_template_is_usable(v_course_template) THEN
        v_new_template := v_course_template;
        v_source := 'course';
    ELSE
        SELECT default_certificate_template INTO v_site_default FROM site_settings LIMIT 1;
        IF public._certificate_template_is_usable(v_site_default) THEN
            v_new_template := v_site_default;
            v_source := 'site_default';
        ELSE
            RAISE EXCEPTION
                'No se puede refrescar en bloque: el curso no tiene plantilla y no hay plantilla por defecto en el sitio. Configure la plantilla primero.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    SELECT COUNT(*)::integer INTO v_total_count
    FROM certificates c
    JOIN enrollments e ON e.id = c.enrollment_id
    WHERE e.course_id = p_course_id;

    WITH upd AS (
        UPDATE certificates c
        SET metadata = COALESCE(c.metadata, '{}'::jsonb)
                       || jsonb_build_object(
                            'template_snapshot', v_new_template,
                            'template_source',   v_source,
                            'snapshot_refreshed_at', now()
                          )
        FROM enrollments e
        WHERE c.enrollment_id = e.id
          AND e.course_id = p_course_id
        RETURNING c.id
    )
    SELECT COUNT(*)::integer INTO v_updated_count FROM upd;

    RETURN jsonb_build_object(
        'course_id',        p_course_id,
        'template_source',  v_source,
        'total',            v_total_count,
        'updated',          v_updated_count
    );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Nueva RPC: course_has_usable_certificate_template(p_course_id)
--    Útil para la UI: saber si un curso puede emitir certificados o no.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.course_has_usable_certificate_template(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_course_template jsonb;
    v_site_default    jsonb;
    v_course_ok       boolean;
    v_site_ok         boolean;
BEGIN
    SELECT certificate_template INTO v_course_template
    FROM courses WHERE id = p_course_id;

    v_course_ok := public._certificate_template_is_usable(v_course_template);

    SELECT default_certificate_template INTO v_site_default FROM site_settings LIMIT 1;
    v_site_ok := public._certificate_template_is_usable(v_site_default);

    RETURN jsonb_build_object(
        'course_id',      p_course_id,
        'course_usable',  v_course_ok,
        'site_usable',    v_site_ok,
        'can_emit',       v_course_ok OR v_site_ok,
        'preferred_source', CASE
                              WHEN v_course_ok THEN 'course'
                              WHEN v_site_ok   THEN 'site_default'
                              ELSE 'none'
                            END
    );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Permisos
-- ─────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.generate_certificate_v2(uuid, jsonb, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_certificate_template_snapshot(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_course_certificates_template(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.course_has_usable_certificate_template(uuid)  TO authenticated;
