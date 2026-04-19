-- ==============================================================================
-- FIX INMEDIATO: Numeración de Certificados Desfasada
-- Proyecto: Grupo Gerencia / Academia
-- Ejecutar SECCIÓN POR SECCIÓN en el SQL Editor de Supabase
-- Sin deploy necesario — solo pegar y correr.
-- ==============================================================================

-- ==============================================================================
-- §1 — DIAGNÓSTICO: Estado actual de las secuencias vs. realidad
-- ==============================================================================

SELECT
    cs.course_id,
    c.title                                                          AS curso,
    cs.last_number                                                   AS secuencia_actual,
    COALESCE(MAX(cert.registration_number), 0)                       AS max_real_emitido,
    COUNT(cert.id)                                                   AS total_certificados,
    CASE
        WHEN cs.last_number > COALESCE(MAX(cert.registration_number), 0)
        THEN '⚠️  DESFASADA (+' || (cs.last_number - COALESCE(MAX(cert.registration_number), 0))::text || ')'
        WHEN cs.last_number < COALESCE(MAX(cert.registration_number), 0)
        THEN '🔥 PELIGRO: por debajo del max real'
        ELSE '✅ Alineada'
    END                                                              AS estado,
    COALESCE(MAX(cert.registration_number), 100) + 1                AS proximo_numero_correcto
FROM public.course_certificate_sequences cs
LEFT JOIN public.courses c        ON c.id  = cs.course_id
LEFT JOIN public.enrollments e    ON e.course_id = cs.course_id
LEFT JOIN public.certificates cert ON cert.enrollment_id = e.id
GROUP BY cs.course_id, c.title, cs.last_number
ORDER BY estado DESC, c.title;


-- ==============================================================================
-- §2 — DIAGNÓSTICO EXTENDIDO: Certificados sin secuencia registrada
-- (cursos con certs emitidos pero sin fila en course_certificate_sequences)
-- ==============================================================================

SELECT
    e.course_id,
    c.title                           AS curso,
    COUNT(cert.id)                    AS certs_emitidos,
    MAX(cert.registration_number)     AS max_numero,
    '❌ Sin secuencia registrada'      AS problema
FROM public.certificates cert
JOIN public.enrollments e  ON e.id  = cert.enrollment_id
JOIN public.courses c      ON c.id  = e.course_id
LEFT JOIN public.course_certificate_sequences cs ON cs.course_id = e.course_id
WHERE cs.course_id IS NULL
GROUP BY e.course_id, c.title
ORDER BY c.title;


-- ==============================================================================
-- §3 — DIAGNÓSTICO: Certificados con registration_number nulo
-- ==============================================================================

SELECT
    cert.id,
    cert.enrollment_id,
    c.title   AS curso,
    cert.issued_at,
    cert.registration_number
FROM public.certificates cert
JOIN public.enrollments e ON e.id = cert.enrollment_id
JOIN public.courses c     ON c.id = e.course_id
WHERE cert.registration_number IS NULL
ORDER BY cert.issued_at DESC;


-- ==============================================================================
-- §4 — FIX MASIVO: Resincronizar TODAS las secuencias al MAX real
-- ✅ Seguro: MAX real + 1 nunca puede producir duplicados.
-- ✅ Si un curso no tiene certificados → queda en 100 → próximo será 101.
-- ==============================================================================

-- 4-A. Insertar/actualizar secuencias para todos los cursos con certificados
INSERT INTO public.course_certificate_sequences (course_id, last_number)
SELECT
    e.course_id,
    GREATEST(COALESCE(MAX(cert.registration_number), 100), 100)
FROM public.certificates cert
JOIN public.enrollments e ON e.id = cert.enrollment_id
WHERE cert.registration_number IS NOT NULL
GROUP BY e.course_id
ON CONFLICT (course_id) DO UPDATE
SET last_number = GREATEST(
    EXCLUDED.last_number,
    100  -- nunca bajar de 100
);

-- 4-B. Para cursos con secuencia SIN certificados reales
--      (o con secuencia incorrectamente alta), resincronizar también
UPDATE public.course_certificate_sequences cs
SET last_number = GREATEST(
    COALESCE((
        SELECT MAX(cert.registration_number)
        FROM public.certificates cert
        JOIN public.enrollments e ON e.id = cert.enrollment_id
        WHERE e.course_id = cs.course_id
          AND cert.registration_number IS NOT NULL
    ), 100),
    100
);

-- 4-C. Insertar secuencias para cursos que tienen certificados pero ninguna fila en sequences
INSERT INTO public.course_certificate_sequences (course_id, last_number)
SELECT DISTINCT
    e.course_id,
    GREATEST(COALESCE(MAX(cert.registration_number) OVER (PARTITION BY e.course_id), 100), 100)
FROM public.certificates cert
JOIN public.enrollments e ON e.id = cert.enrollment_id
LEFT JOIN public.course_certificate_sequences cs ON cs.course_id = e.course_id
WHERE cs.course_id IS NULL
  AND cert.registration_number IS NOT NULL
ON CONFLICT (course_id) DO NOTHING;


-- ==============================================================================
-- §5 — VERIFICACIÓN POST-FIX: Confirmar que todo está alineado
-- ==============================================================================

SELECT
    cs.course_id,
    c.title                                                 AS curso,
    cs.last_number                                          AS secuencia_corregida,
    COALESCE(MAX(cert.registration_number), 0)              AS max_real_emitido,
    COUNT(cert.id)                                          AS total_certs,
    cs.last_number + 1                                      AS proximo_numero,
    CASE
        WHEN cs.last_number >= COALESCE(MAX(cert.registration_number), 0)
        THEN '✅ OK'
        ELSE '🔥 AÚN DESFASADA — revisar manualmente'
    END                                                     AS estado_final
FROM public.course_certificate_sequences cs
LEFT JOIN public.courses c         ON c.id = cs.course_id
LEFT JOIN public.enrollments e     ON e.course_id = cs.course_id
LEFT JOIN public.certificates cert ON cert.enrollment_id = e.id
GROUP BY cs.course_id, c.title, cs.last_number
ORDER BY estado_final DESC, c.title;
