# 📦 REGISTRO DE ACTUALIZACIONES — GERENCIA Y DESARROLLO GLOBAL

> Historial detallado de todos los cambios aplicados al sistema, con descripción técnica de cada modificación.

---

## v1.4 — Recursos Descargables por Curso (Abril 2026)

**Fecha:** 12 de Abril de 2026
**Tipo:** Nueva funcionalidad
**Estado:** ✅ Aplicado en producción

---

### 🎯 Objetivo

Permitir que el administrador suba archivos (PDF, PowerPoint, Word) a cada curso como materiales de apoyo descargables, y que los estudiantes puedan verlos y descargarlos tanto desde la página pública del curso como desde el aula virtual.

---

### 📁 Archivos Creados

#### 1. `supabase/migrations/20260412_course_resources.sql`
**Rol:** Migración de base de datos — crea la tabla y seguridad.

```sql
-- Tabla principal
course_resources (
  id          UUID PRIMARY KEY
  course_id   UUID → FK courses(id) ON DELETE CASCADE
  title       TEXT NOT NULL           -- Nombre visible para estudiantes
  description TEXT                   -- Descripción opcional
  file_url    TEXT NOT NULL           -- URL pública en Supabase Storage
  file_name   TEXT NOT NULL           -- Nombre original del archivo
  file_type   TEXT                    -- 'pdf' | 'ppt' | 'pptx' | 'doc' | 'docx' | 'other'
  file_size   BIGINT                  -- Tamaño en bytes
  order       INTEGER DEFAULT 0       -- Orden de aparición
  created_at  TIMESTAMPTZ DEFAULT now()
)
```

**RLS aplicado:**
| Policy | Quién | Acción |
|--------|-------|--------|
| `resources_select_authenticated` | Cualquier usuario autenticado | SELECT |
| `resources_insert_admin` | Solo `profiles.role = 'admin'` | INSERT |
| `resources_update_admin` | Solo `profiles.role = 'admin'` | UPDATE |
| `resources_delete_admin` | Solo `profiles.role = 'admin'` | DELETE |

**Índice creado:**
```sql
course_resources_course_id_order_idx ON (course_id, "order")
-- Permite listar recursos de un curso ordenados eficientemente
```

> **Estado en Supabase:** ✅ Migración aplicada directamente via API el 12/04/2026. Tabla verificada con 10 columnas + 4 policies + 1 índice.

---

#### 2. `src/components/admin/course-builder/CourseResourcesTab.tsx`
**Rol:** Componente de UI para el panel de administración.

**Qué hace:**
- Lista todos los recursos del curso con nombre, tipo y tamaño
- Botón "Agregar Recurso" abre el selector de archivos del sistema
- Acepta: `.pdf`, `.ppt`, `.pptx`, `.doc`, `.docx` (máx. 20 MB)
- Antes de subir muestra un Dialog para confirmar/editar el nombre visible
- Sube el archivo a Supabase Storage en la ruta: `course-content/resources/{courseId}/{timestamp}.{ext}`
- Guarda la metadata en la tabla `course_resources`
- Muestra íconos por tipo: 🔴 PDF / 🟠 PowerPoint / 🔵 Word
- Botón de descarga por recurso (abre en nueva pestaña)
- Botón de eliminación con AlertDialog de confirmación
- Al eliminar: borra el archivo del Storage Y el registro de la BD
- Si no hay recursos, muestra estado vacío con instrucciones
- Manejo de errores con toasts descriptivos

**Dependencias usadas:** `useQuery`, `useMutation`, `@tanstack/react-query`, `supabase`, `courseService.getResources/createResource/deleteResource`

---

### 📝 Archivos Modificados

#### 3. `src/services/courseService.ts`

**Cambios:**
- Agregada interface `CourseResource`:
```typescript
export interface CourseResource {
    id: string;
    course_id: string;
    title: string;
    description?: string;
    file_url: string;
    file_name: string;
    file_type: 'pdf' | 'ppt' | 'pptx' | 'doc' | 'docx' | 'other';
    file_size?: number;
    order: number;
    created_at?: string;
}
```

