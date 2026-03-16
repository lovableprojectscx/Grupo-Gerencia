-- ==============================================================================
-- Fix: verify_certificate_search — proteger contra metadata que no sea array JSONB
-- El subquery jsonb_array_elements() lanzaba excepción si cr.metadata era un
-- objeto JSONB (no array), causando que la verificación fallara completamente.
-- ==============================================================================

CREATE OR REPLACE FUNCTION verify_certificate_search(search_code text)
RETURNS TABLE (
    id uuid,
    issued_at timestamp with time zone,
    student_name text,
    course_title text,
    course_metadata jsonb,
    credential_id text,
    grade text,
    hours text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cert.id,
        cert.issued_at,
        p.full_name AS student_name,
        cr.title AS course_title,
        cr.metadata AS course_metadata,
        cert.id::text AS credential_id,
        'Aprobado'::text AS grade,
        COALESCE(
            -- Solo intentar leer el array si metadata ES un array JSONB
            NULLIF(
                CASE WHEN jsonb_typeof(cr.metadata) = 'array' THEN
                    (SELECT m->>'value'
                     FROM jsonb_array_elements(cr.metadata) AS m
                     WHERE LOWER(m->>'key') LIKE '%horas%' AND m->>'value' <> ''
                     LIMIT 1)
                ELSE NULL END,
            ''),
            NULLIF(cr.duration::text, ''),
            '0'
        ) AS hours
    FROM certificates cert
    JOIN enrollments e ON cert.enrollment_id = e.id
    JOIN profiles p ON e.user_id = p.id
    JOIN courses cr ON e.course_id = cr.id
    WHERE
        cert.id::text = search_code
        OR cert.code = search_code
        OR p.dni = search_code
    ORDER BY cert.issued_at DESC;
END;
$$;
