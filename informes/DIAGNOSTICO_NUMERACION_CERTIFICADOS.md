# Diagnóstico: Numeración de certificados empieza en 121 en vez de 101

**Fecha del análisis:** 2026-04-19
**Prioridad:** URGENTE — estudiantes descargan desde mañana 2026-04-20
**Archivos revisados:**
- `src/pages/admin/AdminEnrollments.tsx`
- `src/services/courseService.ts`
- `src/components/admin/course-builder/CourseSettingsTab.tsx`
- `supabase/migrations/20260305185412_set_certificate_year_from_template.sql` (RPC `generate_certificate_v2`)
- `supabase/migrations/20260308_configure_cert_sequences.sql` (RPC `update_course_certificate_sequence`)
- `supabase/migrations/20260315_fix_delete_certificate_race_condition.sql` (RPC `delete_certificate_reclaim_number`)

---

## 1. Por qué está pasando — causa raíz

Tu plataforma mantiene un contador por curso en la tabla `course_certificate_sequences` (columna `last_number`).

- **Al GENERAR**, el RPC `generate_certificate_v2` hace: `last_number = last_number + 1` (o crea la fila con `101` si no existe) y asigna ese número al certificado.
- **Al BORRAR**, el RPC `delete_certificate_reclaim_number` **solo** decrementa `last_number` si el certificado eliminado tenía exactamente el valor `last_number` actual (es decir, era el último emitido). Si borras certificados intermedios, el contador **no** retrocede.

### Qué ocurrió en tu caso
Generaste certificados hasta llegar a `last_number = 120`. Luego eliminaste varios, pero no todos los últimos en orden inverso (probablemente eliminaste alguno intermedio o los eliminaste después de haber generado más). Como el RPC solo retrocede cuando borras el último exacto, el contador se quedó clavado en **120** y el próximo que se genere será **121**.

Esto es **comportamiento esperado del diseño actual** — no es un bug de la base de datos, sino una limitación del `delete_certificate_reclaim_number` para evitar colisiones entre transacciones concurrentes.

---

## 2. Solución recomendada (rápida, antes de mañana)

### Opción A — Desde el panel de administración (más limpia)

1. Entra como admin → **Cursos** → abre el curso correspondiente en modo **Editor**.
2. Ve a la pestaña **Configuración**.
3. Busca la sección **“Numeración de Certificados”** → campo **“Número Base Actual”**.
4. Verás el valor actual (probablemente **120**).
5. Cambia el valor a **el número del último certificado realmente emitido que quieras conservar**. Ejemplo: si en la captura aparece solo el **101 - 2026** como emitido, pon **`101`** y pulsa *Actualizar*.
6. El siguiente **Generar** producirá **102**, luego **103**, y así sucesivamente.

> ⚠️ Importante: la función `update_course_certificate_sequence` en tu base de datos **bloqueará cualquier valor menor al máximo `registration_number` de los certificados que todavía existen** (para no generar duplicados). Por eso funciona bajar a 101 solo si no tienes un certificado 105 aún vivo. Si el sistema rechaza el cambio con el mensaje *“existen certificados emitidos…”*, significa que aún hay certificados con número mayor que necesitas borrar antes.

### Opción B — SQL directo en el panel de Supabase (si la UI no alcanza)

Ve a **Supabase Dashboard → SQL Editor** y ejecuta **en orden**:

```sql
-- 1) Ver estado actual del contador para el curso afectado
SELECT course_id, last_number, updated_at
FROM course_certificate_sequences
WHERE course_id = '<PEGA_AQUI_EL_COURSE_ID>';

-- 2) Ver cuál es el MÁXIMO número realmente emitido hoy para ese curso
SELECT
  MAX(c.registration_number) AS max_emitido,
  MIN(c.registration_number) AS min_emitido,
  COUNT(*)                   AS total_certificados
FROM certificates c
JOIN enrollments e ON c.enrollment_id = e.id
WHERE e.course_id = '<PEGA_AQUI_EL_COURSE_ID>';

-- 3) Listar todos los números existentes para verificar manualmente
SELECT c.registration_number, p.full_name, c.created_at
FROM certificates c
JOIN enrollments e ON c.enrollment_id = e.id
JOIN profiles p   ON e.user_id = p.id
WHERE e.course_id = '<PEGA_AQUI_EL_COURSE_ID>'
ORDER BY c.registration_number;

-- 4) Resetear el contador al valor del MAX emitido
--    (el siguiente generado será MAX + 1)
UPDATE course_certificate_sequences
SET last_number = (
  SELECT COALESCE(MAX(c.registration_number), 100)
  FROM certificates c
  JOIN enrollments e ON c.enrollment_id = e.id
  WHERE e.course_id = '<PEGA_AQUI_EL_COURSE_ID>'
)
WHERE course_id = '<PEGA_AQUI_EL_COURSE_ID>';

-- 5) Verificación final
SELECT * FROM course_certificate_sequences
WHERE course_id = '<PEGA_AQUI_EL_COURSE_ID>';
```

