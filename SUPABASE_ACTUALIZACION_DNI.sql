-- ==============================================================================
-- Actualización: Permitir búsqueda de certificados por DNI, ID o Código
-- ==============================================================================

CREATE OR REPLACE FUNCTION verify_certificate_search(search_code text)
RETURNS TABLE (
    student_name text,
    course_title text,
    issued_at timestamp with time zone,
    hours text,
    credential_id text,
    grade numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.full_name as student_name,
        c.title as course_title,
        cert.issued_at,
        COALESCE(
          cert.metadata->>'Horas Académicas',
          cert.metadata->>'Horas Lectivas',
          c.duration::text,
          '0'
        ) as hours,
        cert.id::text as credential_id,
        0::numeric as grade
    FROM certificates cert
    JOIN enrollments e ON cert.enrollment_id = e.id
    JOIN profiles p ON e.student_id = p.id
    JOIN courses c ON e.course_id = c.id
    WHERE 
        cert.id::text = search_code
        OR cert.code = search_code
        OR p.dni = search_code
    ORDER BY cert.issued_at DESC;
END;
$$;
