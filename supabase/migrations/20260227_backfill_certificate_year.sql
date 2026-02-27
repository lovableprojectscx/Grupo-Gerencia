-- =============================================================================
-- Migración: Backfill registration_year en certificados antiguos
-- Fecha: 2026-02-27
-- Actualiza todos los certificados que no tienen 'registration_year' en metadata,
-- usando el año de su columna issued_at.
-- =============================================================================

UPDATE certificates
SET metadata = metadata || jsonb_build_object(
    'registration_year', EXTRACT(YEAR FROM issued_at)::integer
)
WHERE metadata->>'registration_year' IS NULL
  AND issued_at IS NOT NULL;
