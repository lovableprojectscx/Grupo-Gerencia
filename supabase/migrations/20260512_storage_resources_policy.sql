-- Migración para permitir a los estudiantes descargar recursos y certificados
-- del bucket 'course-content'

-- Asegurar que el bucket existe y es privado (requiere RLS)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-content', 'course-content', false)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS en el bucket si no lo está
-- (Nota: RLS está habilitado por defecto en storage.objects, pero esto asegura el bucket)


-- 1. Permitir que usuarios autenticados vean archivos en la carpeta 'resources'
CREATE POLICY "Authenticated users can read resources"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-content'
  AND (storage.foldername(name))[1] = 'resources'
);

-- 2. Permitir que usuarios autenticados vean archivos en la carpeta 'certificates' (por si acaso)
CREATE POLICY "Authenticated users can read certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-content'
  AND (storage.foldername(name))[1] = 'certificates'
);

-- 3. Permitir acceso público a las plantillas de certificados si se guardan aquí
-- (Esto es útil para que el generador de PDF pueda leerlas sin headers de auth complicados)
CREATE POLICY "Public can read certificate templates"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'course-content'
  AND (storage.foldername(name))[1] = 'templates'
);

-- 4. Asegurar que los admins tengan acceso total (INSERT/UPDATE/DELETE) a todo el bucket
-- Esto evita problemas si las políticas anteriores son muy restrictivas
CREATE POLICY "Admins have full access to course-content"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'course-content'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'course-content'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
