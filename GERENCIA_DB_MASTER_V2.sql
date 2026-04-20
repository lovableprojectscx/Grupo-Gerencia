-- ==============================================================================
-- ██████╗ ███████╗██████╗ ███████╗███╗   ██╗ ██████╗██╗ █████╗  ██╗   ██╗██████╗ 
-- ██╔════╝ ██╔════╝██╔══██╗██╔════╝████╗  ██║██╔════╝██║██╔══██╗ ██║   ██║╚════██╗
-- ██║  ███╗█████╗  ██████╔╝█████╗  ██╔██╗ ██║██║     ██║███████║ ██║   ██║ █████╔╝
-- ██║   ██║██╔══╝  ██╔══██╗██╔══╝  ██║╚██╗██║██║     ██║██╔══██║ ╚██╗ ██╔╝██╔═══╝ 
-- ╚██████╔╝███████╗██║  ██║███████╗██║ ╚████║╚██████╗██║██║  ██║  ╚████╔╝ ███████╗
--  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝ ╚═════╝╚═╝╚═╝  ╚═╝   ╚═══╝  ╚══════╝
--
-- SCRIPT MAESTRO: BD del Grupo Gerencia (Academia) - VERSION 2.0 (FIXED)
-- Proyecto: lovableprojectscx/remix-of-global-reach-academy
-- Fecha de Generación: 2026-04-19
-- Status: Sincronizado con Supabase (Incluye Fix de Certificados)
-- ==============================================================================

-- ==============================================================================
-- §1 — EXTENSIONES Y ESQUEMA
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ==============================================================================
-- §2 — TABLAS
-- ==============================================================================