Donde dice `<PEGA_AQUI_EL_COURSE_ID>` sustituye por el UUID del curso (lo obtienes de `SELECT id, title FROM courses;`).

### Opción C — Si quieres reiniciar desde 101 (todos los alumnos desde cero)

Solo si aceptas que el certificado **101 - 2026** existente quede re-numerado:

```sql
-- Borrar TODOS los certificados de ese curso
DELETE FROM certificates
WHERE enrollment_id IN (
  SELECT id FROM enrollments WHERE course_id = '<COURSE_ID>'
);

-- Reiniciar la secuencia a 100 (el próximo generará 101)
UPDATE course_certificate_sequences
SET last_number = 100
WHERE course_id = '<COURSE_ID>';
```

> ⚠️ Esta opción es destructiva. Usa la Opción A o B salvo que estés seguro.

---

## 3. Advertencia crítica para mañana — el ORDEN en que generas importa

Cada vez que pulsas **Generar** en una fila, el sistema asigna el **siguiente número disponible** a ESE estudiante. Es decir:

- Si generas a “Alumno X” primero → recibe **102**.
- Luego a “Alumno Y” → recibe **103**.

Si mañana los estudiantes entran y pulsan “Generar” ellos mismos (desde su panel), el orden lo determina **quién pulse antes**, no un criterio alfabético/inscripción. **Si el orden correlativo es importante para auditoría/registro**, te recomiendo:

1. Que el **admin genere los certificados en lote**, en el orden deseado (por fecha de inscripción, alfabético, etc.), **antes** de habilitar la descarga para los estudiantes.
2. O que el sistema muestre a cada alumno su número solo **después** de generarse, sin prometer correlatividad por lista.

---

## 4. Plan de ejecución sugerido (hoy antes de las 22:00)

1. **Identificar el curso** afectado y copiar su `course_id`.
2. Ejecutar el bloque de SQL de la **Opción B pasos 1–3** en Supabase para confirmar el estado real.
3. Decidir:
   - Si conservas el certificado existente (101): ejecutar paso 4 (reset al MAX actual).
   - Si quieres reiniciar: Opción C.
4. Definir un **orden oficial** de generación (alfabético por DNI, por fecha de inscripción, etc.).
5. El admin genera en ese orden esta noche.
6. Habilitar descarga para estudiantes mañana.

---

## 5. Recomendación de mediano plazo (no urgente para mañana)

El diseño actual deja esta inconsistencia latente cada vez que borras certificados intermedios. Valdría la pena evaluar una de estas mejoras (no las haré ahora, solo las dejo documentadas para el equipo):

- **Re-numeración compacta al borrar**: cuando se elimina un certificado intermedio, renumerar hacia abajo todos los que estaban arriba. *Pro:* correlatividad garantizada. *Contra:* certificados ya emitidos físicamente tendrían número distinto al que aparece en el PDF del alumno → problema legal/auditoría.
- **Aceptar los huecos y documentarlo**: tratar los números como identificador único no necesariamente correlativo (como factura fiscal anulada). *Pro:* histórico estable. *Contra:* saltos visibles.
- **Agregar una acción de admin “Resincronizar secuencia”** en la UI de cada curso que haga el reset automático al MAX actual (equivalente al paso 4 de la Opción B).

Mi recomendación profesional: la opción 2 (aceptar huecos), combinada con el botón “Resincronizar” de la opción 3 para situaciones excepcionales como la de hoy.

---

## Resumen ejecutivo

| Punto | Respuesta |
|---|---|
| ¿Por qué empieza en 121? | El contador `last_number` quedó en 120 porque borraste certificados intermedios, y el RPC solo retrocede cuando borras *el último* emitido. |
| ¿Es un bug? | No en sentido estricto — es una limitación del diseño anti-colisión del RPC de borrado. |
| ¿Solución para mañana? | Opción A (UI → Configuración del curso → Número Base) o Opción B (SQL en Supabase) para resetear al MAX real. |
| ¿Tengo que borrar el 101 existente? | No, si pones el base en 101 el próximo será 102. |
| ¿Riesgo de ejecutar el SQL? | Bajo si se usan los pasos 1–3 para verificar antes. La función ya valida que no se pueda bajar por debajo del MAX emitido. |
