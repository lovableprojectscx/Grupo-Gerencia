# 📋 FUNCIONALIDADES DEL SISTEMA — AUDITORÍA EXHAUSTIVA
**Gerencia y Desarrollo Global — Marzo 2026**
*Revisión completa: 20 páginas/componentes + 4 hooks + 9 migraciones + services*

---

> **Leyenda:** ✅ Funciona | ⚠️ Funciona con limitaciones | ❌ Roto | 🔲 No implementado

---

## 1. 🔐 AUTENTICACIÓN Y SESIÓN

### 1.1 Registro
| Función | Estado | Problema |
|---------|--------|---------|
| Crear cuenta con email + contraseña | ✅ | — |
| Guardar nombre, DNI, teléfono en perfil trigger | ✅ | — |
| Validaciones de formulario | ✅ | — |
| Redirección post-registro | ✅ | — |
| Verificación de email (confirmación) | 🔲 | No está activada en Supabase Auth — el usuario puede registrarse con un email falso |

### 1.2 Login
| Función | Estado | Problema |
|---------|--------|---------|
| Login email + contraseña | ✅ | — |
| Toggle mostrar contraseña | ✅ | — |
| Redirección según rol (admin/student) | ✅ | — |
| Mensaje de error claro en login fallido | ✅ | — |

### 1.3 Rol de administrador (`AuthContext.tsx` línea 86)
| Función | Estado | Problema |
|---------|--------|---------|
| Detectar admin por `profiles.role = 'admin'` | ⚠️ | **PROBLEMA ARQUITECTURAL:** el contexto sobreescribe el rol con `email === 'admin@gerencia.com'` hardcodeado. Si el admin cambia su email (posible desde AdminUsers), deja de ser admin en la app aunque tenga `role='admin'` en DB. |
| Fallback para usuario sin perfil | ✅ | Usa `user_metadata` como respaldo |

### 1.4 Logout
| Función | Estado | Problema |
|---------|--------|---------|
| Logout desde Navbar (estudiante) | ✅ | Llama `signOut()` correctamente |
| ❌ Logout desde AdminSidebar | ❌ | `AdminSidebar.tsx` líneas 137-142: El botón "Cerrar Sesión" es solo un `<Link to="/">`. **NO llama `supabase.auth.signOut()`. La sesión sigue activa después de navegar.** |

### 1.5 Protección de rutas (`ProtectedRoute.tsx`)
| Función | Estado | Problema |
|---------|--------|---------|
| Bloquear rutas admin sin sesión | ✅ | — |
| Bloquear rutas estudiante sin sesión | ✅ | — |
| Spinner durante carga | ✅ | — |

### 1.6 Recuperación de contraseña
| Función | Estado | Problema |
|---------|--------|---------|
| Solicitar reset por email | ✅ | — |
| Nueva contraseña desde enlace | ✅ | — |

---

## 2. 🏠 LANDING PAGE

| Función | Estado | Problema |
|---------|--------|---------|
| Hero con call-to-action | ✅ | — |
| Sección Cursos Destacados | ✅ | Carga desde DB |
| Sección Features, Testimonios, CTA | ✅ | Estáticas |
| WhatsApp flotante | ✅ | Número desde `site_settings` |
| ⚠️ Rating en CourseCard siempre 5.0 | ⚠️ | `Catalogo.tsx` línea 541 y todos los `CourseCard`: `rating={5.0}` **hardcodeado**. El campo `rating` no existe en DB — siempre muestra 5 estrellas sin importar la calidad real |
| ⚠️ Duración en CourseCard siempre "Flexible" | ⚠️ | `Catalogo.tsx` línea 543: `duration="Flexible"` **hardcodeado**. El curso puede tener `duration` definida en DB pero nunca se pasa al componente |

---

## 3. 📖 CATÁLOGO DE CURSOS (`Catalogo.tsx`)

