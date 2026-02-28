-- =============================================================================
-- Migración: Añadir plantilla de certificado global en site_settings
-- Fecha: 2026-02-27
-- Permite guardar un modelo de certificado sin necesidad de asociarlo a un curso.
-- =============================================================================

ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS default_certificate_template JSONB DEFAULT NULL;
