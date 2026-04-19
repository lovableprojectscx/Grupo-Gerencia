# Plan de ejecución — Fix de numeración de certificados

**Hoy:** 2026-04-19
**Descargas empiezan:** 2026-04-20 (mañana)
**Objetivo:** que los próximos certificados salgan con numeración correlativa correcta (101, 102, 103…)

---

## Archivos entregados

| Archivo | Qué hace |
|---|---|
| `informes/FIX_NUMERACION_CERTIFICADOS.sql` | Script SQL para correr en Supabase SQL Editor. Contiene diagnóstico, fix dirigido, fix masivo y verificación. |
| `supabase/migrations/20260419_resync_certificate_sequence_on_delete.sql` | Migración permanente: arregla la RPC de borrado para que nunca vuelva a pasar + añade una RPC `resync_course_certificate_sequence` llamable desde la UI. Incluye el one-shot backfill que alinea todo. |
| `src/services/courseService.ts` | Añadido método `resyncCertificateSequence(courseId)`. |
| `src/components/admin/course-builder/CourseSettingsTab.tsx` | Añadido botón **“Resincronizar ahora”** en Configuración del Curso → Numeración de Certificados. |

---

## Orden recomendado de ejecución

### Ruta A — La más rápida (si solo quieres resolver esta noche)

1. Abrir **Supabase Dashboard → SQL Editor**.
2. Pegar el contenido de `informes/FIX_NUMERACION_CERTIFICADOS.sql`.
3. Ejecutar **§1 Diagnóstico** → ver qué cursos aparecen como `DESFASADO`.
4. Ejecutar **§4 Fix masivo** → alinea todos los cursos al MAX real de certificados existentes.
5. Ejecutar **§5 Verificación** → debe decir `OK ✓` en todos.
6. Volver al panel admin → ir a **Inscripciones** → generar los certificados faltantes en el orden correcto.

> ⏱ Esta ruta toma 2–3 minutos. **No requiere deploy.**

### Ruta B — Solución definitiva (aplicar la migración)

Recomendado para que el bug no vuelva a ocurrir cuando borres certificados en el futuro.

1. Hacer deploy del proyecto (la migración `20260419_resync_certificate_sequence_on_delete.sql` se aplicará automáticamente en tu pipeline de Supabase).
2. O aplicarla manualmente: abrir el archivo `.sql`, pegar en SQL Editor, ejecutar.
3. Después del deploy:
   - La RPC `delete_certificate_reclaim_number` queda arreglada: cada borrado resincroniza automáticamente al MAX real.
   - El admin puede usar el botón **“Resincronizar ahora”** en cada curso si alguna vez ve huecos.
   - Se ejecuta un backfill una sola vez que alinea todo lo que esté desfasado en este momento.

> ⏱ Esta ruta toma lo que tarde tu deploy habitual. **Incluye el fix de §4 automáticamente.**

### Recomendación

Aplica **Ruta B** ahora. Si por la razón que sea no puedes deployar antes de mañana, aplica **Ruta A** esta noche en Supabase y deja la **Ruta B** para el próximo deploy.

---

## Qué hacer esta noche, paso a paso

1. **Resincronizar** (Ruta A o B).
2. Decidir el **orden oficial** en que los certificados deben recibir cada número (por fecha de inscripción, alfabético por DNI, alfabético por nombre, etc.).
3. En **Admin → Inscripciones**, pulsa **Generar** en el orden decidido — el primero recibe el siguiente número (101 si está libre, o 102 si ya existe el 101), el segundo el siguiente, etc.
4. Verificar en la tabla que cada uno tiene su número correlativo.
5. Mañana, habilitar la comunicación a los estudiantes para que descarguen.

---

## Por qué esta solución es segura

- El `UPDATE last_number = MAX(registration_number real)` **nunca** puede producir duplicados, porque `MAX(registration_number) + 1` seguro no existe como número emitido.
- Si un curso no tiene certificados, se queda en `100` → el próximo será `101` (comportamiento original).
- La nueva RPC usa `SELECT … FOR UPDATE` para bloquear la fila de secuencia del curso mientras recalcula → no hay race condition con una generación en paralelo.
- Se respetan los constraints existentes: el `UNIQUE` de `certificate_enrollment_unique` sigue protegiendo contra doble certificado por matrícula.

---

## Riesgos asumidos

- **Huecos históricos visibles** (ej. salta del 101 al 105). Ya existían antes del fix. El fix no los recompone; solo garantiza que los próximos sigan correlativos. Si necesitas una numeración sin huecos, habría que renumerar los certificados ya emitidos — pero eso cambia números ya entregados a alumnos, lo cual **no recomiendo** por razones de auditoría.

---

## Verificación post-deploy (queries de humo)

Después de aplicar, ejecutar en SQL Editor:

```sql
-- 1. No debe haber ningún curso con last_number > MAX(registration_number)
SELECT COUNT(*) AS cursos_desfasados
FROM course_certificate_sequences s
WHERE s.last_number > COALESCE((
    SELECT MAX(c.registration_number)
    FROM certificates c
    JOIN enrollments e ON c.enrollment_id = e.id
    WHERE e.course_id = s.course_id
), 100);
-- Resultado esperado: 0

-- 2. La nueva RPC debe existir
SELECT proname
FROM pg_proc
WHERE proname IN ('resync_course_certificate_sequence', 'delete_certificate_reclaim_number');
-- Resultado esperado: ambas presentes
```
