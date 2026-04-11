# Documentación del Rediseño Premium: Detalle del Curso

Esta documentación detalla los cambios implementados en la página de **Detalles del Curso** (`/curso/:id`) enfocados en maximizar la tasa de conversión (CRO) y elevar el estándar gráfico a una estética "Ultra-Premium".

## 1. Hero Section (Sección Principal)

Se eliminó el diseño básico por un layout inmersivo y moderno:
- **Background Dinámico:** Se implementó un *Mesh Gradient* oscuro (`#0A0F1C`) con orbes de luz desenfocados (`blue-600` y `purple-600`) que laten sutilmente mediante animaciones (`animate-pulse-slow`), complementado con una capa de ruido visual para añadir textura.
- **Efecto de Gravedad 3D (Desktop):** La imagen de portada del curso ahora incluye un efecto tridimensional (`perspective-1000`, `rotate-y`, `rotate-x`) al hacer *hover*, dándole una sensación táctil y de producto físico de alto valor. Se le sumó un resplandor ambiental y un *badge* flotante de "Certificación Verificada".
- **Glassmorphism:** Las métricas de "Alumnos", "Duración" y "Valoración" dejaron de ser simples textos y pasaron a ser placas tipo "vidrio esmerilado" (`bg-white/5`, `backdrop-blur-md`) que flotan sobre el fondo con íconos iluminados en colores de acento.

## 2. Layout y Sidebar Magético (Tarje de Precio)

Para garantizar que el precio y el llamado a la acción (CTA) se vean irrechazables:
- **Overlapping (Profundidad):** Se aplicó un margen negativo (`-mt-24`) a la sección de contenido para que se superponga sobre el Hero Section oscuro, estructurando visualmente la página y guiando el ojo del usuario.
- **Tarjeta Elevada:** El Sticky Sidebar (sidebar fijo) incorpora un highlight superior con un gradiente púrpura.
- **Botón de Conversión CTA:** Se estandarizó el uso del color **Rojo** (`bg-gradient-to-r from-red-600 to-red-500`) para el botón de "Inscribirse Ahora" por ser el color de más alta conversión psicológica para ventas.

## 3. Experiencia Móvil Optimizada (Mobile CTA)

Para evitar la redundancia y facilitar el cierre de compra en celulares:
- **Mobile Sticky CTA:** Se añadió una barra oscura estática fijada a la parte inferior de la pantalla. Siempre está visible.
- **Botones de Conversión Rápida:** Además del precio y el botón rojo, la barra (y la tarjeta de Desktop) incorpora dos botones secundarios "Ghost": 
    - **Favoritos (Corazón):** Para guardar el curso para después.
    - **Compartir (Share2 - DropdownMenu Pop-up):** Abre un menú desplegable interactivo y elegante (construido con `shadcn/ui DropdownMenu`) que ofrece opciones directas e iconos reconocibles para compartir por **WhatsApp, Facebook Messenger, y Twitter**. También mantiene la opción nativa (`navigator.share`) para celulares y un botón explícito de "Copiar Enlace".
- **Eliminación de Redundancia:** El recuadro fijo del "Sticky Sidebar" que duplicaba información visible se ocultó completamente en vistas móviles (`hidden lg:block`), limpiando la pantalla para que el usuario pueda leer la descripción del curso sin distracciones.

## 4. Temario y Acordeones

Para reducir la fricción de lectura y mostrar abudancia de contenido:
- **Tarjetas de Módulos Separadas:** El temario ahora renderiza cada módulo como una tarjeta independiente en lugar de una lista continua (`AccordionItem` separados con bordes `rounded-2xl`).
- **Estados Interactivos:** Efectos `hover`, íconos de libro abierto e íconos de Play (`Video`) para enfatizar qué lecciones incluyen material audiovisual.

## 5. Archivos Clave Modificados

- `src/pages/CursoDetalle.tsx`: Controla toda la interfaz de la página de detalle del producto. 
- Contiene los cálculos de precios, diseño de Hero, Sidebar, Mobile Sticky CTA, Acordeón de Contenido (Módulos y Lecciones), y la nueva Sección de Plana Docente (N:N).
- `src/services/courseService.ts`: Actualizado para resolver ambigüedad de joins y soportar relación muchos-a-muchos.

## 6. Nueva Sección: Plana Docente (Multi-Docente)

Se ha reemplazado el selector de instructor único por una sección de "Plana Docente" de alta gama:
- **Arquitectura N:N:** El sistema ahora permite asignar infinitos docentes a un mismo curso mediante una tabla intermedia.
- **Diseño Glass:** Cada docente se presenta en una placa de cristal (`bg-white/5`, `backdrop-blur-md`) con su avatar circular iluminado.
- **Resiliencia:** Si el curso no tiene docentes asignados en la base de datos, el sistema muestra automáticamente un marcador de posición ("Docente Especialista") para nunca dejar el diseño roto o vacío.

---
*Gerencia y Desarrollo Global - Documentación de UI/UX v1.3*
