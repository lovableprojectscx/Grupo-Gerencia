# Fix: Certificados que salían vacíos cuando el curso no tenía plantilla

**Fecha:** 2026-04-19
**Problema reportado por cliente:**
"Cuando creamos un curso sin plantilla de certificado y luego algún alumno solicita el suyo, o la subimos después de crear el curso, los alumnos ven un certificado vacío (o directamente no ven nada)."

Este documento explica exactamente qué se cambió, por qué, y cómo aplicarlo.

---

## TL;DR — Qué quedó implementado

1. **Se bloquea la emisión de certificados sin plantilla** a nivel de base de datos (ya no se pueden crear certificados con `template_snapshot = {}`).
2. **Fallback automático a plantilla por defecto del sitio** cuando el curso no tiene la suya.
3. **Botón "Refrescar certificados emitidos"** en la configuración del curso: repone el snapshot de certificados ya emitidos con la plantilla actual (sin cambiar número ni fecha).
4. **El visor de certificados ahora usa una cadena de fallback robusta:** snapshot → plantilla actual del curso → plantilla por defecto del sitio → mensaje de error claro.
5. **Aviso visual en Admin → Inscripciones:** se muestra un ícono rojo junto a los cursos sin plantilla y el botón "Generar" queda deshabilitado con tooltip explicativo.

Todo compila sin errores (`tsc --noEmit` limpio).

---

## Archivos tocados

| Archivo | Tipo | Qué hace |
|---|---|---|
| `supabase/migrations/20260419_certificate_template_fallback_and_refresh.sql` | **Migración SQL** | Función helper `_certificate_template_is_usable`, refuerzo de `generate_certificate_v2`, nuevas RPCs `refresh_certificate_template_snapshot`, `refresh_course_certificates_template`, `course_has_usable_certificate_template`. |
| `src/services/courseService.ts` | TS | Añade métodos `courseHasUsableCertificateTemplate`, `refreshCertificateTemplateSnapshot`, `refreshCourseCertificatesTemplate`. |
| `src/pages/admin/AdminEnrollments.tsx` | TSX | Trae `certificate_template` y `id` del curso en la query; carga el default del sitio; muestra warning/tooltip; deshabilita "Generar" si no hay plantilla ni curso ni site-default. |
| `src/components/admin/course-builder/CourseSettingsTab.tsx` | TSX | Añade el bloque "Refrescar certificados emitidos" con el botón que llama al nuevo RPC. |
| `src/pages/student/CertificateViewer.tsx` | TSX | Nueva cadena de fallback robusta: snapshot → curso → site default → mensaje. Mejora mensaje de error al descargar sin plantilla. |

---

## Paso a paso para aplicarlo en producción

### 1. Aplicar la migración SQL

**Opción A (recomendada) — Pipeline de Supabase:**
Haz push de la rama a main. Si tienes `supabase db push` integrado, la migración se aplicará sola.

**Opción B — Manual (rápido):**
1. Abre Supabase Dashboard → SQL Editor.
2. Pega el contenido de `supabase/migrations/20260419_certificate_template_fallback_and_refresh.sql`.
3. Ejecuta.
4. Verifica que estas funciones existen:
   ```sql
   SELECT proname FROM pg_proc
   WHERE proname IN (
       '_certificate_template_is_usable',
       'refresh_certificate_template_snapshot',
       'refresh_course_certificates_template',
       'course_has_usable_certificate_template',
       'generate_certificate_v2'
   );
   ```
   Deben aparecer las 5.

### 2. Deploy del frontend

`npm run build` + deploy habitual. No hay nuevas variables de entorno.

### 3. Para cada curso que ya tenga certificados emitidos con snapshot vacío

1. Admin → Cursos → abrir el curso.
2. Pestaña "Certificado" → subir la plantilla correcta (si no la tenía).
3. Pestaña "Configuración" → sección "Numeración de Certificados" → **"Refrescar certificados emitidos"**.
4. Confirmar. El sistema reescribirá el `template_snapshot` de todos los certificados de ese curso con la plantilla actual.
5. Los alumnos podrán volver a ver/descargar sus certificados normalmente. **No cambia número ni fecha de emisión.**

### 4. (Opcional, recomendado) Configurar una plantilla por defecto del sitio

Así, aunque un admin olvide subir plantilla a un curso nuevo, los certificados se emitirán con el diseño institucional.

Subir desde: Admin → Ajustes del sitio → Plantilla por defecto de certificado. (O directamente en la tabla `site_settings.default_certificate_template`.)

