-- =============================================================================
-- Migración: Función para que el administrador elimine usuarios
-- Fecha: 2026-02-24
-- =============================================================================

CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    calling_user_role text;
BEGIN
    -- Verificar que quien llama es administrador
    SELECT role INTO calling_user_role
    FROM profiles
    WHERE id = auth.uid();

    IF calling_user_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Acceso denegado: solo los administradores pueden eliminar usuarios';
    END IF;

    -- No permitir que el admin se elimine a sí mismo
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'No puedes eliminar tu propia cuenta';
    END IF;

    -- Eliminar datos del usuario en orden para respetar FK
    -- 1. Certificados (ligados a enrollments)
    DELETE FROM certificates
    WHERE enrollment_id IN (
        SELECT id FROM enrollments WHERE user_id = target_user_id
    );

    -- 2. Progreso del usuario
    DELETE FROM user_progress WHERE user_id = target_user_id;

    -- 3. Inscripciones
    DELETE FROM enrollments WHERE user_id = target_user_id;

    -- 4. Perfil (profiles)
    DELETE FROM profiles WHERE id = target_user_id;

    -- 5. Cuenta de autenticación (auth.users)
    DELETE FROM auth.users WHERE id = target_user_id;

END;
$$;

-- Permitir que usuarios autenticados llamen a esta función
-- (el control de quién puede usarla está dentro de la función misma)
GRANT EXECUTE ON FUNCTION delete_user_by_admin(uuid) TO authenticated;
