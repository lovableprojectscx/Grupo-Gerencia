-- =============================================================================
-- Migración: Backfill de estado 'completed' para inscripciones con progreso 100%
-- Fecha: 2026-03-17
-- Motivo: El estado 'completed' solo se asignaba via el botón "marcar todo".
-- Los alumnos que completaron lección por lección quedaron en 'active' con
-- progress=100. Esta migración los sincroniza al estado correcto.
-- =============================================================================

-- Actualizar inscripciones activas con progreso completo al estado 'completed'
UPDATE enrollments
SET status = 'completed'
WHERE status = 'active'
  AND progress = 100;

-- Reporte de cuántos registros fueron actualizados (visible en los logs de migración)
DO $$
DECLARE
    v_count integer;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Backfill completado: % inscripciones actualizadas a completed', v_count;
END $$;
