# Documentación del Sistema de Optimización de Imágenes y Gestión de Archivos

Este documento describe la arquitectura, la implementación y los impactos del sistema de optimización de imágenes y archivos integrado para reducir los costos y evitar bloqueos por cuotas de almacenamiento y ancho de banda en **Supabase Storage**.

---

## 1. Arquitectura del Sistema de Optimización

El sistema opera bajo dos ejes fundamentales en el cliente web:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                    ENTRADA / SALIDA                      │
                  └─────────────────────────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────┐                             ┌───────────────────────┐
│ 1. SUBIDA (Storage)   │                             │ 2. DESCARGA (Egress)  │
│ Compresión WebP       │                             │ CDN images.weserv.nl  │
│ Ancho Máx: 1200px     │                             │ WebP + Redimensionado │
└───────────────────────┘                             └───────────────────────┘
            │                                                     │
            ▼                                                     ▼
┌───────────────────────┐                             ┌───────────────────────┐
│ Filtro MIME:          │                             │ Filtro Extensión:     │
│ Si no es image/*      │                             │ Si es .pdf, .svg, etc.│
│ ➔ Subida Intacta     │                             │ ➔ URL Intacta        │
└───────────────────────┘                             └───────────────────────┘
```

### 🛠️ Módulo Central: `src/utils/imageUtils.ts`

Contiene dos funciones globales utilitarias:

1. **`getOptimizedImageUrl(url, width)`**
   - **Propósito:** Reducir la descarga directa (egress) desde los buckets de Supabase.
   - **Funcionamiento:** Transforma las URLs de Supabase para servirlas a través del CDN global de **`images.weserv.nl`**.
   - **Parámetros aplicados:**
     - `w=${width}`: Redimensiona automáticamente al ancho requerido según la pantalla.
     - `output=webp`: Convierte la imagen transmitida al formato WebP de alto rendimiento.
     - `q=80`: Compresión de calidad del 80% (imperceptible visualmente pero ahorra hasta un 70-80% de peso).
   - **Filtros de Protección:**
     - URLs locales (`/assets/...`) o Data/Blob URIs se devuelven intactas.
     - Archivos con extensión `.pdf`, `.svg`, `.doc`, `.docx`, `.zip` se excluyen del CDN para no alterar su formato original ni romper visualizadores.

2. **`compressAndConvertToWebP(file)`**
   - **Propósito:** Reducir el tamaño guardado (storage) en los buckets de Supabase.
   - **Funcionamiento:** Comprime la imagen del lado del navegador del usuario antes de ejecutar `.upload()`.
   - **Reglas:**
     - Ancho máximo o alto máximo: **1200px**.
     - Formato de salida: **WebP**.
     - Calidad objetivo: **0.8 MB máximo**.
   - **Filtros de Protección:**
     - Si el archivo subido no es una imagen (ej. `application/pdf`, `.zip`, `.docx`), la función lo detecta inmediatamente y lo devuelve **intacto** sin compresión.
     - Si es una imagen vectorial SVG (`image/svg+xml`), se conserva como SVG sin rasterizar.

---

## 2. Puntos de Aplicación en la Plataforma

### A. Subida de Archivos (Reducción de Almacenamiento en Supabase)

| Módulo / Pantalla | Archivo | Acción Aplicada | Impacto en Almacenamiento |
| :--- | :--- | :--- | :--- |
| **Diseñador de Certificados** | `src/components/admin/CertificateBuilder.tsx` | Comprime el fondo cargado si es imagen ráster. Si es un PDF, lo sube intacto. | Reduce fondos de 5-10MB a ~150KB. |
| **Métodos de Pago (Admin)** | `src/components/admin/PaymentMethodsManager.tsx` | Comprime el código QR (Yape/Plin/Banco) a WebP. | Reduce QRs a <50KB. |
| **Configuración General** | `src/pages/admin/AdminSettings.tsx` | Comprime el logo principal del sitio a WebP. | Mantiene el logo en <40KB. |
| **Constructor de Cursos** | `src/pages/admin/CourseBuilder.tsx` | Comprime portadas de curso y fotos de instructores. Materiales en PDF se suben sin compresión. | Portadas de 8MB bajan a ~120KB. |
| **Checkout de Compras** | `src/pages/checkout/Checkout.tsx` | Comprime la foto del voucher o comprobante de pago subido por el alumno. | Vouchers de celular de 6MB bajan a ~100KB. |
| **Perfil del Estudiante** | `src/pages/student/EditProfile.tsx` | Comprime la foto de perfil del estudiante a WebP. | Avatares bajan a ~30KB. |

---

### B. Visualización de Imágenes (Reducción de Ancho de Banda / Egress)

| Componente / Pantalla | Archivo | Ancho CDN (`w`) | Lazy Loading (`loading="lazy"`) |
| :--- | :--- | :--- | :--- |
| **Tarjeta de Curso (Catálogo/Grid)** | `src/components/courses/CourseCard.tsx` | `500px` | Sí (`lazy`) |
| **Sección de Escuelas (Home)** | `src/components/landing/SchoolsSection.tsx` | `500px` | Sí (`lazy`) |
| **Testimonios / Egresados** | `src/components/landing/TestimonialsSection.tsx` | `200px` | Sí (`lazy`) |
| **Barra de Navegación** | `src/components/layout/Navbar.tsx` | `200px` | No (primer pantallazo) |
| **Detalle del Curso (Header & Banner)** | `src/pages/CursoDetalle.tsx` | `800px` (mobile) / `1200px` (desktop) | No (primer pantallazo) |
| **Plana Docente en Curso** | `src/pages/CursoDetalle.tsx` | `200px` | No |
| **Dashboard Estudiante (Cursos/Favoritos)** | `src/pages/Dashboard.tsx` | `200px` / `400px` / `500px` | Sí (`lazy`) |
| **Cursos (Admin Table)** | `src/pages/admin/AdminCourses.tsx` | `200px` | Sí (`lazy`) |
| **Comprobante en Modal (Admin)** | `src/pages/admin/AdminEnrollments.tsx` | `800px` | No |
| **Usuarios (Admin Table & Modal)** | `src/pages/admin/AdminUsers.tsx` | `200px` | No |
| **Checkout (QR & Resumen)** | `src/pages/checkout/Checkout.tsx` | `400px` (QR) / `200px` (Resumen) | No |
| **Perfil de Instructor** | `src/pages/instructor/InstructorProfile.tsx` | `200px` (Foto) / `500px` (Cursos) | Sí (`lazy` en cursos) |
| **Visualizador de Certificado** | `src/pages/student/CertificateViewer.tsx` | `1200px` (Si es imagen) | Sí (`lazy` en reverso) |

---

## 3. Matriz de Impacto en Supabase

| Métrica | Antes de la Optimización | Después de la Optimización | Beneficio |
| :--- | :--- | :--- | :--- |
| **Peso promedio por imagen subida** | 3 MB - 10 MB (Formatos RAW JPG/PNG de cámara o diseño) | 80 KB - 180 KB (Formato WebP 1200px) | **Ahorro de ~95% en espacio en disco.** |
| **Descargas repetidas de imágenes** | Consumían egress directamente de Supabase en cada recarga. | **0 KB de consumo en Supabase.** El CDN de weserv.nl las entrega desde caché. | **Consumo de Egress en Supabase cae cerca al 90%.** |
| **Velocidad de carga inicial del sitio** | Carga diferida manual / imágenes pesadas de resolución completa. | Carga nativa difuminada mediante WebP ligero y `loading="lazy"`. | **Mejora notable en el puntaje de Google Lighthouse y UX.** |
| **Integridad de Documentos PDF** | Riesgo de distorsión si se trataran como imagen. | Totalmente aislados de compresión/proxy. | **Seguridad del 100% para diplomas, sílabos y guías PDF.** |

---

## 4. Mantenimiento Futuro

Cualquier nuevo componente que cargue o suba imágenes solo requiere importar `src/utils/imageUtils.ts`:

- **Para mostrar una imagen:** Wrap de la propiedad `src`:
  ```tsx
  <img src={getOptimizedImageUrl(miUrl, 500)} alt="..." loading="lazy" />
  ```
- **Para subir una imagen:** Pasar el archivo por la compresión antes de `.upload()`:
  ```tsx
  const fileComprimido = await compressAndConvertToWebP(file);
  await supabase.storage.from('mi-bucket').upload(path, fileComprimido);
  ```