---

## Flujo nuevo al emitir un certificado

```
Admin pulsa "Generar" en una inscripción
        │
        ▼
¿El curso tiene plantilla utilizable?  ── sí ──▶ Se usa la del curso
        │ no
        ▼
¿Hay plantilla por defecto del sitio? ── sí ──▶ Se usa esa + metadata.template_source = 'site_default'
        │ no
        ▼
Botón "Generar" queda DESHABILITADO con tooltip.
RPC genera EXCEPTION si alguien intenta forzarlo.
```

El `template_snapshot` se guarda con la plantilla realmente usada → el certificado siempre es auditable y reproducible, aunque luego el admin cambie el diseño.

---

## Flujo cuando el cliente sube plantilla DESPUÉS de haber emitido certs

```
Admin sube plantilla al curso
        │
        ▼
Pulsa "Refrescar certificados emitidos"
        │
        ▼
RPC refresh_course_certificates_template:
  - Toma todos los certs del curso
  - Actualiza cada metadata.template_snapshot con la nueva plantilla
  - Marca template_source = 'course'
  - NO toca registration_number, NO toca issued_at
        │
        ▼
Alumnos refrescan la página → ven el certificado con el diseño nuevo
```

---

## Garantías y consideraciones

- **Atomicidad:** el refresh usa `UPDATE ... WHERE enrollment_id IN (SELECT ...)`; si falla a mitad, no hay estado inconsistente (todo o nada en la transacción).
- **Seguridad:** ambas RPCs verifican `role = 'admin'` antes de hacer nada. Error claro si no lo eres.
- **Auditoría:** `metadata.template_source` queda grabado en cada certificado → se puede rastrear si se emitió con plantilla propia o con la default.
- **Sin romper huecos de numeración:** el fix anterior (`delete_certificate_reclaim_number` + `resync_course_certificate_sequence`) sigue vigente y funcional.
- **Compatibilidad:** snapshots viejos con `{}` se detectan como "no utilizables" → la UI automáticamente cae al template del curso o al site-default sin necesidad de ejecutar el refresh.

---

## Verificación post-deploy (queries de humo)

```sql
-- 1. Cuántos certificados tienen snapshot vacío todavía
SELECT COUNT(*) AS snapshots_vacios
FROM certificates
WHERE NOT public._certificate_template_is_usable(
    COALESCE(metadata->'template_snapshot', 'null'::jsonb)
);

-- 2. Cuántos cursos no tienen plantilla utilizable
SELECT COUNT(*) AS cursos_sin_plantilla
FROM courses
WHERE NOT public._certificate_template_is_usable(certificate_template);

-- 3. ¿Hay plantilla por defecto del sitio?
SELECT public._certificate_template_is_usable(default_certificate_template) AS site_default_usable
FROM site_settings;

-- 4. Probar manualmente la RPC pública de chequeo de template
SELECT public.course_has_usable_certificate_template(
    (SELECT id FROM courses LIMIT 1)
);
-- Debe devolver un jsonb con { course_usable, site_usable, can_emit, preferred_source }
```

---

## Riesgos y cómo mitigarlos

| Riesgo | Mitigación |
|---|---|
| Admin pulsa "Refrescar" con la plantilla equivocada subida | El refresh se puede volver a ejecutar cuantas veces haga falta con la plantilla correcta. Solo cambia el snapshot, no números ni fechas. |
| Alumno ya descargó el PDF viejo vacío | Indicarle que vuelva a la página del certificado y pulse "Descargar PDF" de nuevo; el cache del navegador no afecta porque el PDF se genera en cliente cada vez. |
| Se emite un cert con site-default y luego el curso recibe plantilla propia | El admin debe pulsar "Refrescar certificados emitidos"; el snapshot cambiará de `site_default` a `course`. |
| La plantilla por defecto del sitio también está vacía | La RPC `generate_certificate_v2` lanza EXCEPTION clara; el botón Generar en UI ya está deshabilitado antes de llamar al servidor. |

---

## Próximos pasos sugeridos (no bloqueantes)

1. Añadir un widget en el dashboard admin que liste cursos sin plantilla, para que el admin los arregle proactivamente.
2. Job programado semanal que detecte certificados con `template_source = 'site_default'` en cursos que ahora sí tienen plantilla propia → refrescarlos automáticamente.
3. Notificación por email al alumno cuando su certificado sea refrescado (opcional, depende de política).
