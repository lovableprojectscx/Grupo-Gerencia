# Documentación del Sistema de Catálogo Académico

Esta documentación detalla el funcionamiento, la estructura y la gestión del catálogo de cursos de la plataforma.

## 1. Estructura de Categorías e Iconografía

El catálogo organiza los cursos en **Áreas de Estudio** principales. Cada área cuenta con especialidades internas para una mejor organización administrativa.

### Áreas Disponibles:
- **Salud**: Medicina, Enfermería, Psicología, etc.
- **Veterinaria**: Animales menores, mayores, exóticos.
- **Ingeniería**: Civil, Sistemas, Industrial.
- **Ingeniería Ambiental** (Nueva): Gestión de residuos, EIA, Tratamiento de aguas, Monitoreo Ambiental y Biodiversidad.
- **Agronomía**: Agropecuaria, Zootecnia, Agroindustrial.
- **Gestión Pública y Empresarial**: Administración, Contabilidad, Derecho.

## 2. Sistema de Filtros (UI/UX)

Para mantener una interfaz limpia y profesional ("Menos es Más"), los filtros se han organizado de la siguiente manera:

### Filtros Principales
- **Búsqueda por Texto**: Permite buscar por título, subtítulo o descripción del curso.
- **Área de Estudio**: Filtro primario visible mediante un sistema de checkboxes para una selección rápida.

### Filtros Avanzados (Acordeón)
Para evitar la redundancia visual, los filtros secundarios se agrupan en un panel colapsable llamado **"Refinar Búsqueda"**:
- **Tipo de Programa**: Filtra por Curso Especializado, Diplomado o Especialización.
- **Modalidad**: Permite elegir entre cursos "En Vivo" o "Autoestudio" (Grabados).
- **Inversión (Precio)**: Filtros por rangos de precio predefinidos.

## 3. Lógica de Ordenamiento

El sistema de ordenamiento utiliza terminología premium para mejorar la percepción del usuario:
- **Novedades**: Ordena los cursos por fecha de creación descendente (lo más reciente primero).
- **Precio (Menor a Mayor)**.
- **Precio (Mayor a Menor)**.

## 4. Gestión Técnica

### Archivos Clave:
- `src/constants/categories.ts`: Define las categorías y especialidades globales del sistema.
- `src/pages/Catalogo.tsx`: Controla la interfaz de usuario, los estados de filtrado y la lógica de renderizado.
- `src/services/courseService.ts`: Gestor de peticiones a la base de datos (Supabase).

### Cómo añadir una nueva área:
1.  Agregar el ID y Label en `src/constants/categories.ts` (para el panel administrativo).
2.  Agregar el ID y Label en la constante `areas` dentro de `src/pages/Catalogo.tsx` (para el filtro público).

---
*Gerencia y Desarrollo Global - Documentación Interna v1.1*
