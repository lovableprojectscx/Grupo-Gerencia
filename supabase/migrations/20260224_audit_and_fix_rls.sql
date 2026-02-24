-- =============================================================================
-- AUDITORÍA Y CORRECCIÓN COMPLETA DE RLS
-- Fecha: 2026-02-24
-- Propósito: Diagnóstico del incidente + corrección de políticas RLS
-- INSTRUCCIONES: Ejecutar SECCIÓN POR SECCIÓN en el SQL Editor de Supabase
-- =============================================================================

-- =============================================================================
-- SECCIÓN 1 - DIAGNÓSTICO: Contar registros existentes (ejecutar primero)
-- =============================================================================
/*
SELECT
    'auth.users'  AS tabla,
    COUNT(*)      AS total
FROM auth.users

UNION ALL

SELECT
    'profiles',
    COUNT(*)
FROM public.profiles

UNION ALL

SELECT
    'enrollments',
    COUNT(*)
FROM public.enrollments

UNION ALL

SELECT
    'certificates',
    COUNT(*)
FROM public.certificates;
*/

-- =============================================================================
-- SECCIÓN 2 - DIAGNÓSTICO: Ver las políticas RLS activas en cada tabla
-- =============================================================================
/*
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('profiles', 'enrollments', 'certificates', 'user_progress', 'courses')
ORDER BY tablename, cmd;
*/

-- =============================================================================
-- SECCIÓN 3 - DIAGNÓSTICO: Ver si hay perfil vinculado a cada usuario de auth
-- =============================================================================
/*
SELECT
    au.id,
    au.email,
    au.created_at,
    p.full_name,
    p.role,
    CASE WHEN p.id IS NULL THEN '⚠️ SIN PERFIL' ELSE '✅ OK' END AS estado_perfil
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
ORDER BY au.created_at;
*/

-- =============================================================================
-- SECCIÓN 4 - CORRECCIÓN: Asegurar políticas RLS correctas para ADMIN
-- Esta es la corrección principal. Ejecutar SIEMPRE.
-- =============================================================================

-- -----------------------------------------------------------------------
-- TABLA: profiles
-- -----------------------------------------------------------------------
-- Los admins deben poder ver TODOS los perfiles
DROP POLICY IF EXISTS "Admins can view all profiles"       ON public.profiles;
DROP POLICY IF EXISTS "admin_select_all_profiles"          ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"         ON public.profiles;
DROP POLICY IF EXISTS "users_select_own_profile"           ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"       ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile"           ON public.profiles;
DROP POLICY IF EXISTS "Admin full access to profiles"      ON public.profiles;

-- Habilitar RLS (por si no está activo)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: cada usuario ve su propio perfil; admin ve todos
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM public.profiles p2
            WHERE p2.id = auth.uid()
              AND p2.role = 'admin'
        )
    );

-- INSERT: solo la función de trigger puede insertar (o usuarios autenticados su propio perfil)
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- UPDATE: usuario actualiza su propio perfil; admin actualiza cualquiera
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE
    USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM public.profiles p2
            WHERE p2.id = auth.uid()
              AND p2.role = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM public.profiles p2
            WHERE p2.id = auth.uid()
              AND p2.role = 'admin'
        )
    );

-- DELETE: solo admin puede borrar perfiles (la función delete_user_by_admin usa SECURITY DEFINER)
CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p2
            WHERE p2.id = auth.uid()
              AND p2.role = 'admin'
        )
    );

-- -----------------------------------------------------------------------
-- TABLA: enrollments
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own enrollments"     ON public.enrollments;
DROP POLICY IF EXISTS "users_select_own_enrollments"       ON public.enrollments;
DROP POLICY IF EXISTS "Admins can view all enrollments"    ON public.enrollments;
DROP POLICY IF EXISTS "admin_select_all_enrollments"       ON public.enrollments;
DROP POLICY IF EXISTS "Admin full access to enrollments"   ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_select_policy"          ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_insert_policy"          ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_update_policy"          ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_delete_policy"          ON public.enrollments;

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollments_select_policy" ON public.enrollments
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    );

