-- ============================================================
-- MIGRACIÓN: Políticas de Storage para bucket 'course-content'
-- Aplicada: 2026-05-12 (resources, certificates, templates)
-- Actualizada: 2026-05-18 (materials + revisión completa)
-- ============================================================

-- Asegurar que el bucket existe y es privado (requiere RLS)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-content', 'course-content', false)
ON CONFLICT (id) DO NOTHING;

-- ── 1. Recursos del curso (carpeta: resources/) ────────────────────────────
-- Usada por la tabla course_resources (sistema de materiales descargables)
CREATE POLICY "Authenticated users can read resources"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-content'
  AND (storage.foldername(name))[1] = 'resources'
);

-- ── 2. Certificados generados (carpeta: certificates/) ─────────────────────
CREATE POLICY "Authenticated users can read certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-content'
  AND (storage.foldername(name))[1] = 'certificates'
);

-- ── 3. Materiales de lecciones (carpeta: materials/) ──────────────────────
-- Usada por la tabla lessons (type='pdf') con content_url apuntando aquí.
-- ⚠️ ESTA POLÍTICA FALTABA — causaba que los alumnos no pudieran descargar.
CREATE POLICY "Authenticated users can read materials"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-content'
  AND (storage.foldername(name))[1] = 'materials'
);

-- ── 4. Plantillas de certificados (carpeta: templates/) ────────────────────
-- Acceso público para que el generador de PDF las lea sin auth compleja
CREATE POLICY "Public can read certificate templates"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'course-content'
  AND (storage.foldername(name))[1] = 'templates'
);

-- ── 5. Acceso total para admins en todo el bucket ──────────────────────────
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