| Función | Estado | Problema |
|---------|--------|---------|
| Carga cursos publicados y no archivados | ✅ | — |
| Filtro por área/categoría | ✅ | Funciona en cliente |
| Filtro por tipo de programa | ✅ | Lee `metadata[].key='program_type'` |
| Filtro por modalidad | ✅ | — |
| Filtro por precio | ✅ | — |
| Búsqueda por texto | ✅ | Filtra en título, subtítulo y descripción |
| Ordenar (precio, novedad) | ✅ | — |
| Paginación (6 por página) | ✅ | Con ellipsis inteligente |
| URL params `?q=` y `?area=` desde Navbar | ✅ | — |
| Limpiar filtros | ✅ | — |
| Filtros activos como chips removibles | ✅ | — |
| CTA WhatsApp "solicitar curso" | ✅ | — |
| ⚠️ `currentPage` no se resetea al cambiar búsqueda de texto | ⚠️ | `Catalogo.tsx` línea 387-390: El `searchQuery onChange` llama `setCurrentPage(1)` ✅, pero esto solo ocurre en la búsqueda de texto. Si el conteo de resultados cae y la página actual ya no existe, el grid queda vacío aunque haya resultados |
| ⚠️ Todos los cursos cargados de una sola vez | ⚠️ | `courseService.getPublished()` trae **todos** los cursos publicados sin paginación en DB. Con muchos cursos (>100) esto puede generar carga inicial lenta |

---

## 4. 📄 DETALLE DEL CURSO (`CursoDetalle.tsx`)

| Función | Estado | Problema |
|---------|--------|---------|
| Carga por UUID o slug | ✅ | `courseService.getById()` detecta formato automáticamente |
| Título, descripción, precio, instructor | ✅ | — |
| Galería con imagen de portada | ✅ | — |
| Descuento calculado dinámicamente | ✅ | — |
| Acordeón de módulos/lecciones | ✅ | — |
| Botón "Inscribirme" → checkout | ✅ | — |
| Botón "Ir al Aula" si inscrito activo | ✅ | — |
| Mensaje amarillo si `status=pending` | ✅ | — |
| Mensaje rojo si `status=rejected` | ✅ | — |
| Favoritos (agregar/quitar) | ✅ | — |
| Compartir en redes/copiar link | ✅ | — |
| Meta tags Open Graph dinámicos | ✅ | — |
| Cursos relacionados (misma categoría) | ✅ | — |
| ⚠️ Usa `getUser()` en lugar de `useAuth()` | ⚠️ | `CursoDetalle.tsx` dentro de `useEffect`: llama `supabase.auth.getUser()` y guarda resultado en estado local, aunque `AuthContext` ya tiene esta info. Genera un fetch extra por visita |

---

## 5. 💳 CHECKOUT Y PAGO (`Checkout.tsx`)

| Función | Estado | Problema |
|---------|--------|---------|
| Mostrar datos del curso a comprar | ✅ | — |
| Listar métodos de pago activos | ✅ | Query a `payment_methods` |
| Seleccionar método de pago | ✅ | — |
| Instrucciones del método seleccionado | ✅ | — |
| Subir comprobante (archivo/imagen) | ✅ | Sube a Supabase Storage |
| Drag & Drop del comprobante | ✅ | — |
| Preview del archivo | ✅ | Para imágenes |
| Crear inscripción `status=pending` | ✅ | — |
| Verificar inscripción previa existente | ✅ | Guard antes del insert |
| ❌ Validación de tamaño de archivo | ❌ | **No hay validación de `file.size` antes del upload.** Si el usuario sube un archivo >5MB, el error de Supabase Storage aparece como toast genérico sin decir el límite |
| ⚠️ Usa `getUser()` en lugar de `useAuth()` | ⚠️ | Mismo patrón que CursoDetalle — fetch extra al servidor |

---

## 6. 📊 DASHBOARD DEL ESTUDIANTE (`Dashboard.tsx`)

### Estadísticas superiores
| Función | Estado | Problema |
|---------|--------|---------|
| "Cursos En Progreso" | ✅ | Filtra `status=active && progress < 100` |
| "Cursos Completados" | ✅ | Filtra `status=active && progress === 100` |
| ❌ "Certificados" count | ❌ | **Muestra `completedCourses.length` en lugar del count real de certificados.** La query ya trae `certificate:certificates(id)` pero ese dato se ignora. Un curso completado no siempre tiene certificado — el admin debe generarlo. |
| Progreso promedio | ✅ | — |

### Tab "Mis Cursos"
| Función | Estado | Problema |
|---------|--------|---------|
| Cursos activos con barra de progreso | ✅ | — |
| Cursos completados | ✅ | — |
| ❌ Inscripciones pendientes invisibles | ❌ | **El estudiante que acaba de pagar y subir su voucher NO ve ningún indicador en su dashboard.** Las inscripciones `status=pending` no aparecen en ninguna sección. El usuario cree que su pago se perdió. |
| Link "Continuar" → Classroom | ✅ | — |

### Tab "Mis Certificados"
| Función | Estado | Problema |
|---------|--------|---------|
| Listar certificados emitidos | ✅ | — |
| Link a `CertificateViewer` | ✅ | — |

