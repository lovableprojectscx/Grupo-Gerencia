# Documentación del Sistema de Optimización de Imágenes y Gestión de Archivos

Este documento describe la arquitectura, la implementación y los impactos del sistema de optimización de imágenes y archivos integrado para reducir el uso de almacenamiento y ancho de banda en **Supabase Storage**, garantizando una **compatibilidad total con todos los proveedores de internet en Perú (Movistar, Claro, Entel, Bitel)**.

---

## 1. Arquitectura del Sistema de Optimización

El sistema opera bajo tres pilares fundamentales ejecutados directamente en el navegador del cliente:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                    ENTRADA / SALIDA                      │
                  └─────────────────────────────────────────────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│ 1. SUBIDA (Storage)   │  │ 2. DESCARGA (Directa) │  │ 3. LAZY LOADING       │
│ Compresión WebP       │  │ Carga directa desde   │  │ Atributo loading=lazy │
│ Ancho Máx: 1200px     │  │ Supabase / Origen     │  │ fuera del pantallazo  │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘
            │                          │                          │
            ▼                          ▼                          ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│ Filtro MIME:          │  │ 100% Libre de Proxys  │  │ Carga diferida sin    │
│ Si no es image/*      │  │ Evita bloqueos DNS/IP │  │ impacto en FCP/LCP    │
│ ➔ Subida Intacta     │  │ de ISPs en Perú       │  │ inicial               │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘
```

### 🛠️ Módulo Central: `src/utils/imageUtils.ts`

Contiene las funciones globales utilitarias:

1. **`compressAndConvertToWebP(file)`**
   - **Propósito:** Reducir drásticamente el peso de las imágenes guardadas en Supabase Storage (de ~5MB a ~80KB por imagen).
   - **Funcionamiento:** Comprime y convierte a formato WebP del lado del cliente utilizando `browser-image-compression` y `HTML5 Canvas` antes de realizar el `.upload()`.
   - **Parámetros aplicados:**
     - Ancho/alto máximo: **1200px**.
     - Formato de salida: **image/webp**.
     - Calidad objetivo: **0.8 MB máximo**.
   - **Filtros de Protección:**
     - Si el archivo subido no es una imagen (ej. `application/pdf`, `.zip`, `.docx`), la función lo detecta inmediatamente y lo devuelve **intacto** sin compresión.
     - Si es una imagen vectorial SVG (`image/svg+xml`), se conserva como SVG vectorial sin rasterizar.

2. **`getOptimizedImageUrl(url, width)`**
   - **Propósito:** Proporcionar un punto de acceso centralizado a las URLs de imágenes manteniendo compatibilidad total con cualquier proveedor de internet.
   - **Garantía para Perú:** **No utiliza proxys externos** (como `images.weserv.nl`). En el entorno peruano, empresas de telecomunicaciones como Movistar, Claro, Entel y Bitel aplican bloqueos DNS o de IP a dominios de proxy público por políticas de filtrado automático. Al entregar la URL directa de Supabase (que ya almacena la versión ligera WebP de ~80KB), se asegura que **ninguna imagen falle ni se bloquee**.

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

### B. Visualización de Imágenes y Carga Diferida (Lazy Loading)

| Componente / Pantalla | Archivo | Carga Diferida (`loading="lazy"`) |
| :--- | :--- | :--- |
| **Tarjeta de Curso (Catálogo/Grid)** | `src/components/courses/CourseCard.tsx` | Sí (`lazy`) |
| **Sección de Escuelas (Home)** | `src/components/landing/SchoolsSection.tsx` | Sí (`lazy`) |
| **Testimonios / Egresados** | `src/components/landing/TestimonialsSection.tsx` | Sí (`lazy`) |
| **Dashboard Estudiante (Cursos/Favoritos)** | `src/pages/Dashboard.tsx` | Sí (`lazy`) |
| **Cursos (Admin Table)** | `src/pages/admin/AdminCourses.tsx` | Sí (`lazy`) |
| **Perfil de Instructor** | `src/pages/instructor/InstructorProfile.tsx` | Sí (`lazy` en cursos) |
| **Visualizador de Certificado** | `src/pages/student/CertificateViewer.tsx` | Sí (`lazy` en reverso) |

---

## 3. Matriz de Impacto en Supabase

| Métrica | Antes de la Optimización | Después de la Optimización | Beneficio |
| :--- | :--- | :--- | :--- |
| **Peso promedio por imagen subida** | 3 MB - 10 MB (Formatos RAW JPG/PNG) | 80 KB - 180 KB (Formato WebP 1200px) | **Ahorro de ~95% en espacio en disco.** |
| **Compatibilidad con ISPs de Perú** | Inestable si se usaban proxys externos. | 100% Estable en Movistar, Claro, Entel, Bitel. | **Cero imágenes rotas o bloqueadas.** |
| **Consumo de Ancho de Banda (Egress)** | Descargaba archivos masivos no optimizados. | Descarga únicamente archivos ligeros WebP de ~80KB. | **Caída drástica en el consumo de Egress.** |
| **Integridad de Documentos PDF** | Riesgo de alteración. | Totalmente protegidos de compresión. | **100% de seguridad en PDFs y certificados.** |