-- 2-A. Perfiles de usuario (Extensión de auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT,
    dni         TEXT        UNIQUE,
    phone       TEXT,
    avatar_url  TEXT,
    role        TEXT        DEFAULT 'student'::text,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2-B. Instructores
CREATE TABLE IF NOT EXISTS public.instructors (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         TEXT        NOT NULL,
    title        TEXT,
    bio          TEXT,
    avatar_url   TEXT,
    linkedin_url TEXT,
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- 2-C. Categorías y Especialidades
CREATE TABLE IF NOT EXISTS public.course_categories (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT        UNIQUE NOT NULL,
    label       TEXT        NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_specialties (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID        REFERENCES public.course_categories(id) ON DELETE CASCADE,
    slug        TEXT        UNIQUE NOT NULL,
    label       TEXT        NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2-D. Cursos
CREATE TABLE IF NOT EXISTS public.courses (
    id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                TEXT        NOT NULL,
    subtitle             TEXT,
    slug                 TEXT        UNIQUE NOT NULL,
    description          TEXT,
    price                NUMERIC     DEFAULT 0,
    original_price       NUMERIC,
    image_url            TEXT,
    duration             TEXT,
    language             TEXT        DEFAULT 'Español'::text,
    level                TEXT        DEFAULT 'none'::text,
    category             TEXT,
    specialty            TEXT,
    modality             TEXT        DEFAULT 'async'::text,
    published            BOOLEAN     DEFAULT false,
    is_archived          BOOLEAN     DEFAULT false,
    instructor_id        UUID        REFERENCES public.instructors(id) ON DELETE SET NULL,
    metadata             JSONB       DEFAULT '[]'::jsonb,
    certificate_template JSONB       DEFAULT '[]'::jsonb,
    created_at           TIMESTAMPTZ DEFAULT now()
);

-- 2-E. Módulos y Lecciones
CREATE TABLE IF NOT EXISTS public.modules (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id   UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    video_url   TEXT,
    duration    TEXT,
    "order"     INTEGER     DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lessons (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id       UUID        NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    title           TEXT        NOT NULL,
    type            TEXT        NOT NULL, -- 'video', 'pdf', 'quiz'
    content_url     TEXT,
    duration        TEXT,
    "order"         INTEGER     DEFAULT 0,
    is_free_preview BOOLEAN     DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- 2-F. Matriculas e Integridad de Certificados
CREATE TABLE IF NOT EXISTS public.enrollments (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id           UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    status              TEXT        DEFAULT 'active'::text,
    progress            INTEGER     DEFAULT 0,
    purchased_at        TIMESTAMPTZ DEFAULT now(),
    registration_number INTEGER,
    voucher_url         TEXT
);

CREATE TABLE IF NOT EXISTS public.certificates (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id       UUID        NOT NULL UNIQUE REFERENCES public.enrollments(id) ON DELETE CASCADE,
    code                TEXT        UNIQUE NOT NULL,
    registration_number INTEGER,
    issued_at           TIMESTAMPTZ DEFAULT now(),
    template_config     JSONB,
    metadata            JSONB       DEFAULT '{}'::jsonb
);

-- 2-G. Secuencias Atómicas de Certificados
CREATE TABLE IF NOT EXISTS public.course_certificate_sequences (
    course_id   UUID        PRIMARY KEY REFERENCES public.courses(id) ON DELETE CASCADE,
    last_number INTEGER     DEFAULT 100
);

-- 2-H. Progreso y Otros
CREATE TABLE IF NOT EXISTS public.lesson_completions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id    UUID        NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.site_settings (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    site_name                   TEXT        DEFAULT 'Gerencia Educativa'::text,
    site_description            TEXT,
    contact_email               TEXT,
    contact_phone               TEXT,
    payment_number              TEXT,
    payment_qr_url              TEXT,
    logo_url                    TEXT,
    default_certificate_template JSONB,
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- §3 — FUNCIONES Y RPCs (SISTEMA)
-- ==============================================================================

-- 3-A. Función: assign_registration_number (Triggers de matriculación)
CREATE OR REPLACE FUNCTION public.assign_registration_number()
RETURNS trigger AS $$
DECLARE
    next_number INTEGER;
BEGIN
    IF NEW.status = 'active' AND NEW.registration_number IS NULL THEN
        SELECT COALESCE(MAX(registration_number), 100) + 1
        INTO next_number
        FROM enrollments
        WHERE course_id = NEW.course_id;
        NEW.registration_number := next_number;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3-B. Trigger: Crear perfil al registrarse nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, dni, phone, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'dni',
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3-B. Función: Generar Certificado V2 (Blindado)
CREATE OR REPLACE FUNCTION public.generate_certificate_v2(
    p_enrollment_id uuid,
    p_preferences   jsonb DEFAULT '{}'::jsonb,
    p_year          integer DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_enrollment        record;
    v_course_id         uuid;
    v_certificate_id    uuid;
    v_registration_code integer;
    v_existing_cert_id  uuid;
    v_metadata          jsonb;
    v_course_template   jsonb;
    v_year              integer;
    v_template_year     integer;
BEGIN
    SELECT * INTO v_enrollment FROM enrollments WHERE id = p_enrollment_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Enrollment not found'; END IF;

    v_course_id := v_enrollment.course_id;
    SELECT certificate_template INTO v_course_template FROM courses WHERE id = v_course_id;

    BEGIN
        v_template_year := (v_course_template->>'registrationYear')::integer;
    EXCEPTION WHEN others THEN
        v_template_year := NULL;
    END;

    v_year := COALESCE(p_year, v_template_year, EXTRACT(YEAR FROM NOW())::integer);

    SELECT id INTO v_existing_cert_id FROM certificates WHERE enrollment_id = p_enrollment_id;
    IF v_existing_cert_id IS NOT NULL THEN
        RETURN jsonb_build_object('id', v_existing_cert_id, 'is_new', false);
    END IF;

    WITH upsert AS (
        INSERT INTO course_certificate_sequences (course_id, last_number)
        VALUES (v_course_id, 101)
        ON CONFLICT (course_id) DO UPDATE
            SET last_number = course_certificate_sequences.last_number + 1
        RETURNING last_number
    )
    SELECT last_number INTO v_registration_code FROM upsert;

    v_metadata := p_preferences || jsonb_build_object(
        'generated_at',        now(),
        'registration_number', v_registration_code,
        'registration_year',   v_year,
        'template_snapshot',   v_course_template
    );

    INSERT INTO certificates (enrollment_id, code, metadata, registration_number)
    VALUES (p_enrollment_id, gen_random_uuid(), v_metadata, v_registration_code)
    RETURNING id INTO v_certificate_id;

    UPDATE enrollments SET registration_number = v_registration_code WHERE id = p_enrollment_id;

    RETURN jsonb_build_object(
        'id', v_certificate_id,
        'registration_number', v_registration_code,
        'registration_year', v_year,
        'is_new', true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3-C. Función: Borrar Certificado y Reclamar Número (FIXED)
CREATE OR REPLACE FUNCTION public.delete_certificate_reclaim_number(p_certificate_id uuid)
RETURNS void AS $$
DECLARE
    v_course_id       uuid;
    v_max_remaining   integer;
BEGIN
    SELECT e.course_id INTO v_course_id
    FROM public.certificates c
    JOIN public.enrollments e ON e.id = c.enrollment_id
    WHERE c.id = p_certificate_id;

    IF NOT FOUND THEN RETURN; END IF;

    PERFORM last_number FROM public.course_certificate_sequences
    WHERE course_id = v_course_id FOR UPDATE;

    DELETE FROM public.certificates WHERE id = p_certificate_id;

    SELECT COALESCE(MAX(c2.registration_number), 100) INTO v_max_remaining
    FROM public.certificates c2
    JOIN public.enrollments e2 ON e2.id = c2.enrollment_id
    WHERE e2.course_id = v_course_id AND c2.registration_number IS NOT NULL;

    INSERT INTO public.course_certificate_sequences (course_id, last_number)
    VALUES (v_course_id, GREATEST(v_max_remaining, 100))
    ON CONFLICT (course_id) DO UPDATE
        SET last_number = GREATEST(EXCLUDED.last_number, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3-D. Función RPC: Resincronizar Secuencia de Curso
CREATE OR REPLACE FUNCTION public.resync_course_certificate_sequence(p_course_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_previous_last   integer;
    v_max_real        integer;
    v_new_last        integer;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Acceso denegado: solo administradores';
    END IF;

    SELECT last_number INTO v_previous_last FROM public.course_certificate_sequences
    WHERE course_id = p_course_id FOR UPDATE;

    IF NOT FOUND THEN v_previous_last := 100; END IF;

    SELECT COALESCE(MAX(c.registration_number), 100) INTO v_max_real
    FROM public.certificates c
    JOIN public.enrollments e ON e.id = c.enrollment_id
    WHERE e.course_id = p_course_id AND c.registration_number IS NOT NULL;

    v_new_last := GREATEST(v_max_real, 100);

    INSERT INTO public.course_certificate_sequences (course_id, last_number)
    VALUES (p_course_id, v_new_last)
    ON CONFLICT (course_id) DO UPDATE SET last_number = EXCLUDED.last_number;

    RETURN jsonb_build_object(
        'course_id', p_course_id,
        'previous_last', v_previous_last,
        'new_last', v_new_last,
        'next_number', v_new_last + 1,
        'changed', v_previous_last IS DISTINCT FROM v_new_last
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3-F. Funciones de Admin (Gestión de Usuarios)
CREATE OR REPLACE FUNCTION public.get_users_for_admin()
RETURNS TABLE (id uuid, email text, full_name text, dni text, phone text, role text, avatar_url text, created_at timestamptz)
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Acceso denegado';
    END IF;
    RETURN QUERY
    SELECT p.id, u.email::text, p.full_name, p.dni, p.phone, p.role, p.avatar_url, p.created_at
    FROM profiles p JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3-G. Utilidades y Progreso
CREATE OR REPLACE FUNCTION public.update_enrollment_progress(p_course_id uuid, p_progress integer, p_status text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$ BEGIN UPDATE enrollments SET progress = p_progress, status = COALESCE(p_status, status) WHERE user_id = auth.uid() AND course_id = p_course_id; END; $$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'); END; $$;

CREATE OR REPLACE FUNCTION public.get_certificate_details(cert_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE result json;
BEGIN
    SELECT json_build_object(
        'id', c.id, 'code', c.code, 'issued_at', c.issued_at, 'registration_number', c.registration_number, 'metadata', c.metadata,
        'enrollment', json_build_object(
            'student', json_build_object('full_name', p.full_name, 'dni', p.dni),
            'course', json_build_object('title', cr.title, 'certificate_template', cr.certificate_template, 'metadata', cr.metadata)
        )
    ) INTO result FROM certificates c JOIN enrollments e ON c.enrollment_id = e.id JOIN profiles p ON e.user_id = p.id JOIN courses cr ON e.course_id = cr.id WHERE c.id = cert_id;
    RETURN result;
END; $$;

-- ==============================================================================
-- §4 — POLÍTICAS RLS (RESUMEN)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Profiles: Propios o admin
CREATE POLICY "profiles_access" ON public.profiles FOR ALL
USING (auth.uid() = id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Courses: Publicados para todos, gestión solo admin
CREATE POLICY "courses_select" ON public.courses FOR SELECT USING (published = true OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "courses_admin" ON public.courses FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Enrollments: Propios o admin
CREATE POLICY "enrollments_access" ON public.enrollments FOR ALL USING (user_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Certificates: Propios, admin o si metadata->public es true
CREATE POLICY "certificates_access" ON public.certificates FOR SELECT
USING (
    EXISTS (SELECT 1 FROM enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR metadata->>'public' = 'true'
);

-- ==============================================================================
-- §5 — GRANT PERMISSIONS
-- ==============================================================================
GRANT EXECUTE ON FUNCTION public.resync_course_certificate_sequence(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_certificate_v2(uuid, jsonb, integer) TO authenticated;

-- ==============================================================================
-- §6 — CONFIGURACION FINAL (TRIGGERS)
-- ==============================================================================

-- 6-A. Trigger de registro de usuario (auth)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
-- FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6-B. Triggers de numeración de matriculación
CREATE TRIGGER trigger_assign_registration_number_insert
    BEFORE INSERT ON public.enrollments
    FOR EACH ROW EXECUTE FUNCTION public.assign_registration_number();

CREATE TRIGGER trigger_assign_registration_number_update
    BEFORE UPDATE ON public.enrollments
    FOR EACH ROW EXECUTE FUNCTION public.assign_registration_number();
