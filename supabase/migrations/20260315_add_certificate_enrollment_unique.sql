-- ==============================================================================
-- Fix: Agregar constraint UNIQUE(enrollment_id) en tabla certificates
-- Sin esta constraint, dos requests paralelos para el mismo enrollment podían
-- crear dos certificados duplicados (race condition en generate_certificate_v2).
-- La constraint garantiza que el INSERT falle si ya existe uno → idempotencia real.
--
-- NOTA: Si ya existen duplicados en producción, este ALTER TABLE fallará.
-- En ese caso, primero limpiar duplicados con:
--   DELETE FROM certificates a USING certificates b
--   WHERE a.id > b.id AND a.enrollment_id = b.enrollment_id;
-- ==============================================================================

ALTER TABLE certificates
    ADD CONSTRAINT certificates_enrollment_id_unique UNIQUE (enrollment_id);