- Agregados 4 métodos al objeto `courseService`:

| Método | Qué hace |
|--------|---------|
| `getResources(courseId)` | Lista recursos de un curso ordenados por `order` ASC |
| `createResource(resource)` | Inserta nuevo recurso en la tabla |
| `updateResource(id, updates)` | Actualiza campos de un recurso |
| `deleteResource(id, filePath)` | Borra el archivo del Storage y luego el registro |

---

#### 4. `src/pages/admin/CourseBuilder.tsx`

**Cambios:**
- Import agregado: `import { CourseResourcesTab } from "@/components/admin/course-builder/CourseResourcesTab"`
- Nueva pestaña en el `<TabsList>`: `"Recursos"` (entre "Diseño Certificado" y "Configuración")
- Nuevo `<TabsContent value="resources">`:
  - Si el curso está siendo **editado** (`isEditing = true`): renderiza `<CourseResourcesTab courseId={id} />`
  - Si es un curso **nuevo**: muestra mensaje "Guarda el curso primero" con botón para guardar borrador

**Orden final de pestañas:**
1. Información General
2. Plan de Estudios
3. Diseño Certificado
4. **Recursos** ← NUEVA
5. Configuración

---

#### 5. `src/pages/Classroom.tsx`

**Cambios:**

- Imports agregados: `File`, `Presentation` desde `lucide-react`
- Nuevo query de React Query:
```typescript
const { data: resources = [] } = useQuery({
    queryKey: ["course-resources", courseId],
    queryFn: () => courseService.getResources(courseId!),
    enabled: !!courseId,
});
```

- Nueva sección visual **"Materiales Descargables"** en el área principal del aula:
  - Se renderiza solo si el curso tiene recursos (`resources.length > 0`)
  - Cada recurso es un enlace `<a href download>` que descarga el archivo
  - Íconos por tipo de archivo con colores diferenciados
  - Efecto hover: resalta el ícono y cambia color del texto
  - Ubicación en el layout: debajo de las tarjetas de Navegación y Progreso

---

#### 6. `src/pages/CursoDetalle.tsx`

**Cambios:**

- Imports agregados: `File`, `Presentation` desde `lucide-react`
- Nuevo query de React Query:
```typescript
const { data: resources = [] } = useQuery({
    queryKey: ["course-resources", course?.id],
    queryFn: () => courseService.getResources(course!.id),
    enabled: !!course?.id
});
```

- Nueva sección **"Materiales del Curso"** en la página pública del curso:
  - Se renderiza solo si el curso tiene recursos
  - Aparece entre el "Plan de Estudios" y "Sigue aprendiendo"
  - Layout tipo grid: 1 col (móvil) / 2 cols (tablet) / 3 cols (desktop)
  - Cada recurso: tarjeta con ícono + nombre + tipo + botón descarga
  - Animación `framer-motion` de entrada (fade + slide)
  - Efecto hover: borde azul + sombra + escala del ícono
  - **Visible para cualquier visitante** (incluso sin inscribirse)

---

### 🗄️ Storage en Supabase

**Bucket utilizado:** `course-content` (ya existente)
**Ruta nueva:** `resources/{courseId}/{timestamp}.{ext}`

```
course-content/
  ├── covers/           (portadas de cursos — existente)
  ├── certificates/     (plantillas de certificados — existente)
  ├── instructors/      (fotos de docentes — existente)
  ├── receipts/         (comprobantes de pago — existente)
  └── resources/        ← NUEVA CARPETA
        └── {courseId}/
              └── {timestamp}.pdf/.pptx/.docx
```

---

### 🔄 Flujo Completo Admin → Estudiante

```
Admin
  └── CourseBuilder → pestaña "Recursos"
        └── Clic "Agregar Recurso"
              └── Selecciona archivo (PDF/PPT/Word, máx 20MB)
                    └── Dialog: editar nombre visible
                          └── Clic "Subir recurso"
                                ├── Storage: guarda en resources/{courseId}/
                                └── BD: inserta en course_resources

Estudiante (sin inscripción)
  └── CursoDetalle → sección "Materiales del Curso"
        └── Descarga directa

Estudiante (inscrito)
  └── Classroom → sección "Materiales Descargables"
        └── Descarga directa
```

