-- =============================================================================
-- Migración: Funciones para que el admin pueda editar emails de usuarios
-- Fecha: 2026-02-24
-- =============================================================================

-- 1. Función para obtener todos los usuarios con su email (de auth.users)
CREATE OR REPLACE FUNCTION get_users_for_admin()
RETURNS TABLE (
    id          uuid,
    email       text,
    full_name   text,
    dni         text,
    phone       text,
    role        text,
    avatar_url  text,
    created_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acceso denegado: solo administradores';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        u.email::text,
        p.full_name,
        p.dni,
        p.phone,
        p.role,
        p.avatar_url,
        p.created_at
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_users_for_admin() TO authenticated;

-- 2. Función para actualizar el email de un usuario en auth.users
CREATE OR REPLACE FUNCTION update_user_email_by_admin(
    target_user_id  uuid,
    new_email       text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verificar que quien llama es administrador
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acceso denegado: solo administradores pueden editar emails';
    END IF;

    -- Validar formato básico de email
    IF new_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
        RAISE EXCEPTION 'Formato de email inválido';
    END IF;

    -- Verificar que el email no esté en uso por otro usuario
    IF EXISTS (
        SELECT 1 FROM auth.users
        WHERE email = lower(trim(new_email))
          AND id != target_user_id
    ) THEN
        RAISE EXCEPTION 'Ese email ya está registrado por otro usuario';
    END IF;

    -- Actualizar email en auth.users (confirmado automáticamente)
    UPDATE auth.users
    SET
        email               = lower(trim(new_email)),
        email_confirmed_at  = COALESCE(email_confirmed_at, now()),
        updated_at          = now()
    WHERE id = target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_email_by_admin(uuid, text) TO authenticated;
