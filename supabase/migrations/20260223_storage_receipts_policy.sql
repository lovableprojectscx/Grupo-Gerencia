-- Políticas RLS en storage.objects para permitir subida de comprobantes de pago
-- Los uploads van a course-content/receipts/{userId}-{timestamp}.{ext}

-- 1. Usuarios autenticados pueden subir archivos a receipts/
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-content'
  AND (storage.foldername(name))[1] = 'receipts'
);

-- 2. Usuarios autenticados pueden leer comprobantes (admin necesita verlos)
CREATE POLICY "Authenticated users can read receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-content'
  AND (storage.foldername(name))[1] = 'receipts'
);