---

### ✅ Prueba recomendada post-deploy

1. Admin → editar cualquier curso → pestaña "Recursos"
2. Subir un PDF de prueba
3. Verificar que aparece en la lista con nombre, tipo y tamaño
4. Abrir la página pública del curso → confirmar que aparece la sección "Materiales del Curso"
5. Abrir el aula virtual → confirmar que aparece "Materiales Descargables"
6. Eliminar el recurso desde admin → confirmar que desaparece de ambas vistas

---

---

## v1.3 — Arquitectura Multi-Docente (Marzo 2026)

**Fecha:** Marzo 2026
**Tipo:** Nueva funcionalidad + corrección arquitectural
**Estado:** ✅ Aplicado en producción

### Resumen
Reemplazo de la relación 1:1 curso-docente por una relación N:N usando tabla intermedia `course_instructors`. Permite asignar múltiples docentes a un mismo curso.

### Cambios aplicados
| Archivo | Cambio |
|---------|--------|
| Migración SQL | Tabla `course_instructors (course_id, instructor_id)` con PK compuesta |
| `courseService.ts` | CRUD actualizado para sincronizar lista de `instructor_ids` |
| `CourseBuilder.tsx` | Selector de docentes tipo badges, soporte para múltiples selecciones |
| `CursoDetalle.tsx` | Sección "Plana Docente" rediseñada mostrando todos los docentes asignados |
| `CourseGeneralTab.tsx` | UI de asignación múltiple con botón "Agregar docente" |

---

## v1.2 — Correcciones de Base de Datos y RLS (Febrero-Marzo 2026)

**Fecha:** Febrero — Marzo 2026
**Tipo:** Correcciones de bugs críticos
**Estado:** ✅ Aplicado

### Migraciones aplicadas en este período

| Archivo | Descripción |
|---------|-------------|
| `20260223_fix_certificate_issues.sql` | Corrección en generación de certificados |
| `20260223_storage_receipts_policy.sql` | Policy de Storage para comprobantes de pago |
| `20260224_delete_user_by_admin.sql` | RPC para que admin pueda eliminar usuarios |
| `20260224_certificate_year.sql` | Campo `year` en certificados |
| `20260224_audit_and_fix_rls.sql` | Auditoría y corrección de políticas RLS |
| `20260224_admin_edit_email.sql` | RPC para editar email desde admin |
| `20260227_backfill_certificate_year.sql` | Backfill de año en certificados existentes |
| `20260227_default_certificate_template.sql` | Plantilla de certificado por defecto |
| `20260305_set_certificate_year_from_template.sql` | Derivar año desde plantilla |
| `20260307_fix_dni_search_rpc.sql` | Corrección en búsqueda por DNI |
| `20260307_fix_duration_null_search.sql` | Fix para duración null en búsquedas |
| `20260308_configure_cert_sequences.sql` | Secuencias atómicas de numeración de certificados |
| `20260315_drop_duplicate_generate_certificate_v2.sql` | Limpieza de función duplicada |
| `20260315_fix_verify_certificate_search.sql` | Corrección búsqueda verificación |
| `20260315_fix_delete_certificate_race_condition.sql` | Fix race condition al eliminar certs |
| `20260315_add_certificate_enrollment_unique.sql` | Constraint único enrollment-certificado |
| `20260317_backfill_completed_status.sql` | Backfill status completado en enrollments |

---

## v1.1 — Número de Registro en Certificados (Enero 2026)

**Fecha:** Enero 2026
**Tipo:** Nueva funcionalidad
**Estado:** ✅ Aplicado

### Cambios
- Migración `20260129_add_registration_number.sql`: campo `registration_number` en `certificates`
- Sistema de secuencias atómicas por curso para numeración correlativa sin saltos

---

*Documento mantenido por el equipo técnico — Gerencia y Desarrollo Global*
*Última actualización: 12 de Abril de 2026*
