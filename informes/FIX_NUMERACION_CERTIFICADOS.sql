-- ============================================================================
-- FIX URGENTE: Resincronización de secuencia de certificados
-- Plataforma: Grupo Gerencia (Supabase)
-- Fecha: 2026-04-19
-- Autor: Análisis Claude
--
-- PROBLEMA
--   Después de eliminar certificados desde el panel admin, la columna
--   course_certificate_sequences.last_number quedó desfasada respecto al
--   MAX(registration_number) realmente existente en la tabla certificates.
--   Como consecuencia, el próximo certificado a generar saldría con número
--   121 en vez de 102 (continuando desde el único 101 que queda vivo).
--
-- CAUSA
--   La RPC `delete_certificate_reclaim_number` solo decrementa last_number
--   cuando el certificado eliminado es EXACTAMENTE el último emitido
--   (registration_number = last_number). Borrar certificados intermedios
--   o fuera de orden no retrocede el contador.
--
-- ESTRATEGIA DEL FIX
--   Resincronizar last_number de cada curso al MAX real de certificados
--   existentes. Si no quedan certificados, se deja en 100 (default) para
--   que el próximo sea 101.
--
-- SEGURIDAD
--   Esta operación NUNCA reduce last_number por debajo del MAX real, así
--   que no puede generar duplicados. Además, la función RPC
--   update_course_certificate_sequence ya valida esto si decides usar la UI.
--
-- CÓMO EJECUTAR
--   Abrir Supabase Dashboard → SQL Editor → pegar este archivo
--   → ejecutar sección por sección en orden.
-- ============================================================================


-- ============================================================================
-- §1  DIAGNÓSTICO — ver estado de todos los cursos
-- ============================================================================
-- Muestra qué cursos están desfasados y cuánto.
-- NO modifica nada, solo lee.

SELECT
    c.id                                            AS course_id,
    c.title                                         AS curso,
    s.last_number                                   AS contador_actual,
    COALESCE(MAX(cert.registration_number), 0)      AS max_real_emitido,
    COUNT(cert.id)                                  AS total_certificados,
    (s.last_number + 1)                             AS proximo_numero_actual,
    (COALESCE(MAX(cert.registration_number), 100) + 1) AS proximo_numero_tras_fix,
    CASE
        WHEN s.last_number IS NULL THEN 'SIN SECUENCIA'
        WHEN s.last_number > COALESCE(MAX(cert.registration_number), 0)
             THEN 'DESFASADO — resincronizar'
        ELSE 'OK'
    END                                             AS estado
FROM courses c
LEFT JOIN course_certificate_sequences s ON s.course_id = c.id
LEFT JOIN enrollments e                  ON e.course_id = c.id
LEFT JOIN certificates cert              ON cert.enrollment_id = e.id
GROUP BY c.id, c.title, s.last_number
ORDER BY estado DESC, c.title;


-- ============================================================================
-- §2  DETALLE — ver todos los números existentes del curso afectado
-- ============================================================================
-- Reemplaza <COURSE_ID> por el UUID del curso que aparece DESFASADO
-- en la consulta anterior. Esto te muestra los números vivos y los huecos.

-- Comentado por seguridad. Descomenta y pega el UUID para ejecutar.

/*
SELECT
    cert.registration_number      AS numero,
    p.full_name                   AS estudiante,
    p.dni                         AS dni,
    cert.created_at               AS emitido_el,
    (cert.metadata->>'registration_year')::int AS anio
FROM certificates cert
JOIN enrollments e ON cert.enrollment_id = e.id
JOIN profiles p    ON e.user_id = p.id
WHERE e.course_id = '<COURSE_ID>'
ORDER BY cert.registration_number;
*/


-- ============================================================================
-- §3  FIX DIRIGIDO — resincronizar UN curso específico
-- ============================================================================
-- Recomendado si solo un curso está afectado y quieres revisar uno a la vez.
-- Reemplaza <COURSE_ID> por el UUID real.

/*
UPDATE course_certificate_sequences s
SET last_number = (
    SELECT COALESCE(MAX(c.registration_number), 100)
    FROM certificates c
    JOIN enrollments e ON c.enrollment_id = e.id
    WHERE e.course_id = s.course_id
)
WHERE s.course_id = '<COURSE_ID>'
RETURNING course_id, last_number AS last_number_despues_del_fix;
*/


-- ============================================================================
-- §4  FIX MASIVO — resincronizar TODOS los cursos a la vez
-- ============================================================================
-- SEGURO: solo baja last_number al MAX real existente. Nunca genera duplicados.
-- Recomendado si hay varios cursos con el problema.

UPDATE course_certificate_sequences s
SET last_number = (
    SELECT COALESCE(MAX(c.registration_number), 100)
    FROM certificates c
    JOIN enrollments e ON c.enrollment_id = e.id
    WHERE e.course_id = s.course_id
)
WHERE s.last_number IS DISTINCT FROM (
    SELECT COALESCE(MAX(c.registration_number), 100)
    FROM certificates c
    JOIN enrollments e ON c.enrollment_id = e.id
    WHERE e.course_id = s.course_id
)
RETURNING course_id, last_number AS last_number_tras_resync;


-- ============================================================================
-- §5  VERIFICACIÓN FINAL — confirmar que todo quedó alineado
-- ============================================================================
-- Después de §4 no debe haber ninguna fila con estado 'DESFASADO'.

SELECT
    c.title                                         AS curso,
    s.last_number                                   AS contador,
    COALESCE(MAX(cert.registration_number), 0)      AS max_real,
    (s.last_number + 1)                             AS proximo,
    CASE
        WHEN s.last_number = COALESCE(MAX(cert.registration_number), 100)
             THEN 'OK ✓'
        ELSE 'REVISAR'
    END AS estado_final
FROM courses c
LEFT JOIN course_certificate_sequences s ON s.course_id = c.id
LEFT JOIN enrollments e                  ON e.course_id = c.id
LEFT JOIN certificates cert              ON cert.enrollment_id = e.id
GROUP BY c.id, c.title, s.last_number
ORDER BY estado_final DESC, c.title;


-- ============================================================================
-- §6  OPCIONAL — reiniciar totalmente la numeración de un curso
-- ============================================================================
-- ⚠️  DESTRUCTIVO. Solo si quieres borrar todos los certificados de un curso
-- y empezar desde 101 otra vez. Perderás los certificados ya emitidos.
-- Los alumnos que ya hayan descargado su PDF conservarán su número en el PDF,
-- pero no en la base → hay conflicto legal/auditoría. Usa con cuidado.

/*
DO $$
DECLARE
    v_course_id uuid := '<COURSE_ID>';  -- ← editar
BEGIN
    DELETE FROM certificates c
    USING enrollments e
    WHERE c.enrollment_id = e.id
      AND e.course_id = v_course_id;

    UPDATE course_certificate_sequences
    SET last_number = 100
    WHERE course_id = v_course_id;
END $$;
*/


-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