### Tab "Favoritos"
| Función | Estado | Problema |
|---------|--------|---------|
| Lista de cursos favoritos | ✅ | — |
| Quitar de favoritos | ✅ | — |

---

## 7. 🎓 AULA VIRTUAL (`Classroom.tsx`)

| Función | Estado | Problema |
|---------|--------|---------|
| Carga módulos y lecciones del curso | ✅ | — |
| Video de YouTube embebido | ✅ | Extrae ID con regex |
| Recurso de texto/PDF (link externo) | ✅ | — |
| Marcar lección como completada | ✅ | — |
| Barra de progreso global | ✅ | — |
| "Completar Todo" con confirmación | ✅ | — |
| "Obtener Certificado" al llegar al 100% | ✅ | — |
| Cursos en vivo: mostrar enlace y fecha | ✅ | Lee `metadata` |
| Sidebar colapsable (desktop) | ✅ | — |
| Sidebar como Sheet (móvil) | ✅ | — |
| ❌ Búsqueda de lecciones en sidebar | ❌ | **`Classroom.tsx` alrededor de línea 473: el `<input placeholder="Buscar lección...">` no tiene `value`, `onChange`, ni lógica de filtrado. Es completamente decorativo.** |
| ⚠️ Usa `getUser()` en lugar de `useAuth()` | ⚠️ | Fetch adicional al servidor en lugar de usar el contexto |

---

## 8. 📜 CERTIFICADOS

### Generación
| Función | Estado | Problema |
|---------|--------|---------|
| Auto-generación al completar desde Classroom | ✅ | RPC `generate_certificate_v2` |
| Generación manual desde AdminEnrollments | ✅ | Mismo RPC |
| Actualizar enrollment a `status=completed` | ✅ | — |

### Verificación pública (`Verificar.tsx` + `/verify/:id`)
| Función | Estado | Problema |
|---------|--------|---------|
| Buscar certificado por ID | ✅ | RPC `verify_certificate_search` |
| Validación mínima (5 caracteres en input) | ✅ | — |
| Mostrar resultado válido/inválido | ✅ | — |
| Botón "Ver y Descargar PDF" | ✅ | Navega a `CertificateViewer` |
| `CertificateViewer`: render + QR + descarga | ✅ | — |

---

## 9. 👤 PERFIL DEL ESTUDIANTE (`EditProfile.tsx`)

| Función | Estado | Problema |
|---------|--------|---------|
| Cargar datos del perfil | ✅ | — |
| Editar nombre, DNI, teléfono | ✅ | Se guardan en `profiles` |
| Email como solo lectura | ✅ | — |
| ❌ Cambiar foto de perfil | ❌ | **El botón "Cambiar Foto" muestra `toast.info("...no disponible en demo")`. Supabase Storage ya está activo en el proyecto pero no se implementó el uploader.** |
| ⚠️ Filtro `.eq('id')` duplicado | ⚠️ | `EditProfile.tsx` línea 44: `.eq('id', user.id).eq('id', user.id)` — filtro duplicado, código muerto |

---

## 10. 🛠️ PANEL DE ADMINISTRADOR

### 10.1 Dashboard Admin (`AdminDashboard.tsx`)
| Función | Estado | Problema |
|---------|--------|---------|
| Cards de métricas (ingresos, inscripciones, cursos, certs) | ✅ | — |
| Inscripciones recientes (últimas 5) | ✅ | — |
| ⚠️ Gráfico de ingresos por mes desordenado | ⚠️ | Los meses aparecen en el orden que devuelve Supabase, no cronológico. Si tienes datos de Mar, Ene, Feb, el gráfico los muestra en ese orden |

### 10.2 Gestión de Cursos (`AdminCourses.tsx`)
| Función | Estado | Problema |
|---------|--------|---------|
| Listar todos los cursos | ✅ | — |
| Filtros (publicado/borrador/activo/archivado) | ✅ | — |
| Búsqueda por título | ✅ | — |
| Toggle publicar/despublicar | ✅ | — |
| Toggle archivar/restaurar (soft delete) | ✅ | — |
| Ir al CourseBuilder | ✅ | — |
| ⚠️ Active state sidebar en subrutas | ⚠️ | `AdminSidebar.tsx` línea 115: `location.pathname === item.url` con `===` exacto. Al editar un curso (`/admin/courses/abc`), el ítem "Cursos" NO se resalta |

