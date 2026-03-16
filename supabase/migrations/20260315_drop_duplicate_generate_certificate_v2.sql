-- Elimina la versión antigua y conflictiva de la función generate_certificate_v2
-- El error era: "Could not choose the best candidate function between: public.generate_certificate_v2(p_enrollment_id => uuid, p_preferences => jsonb), public.generate_certificate_v2(p_enrollment_id => uuid, p_preferences => jsonb, p_year => integer)"
-- Esto ocurre porque Postgres permite sobrecarga de funciones (overloading), pero cuando llamamos a la función
-- pasando 2 parámetros, no sabe si usar la versión vieja que sólo acepta 2, o la versión nueva que tiene un 3ro (p_year) por defecto.

DROP FUNCTION IF EXISTS public.generate_certificate_v2(uuid, jsonb);