CREATE POLICY "enrollments_insert_policy" ON public.enrollments
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    );

CREATE POLICY "enrollments_update_policy" ON public.enrollments
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    );

CREATE POLICY "enrollments_delete_policy" ON public.enrollments
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    );

-- -----------------------------------------------------------------------
-- TABLA: certificates
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "certificates_select_policy"         ON public.certificates;
DROP POLICY IF EXISTS "certificates_insert_policy"         ON public.certificates;
DROP POLICY IF EXISTS "certificates_update_policy"         ON public.certificates;
DROP POLICY IF EXISTS "certificates_delete_policy"         ON public.certificates;
DROP POLICY IF EXISTS "Users can view own certificates"    ON public.certificates;
DROP POLICY IF EXISTS "Admins can view all certificates"   ON public.certificates;

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certificates_select_policy" ON public.certificates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.id = enrollment_id
              AND (
                e.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                      AND p.role = 'admin'
                )
              )
        )
        OR metadata->>'public' = 'true'
    );

CREATE POLICY "certificates_insert_policy" ON public.certificates
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    );

CREATE POLICY "certificates_update_policy" ON public.certificates
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    );

CREATE POLICY "certificates_delete_policy" ON public.certificates
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    );

-- -----------------------------------------------------------------------
-- TABLA: user_progress
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "user_progress_select_policy"        ON public.user_progress;
DROP POLICY IF EXISTS "user_progress_insert_policy"        ON public.user_progress;
DROP POLICY IF EXISTS "user_progress_update_policy"        ON public.user_progress;
DROP POLICY IF EXISTS "user_progress_delete_policy"        ON public.user_progress;

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_progress_select_policy" ON public.user_progress
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    );

CREATE POLICY "user_progress_insert_policy" ON public.user_progress
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_progress_update_policy" ON public.user_progress
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "user_progress_delete_policy" ON public.user_progress
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    );

-- -----------------------------------------------------------------------
-- TABLA: courses (los cursos deben ser visibles para todos)
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "courses_select_policy"              ON public.courses;
DROP POLICY IF EXISTS "courses_insert_policy"              ON public.courses;
DROP POLICY IF EXISTS "courses_update_policy"              ON public.courses;
DROP POLICY IF EXISTS "courses_delete_policy"              ON public.courses;
DROP POLICY IF EXISTS "Anyone can view published courses"  ON public.courses;
DROP POLICY IF EXISTS "Admins can manage courses"          ON public.courses;

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Cursos visibles para cualquiera (incluso anónimos) si están publicados
CREATE POLICY "courses_select_policy" ON public.courses
    FOR SELECT
    USING (
        published = true
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    );

CREATE POLICY "courses_insert_policy" ON public.courses
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    );

CREATE POLICY "courses_update_policy" ON public.courses
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    );

CREATE POLICY "courses_delete_policy" ON public.courses
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    );

-- =============================================================================
-- SECCIÓN 5 - RECUPERACIÓN: Si un usuario admin no tiene perfil, crearlo
-- Reemplazar 'EMAIL_DEL_ADMIN@ejemplo.com' con el email real
-- =============================================================================
/*
DO $$
DECLARE
    v_admin_id uuid;
BEGIN
    SELECT id INTO v_admin_id
    FROM auth.users
    WHERE email = 'EMAIL_DEL_ADMIN@ejemplo.com';

    IF v_admin_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, full_name, role, created_at)
        VALUES (v_admin_id, 'Administrador', 'admin', now())
        ON CONFLICT (id) DO UPDATE
        SET role = 'admin';

        RAISE NOTICE 'Perfil de admin creado/actualizado para ID: %', v_admin_id;
    ELSE
        RAISE NOTICE 'No se encontró usuario con ese email en auth.users';
    END IF;
END;
$$;
*/

-- =============================================================================
-- SECCIÓN 6 - VERIFICACIÓN FINAL: Confirmar que las políticas fueron aplicadas
-- =============================================================================
/*
SELECT
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'enrollments', 'certificates', 'user_progress', 'courses')
ORDER BY tablename, cmd;
*/