### 10.3 CourseBuilder
| Función | Estado | Problema |
|---------|--------|---------|
| Crear/editar curso | ✅ | — |
| Módulos y lecciones CRUD | ✅ | — |
| Upload de imagen portada | ✅ | Supabase Storage |
| Instructor: asignar o crear nuevo | ✅ | — |
| Metadata adicional (live URL, fecha) | ✅ | — |
| Generación automática de slug | ✅ | Con manejo de tildes/ñ |

### 10.4 Gestión de Inscripciones (`AdminEnrollments.tsx`)
| Función | Estado | Problema |
|---------|--------|---------|
| Listar inscripciones paginadas (10/pág) | ✅ | — |
| Aprobar inscripción | ✅ | — |
| Rechazar inscripción | ✅ | — |
| Ver voucher/comprobante | ✅ | Modal con imagen |
| Generar certificado manualmente | ✅ | — |
| Badge realtime de pendientes en sidebar | ✅ | Canal Supabase Realtime |
| ❌ Filtro por tab en base de datos | ❌ | **Las tabs (Pendientes/Activas/Rechazadas) filtran en cliente sobre los 10 resultados de la página. Si hay 30 pendientes en 3 páginas, el tab solo muestra los pendientes de la página actual.** El comentario en el código lo reconoce explícitamente |
| ❌ Búsqueda por nombre no funciona | ❌ | **`searchTerm` está en el `queryKey` (dispara refetch) pero la query SQL no aplica ningún filtro `.ilike()`. La búsqueda nunca filtra nada.** |

### 10.5 Gestión de Usuarios (`AdminUsers.tsx`)
| Función | Estado | Problema |
|---------|--------|---------|
| Lista de usuarios (RPC `get_users_for_admin`) | ✅ | — |
| Búsqueda por nombre o DNI | ✅ | Filtro en cliente (aceptable para esta pantalla) |
| Editar perfil: nombre, DNI, teléfono | ✅ | — |
| Editar email (RPC `update_user_email_by_admin`) | ✅ | — |
| Cambiar rol admin ↔ estudiante | ✅ | — |
| Eliminar usuario (RPC `delete_user_by_admin`) | ✅ | Con AlertDialog de confirmación |
| Link WhatsApp para cada usuario con teléfono | ✅ | — |
| ⚠️ Estado siempre "Activo" | ⚠️ | `AdminUsers.tsx` línea 208-210: todos los usuarios muestran badge verde "Activo" — no hay campo de estado en `profiles` ni lógica para detectar usuarios bloqueados |

### 10.6 Configuración (`AdminSettings.tsx`)
| Función | Estado | Problema |
|---------|--------|---------|
| Editar nombre, descripción, email, teléfono | ✅ | — |
| Editar número de pago y URL del QR | ✅ | — |
| ❌ Guardar URL del Logo | ❌ | **`AdminSettings.tsx` líneas 49-56: `handleSave()` envía el update a Supabase pero omite `logo_url` del objeto. El campo existe en el formulario y se carga correctamente, pero cada vez que se guarda, el logo vuelve al valor anterior en DB.** |
| Gestionar métodos de pago (CRUD) | ✅ | `PaymentMethodsManager` |
| Activar/desactivar método de pago | ✅ | — |
| Builder de plantilla de certificado | ✅ | WYSIWYG `CertificateBuilder` |
| Subir archivo de logo/QR | ⚠️ | `handleFileUpload()` muestra toast informativo y no hace nada. La UI tiene botón de upload pero no implementa la funcionalidad |

---

## 11. 🗄️ BASE DE DATOS Y SEGURIDAD

### RLS (Row Level Security)
| Tabla | Política | Estado |
|-------|----------|--------|
| `profiles` | Usuario ve solo el suyo; Admin ve todos | ✅ |
| `enrollments` | Usuario ve los suyos; Admin ve todos | ✅ |
| `certificates` | Usuario ve los suyos; Público si `metadata.public=true` | ✅ |
| `user_progress` | Usuario gestiona solo el suyo | ✅ |
| `courses` | Publicados visibles para todos; Admin ve borradores | ✅ |

### Funciones/RPCs de base de datos
| Función | Estado | Problema |
|---------|--------|---------|
| `generate_certificate_v2` | ✅ | — |
| `verify_certificate_search` | ✅ | — |
| `get_users_for_admin` | ✅ | — |
| `update_user_email_by_admin` | ✅ | — |
| `delete_user_by_admin` | ✅ | — |

---

## 🚨 RESUMEN CONSOLIDADO DE BUGS

### ❌ CRÍTICOS (impacto directo en negocio o datos)

| # | Archivo | Línea | Descripción | Consecuencia |
|---|---------|-------|-------------|-------------|
| 1 | `AdminSidebar.tsx` | 137-142 | Logout no cierra sesión de Supabase | Admin sigue logeado tras "cerrar sesión" |
| 2 | `Dashboard.tsx` | 136 | Contador "Certificados" usa cursos completados en vez de certificados reales | Stats incorrectos |
| 3 | `Dashboard.tsx` | 68-69 | Inscripciones `pending` invisibles para el estudiante | Usuario no sabe si su pago fue recibido |
| 4 | `Checkout.tsx` | handleFileUpload | Sin validación de tamaño de archivo antes del upload | Error confuso en uploads >5MB |
| 5 | `AdminSettings.tsx` | 49-56 | `logo_url` no se incluye en el `.update()` | Logo no se puede cambiar desde admin |
| 6 | `AdminEnrollments.tsx` | tabs | Filtros por tab actúan en cliente, no en DB | Datos incompletos y engañosos |
| 7 | `AdminEnrollments.tsx` | búsqueda | `searchTerm` dispara refetch pero no filtra en SQL | Búsqueda no funciona en absoluto |

### ⚠️ IMPORTANTES (afectan UX o correctitud de datos)

| # | Archivo | Descripción |
|---|---------|-------------|
| 8 | `AuthContext.tsx` | Admin detectado por email hardcodeado —si el admin cambia email, pierde acceso |
| 9 | `Classroom.tsx` | Buscar lección: input decorativo sin funcionalidad |
| 10 | `Catalogo.tsx` | Rating hardcodeado en 5.0 para todos los cursos |
| 11 | `Catalogo.tsx` | Duración hardcodeada como "Flexible" ignorando el campo DB |
| 12 | `AdminDashboard.tsx` | Gráfico de ingresos sin orden cronológico |
| 13 | `AdminSidebar.tsx` | Active state no resalta en subrutas (`/admin/courses/id`) |
| 14 | `AdminUsers.tsx` | Estado de usuario siempre "Activo" sin lógica real |

### 🔲 NO IMPLEMENTADOS (prometido en UI pero sin funcionalidad)

| # | Archivo | Descripción |
|---|---------|-------------|
| 15 | `EditProfile.tsx` | Cambiar foto de perfil (Supabase Storage disponible pero no conectado) |
| 16 | `AdminSettings.tsx` | Upload de archivo de logo/QR (botón existe pero no hace nada) |
| 17 | Registro | Verificación de email desactivada (registro con email falso posible) |

### 🟡 MENORES (código incorrecto pero sin impacto visible)

| # | Archivo | Descripción |
|---|---------|-------------|
| 18 | `EditProfile.tsx` línea 44 | `.eq('id', user.id)` duplicado — filtro innecesario |
| 19 | `CursoDetalle.tsx` | Llama `getUser()` en lugar de usar `useAuth()` |
| 20 | `Classroom.tsx` | Llama `getUser()` en lugar de usar `useAuth()` |
| 21 | `Checkout.tsx` | Llama `getUser()` en lugar de usar `useAuth()` |
| 22 | `Catalogo.tsx` | Carga todos los cursos a la vez sin paginación en DB |

---

## 🏁 PLAN DE CORRECCIÓN (orden de prioridad)

**Fase 1 — Datos y Seguridad (críticos):**
1. `AdminSidebar.tsx` — Implementar `signOut()` real
2. `AdminSettings.tsx` — Agregar `logo_url` al `.update()`
3. `AdminEnrollments.tsx` — Mover filtros de tab al query de Supabase
4. `AdminEnrollments.tsx` — Agregar `.ilike()` a la búsqueda SQL

**Fase 2 — Experiencia del Estudiante:**
5. `Dashboard.tsx` — Mostrar inscripciones pendientes
6. `Dashboard.tsx` — Contar certificados reales con el join existente
7. `Checkout.tsx` — Validar `file.size > 5MB` antes del upload

**Fase 3 — UX y Calidad:**
8. `Classroom.tsx` — Implementar búsqueda de lecciones
9. `Catalogo.tsx` — Pasar `course.duration` en lugar de "Flexible"
10. `AdminDashboard.tsx` — Ordenar meses del gráfico cronológicamente
11. `AdminSidebar.tsx` — `startsWith()` para active state en subrutas
12. `AuthContext.tsx` — Usar solo `profiles.role` para determinar admin
13. `EditProfile.tsx` / `CursoDetalle.tsx` / `Classroom.tsx` / `Checkout.tsx` — Migrar a `useAuth()`

---
*Auditoría completa — Gerencia y Desarrollo Global — Marzo 2026*
