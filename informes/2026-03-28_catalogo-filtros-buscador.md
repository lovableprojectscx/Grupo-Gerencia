# Informe de Cambios — Catálogo: Filtros y Buscador
**Fecha:** 28 de marzo de 2026
**Archivo modificado:** `src/pages/Catalogo.tsx`

---

## Resumen

Se corrigieron tres problemas críticos en el área de Catálogos que impedían que los filtros y el buscador funcionaran correctamente.

---

## Cambio 1 — Filtros se desmontaban en cada clic (bug de React)

**Problema:**
El componente `FilterContent` estaba definido **dentro** del componente `Catalogo`. Cada vez que el usuario hacía clic en un checkbox, React creaba una nueva referencia de función, lo que provocaba que el panel de filtros se desmontara y remontara completamente. Esto hacía que el acordeón colapsara y los filtros parecieran no responder.

**Causa técnica:**
Definir un componente dentro de otro en React hace que React lo trate como un tipo de componente diferente en cada render, forzando un ciclo de unmount/mount.

**Solución:**
Se extrajo `FilterContent` fuera de `Catalogo` como componente de nivel superior con sus props bien tipadas (`FilterContentProps`). Ahora React mantiene la referencia estable entre renders.

**Líneas afectadas:**
- Se añadió la interfaz `FilterContentProps` (líneas 5–18)
- Se movió `FilterContent` antes de `const Catalogo = () => {` (líneas 53–219)
- Se reemplazó `<FilterContent />` por `<FilterContent {...filterProps} />` en los dos puntos de uso

**Corrección adicional:**
Se corrigió el hook `useLocation` que estaba importado pero nunca se guardaba en una variable. La línea usaba `window.location` global en lugar del location de React Router.

```ts
// Antes (incorrecto)
const params = new URLSearchParams(location.search); // window.location

// Después (correcto)
const location = useLocation();
const params = new URLSearchParams(location.search);
```

---

## Cambio 2 — El filtro por Área no clasificaba ningún curso

**Problema:**
Al seleccionar un área (ej. "Ingeniería Civil"), el filtro no mostraba ningún curso, independientemente de cuántos existieran en esa categoría.

**Causa técnica:**
El campo `category` de los cursos en la base de datos almacena el **UUID** del registro en la tabla `course_categories` (ej. `"a3f2c1b0-4e5d-..."`). Sin embargo, el array `areas` en `Catalogo.tsx` tenía IDs hardcodeados en inglés (`"health"`, `"veterinary"`, `"engineering"`, etc.) que **nunca coincidían** con los UUIDs reales.

```ts
// Array hardcodeado (INCORRECTO — nunca coincide con la DB)
const areas = [
  { id: "health", label: "Salud" },
  { id: "veterinary", label: "Veterinaria" },
  ...
];

// Filtro comparaba UUID contra "health" → siempre false
if (!selectedAreas.includes(course.category)) return false;
```

**Solución:**
- Se eliminó el array `areas` hardcodeado
- Se importó `useCategories` para obtener las categorías directamente de la base de datos
- Se pasa `categories` como prop `areas` al componente `FilterContent`
- El `useEffect` que lee el parámetro URL `?area=` ahora también resuelve por `slug` para mantener compatibilidad con enlaces antiguos

```ts
// Ahora (correcto)
const { categories } = useCategories();
// categories[i].id es el mismo UUID que course.category
```

**Archivos modificados:**
- `src/pages/Catalogo.tsx` — eliminación del array hardcodeado, import de `useCategories`, actualización de `filterProps` y badges activos

---

## Cambio 3 — El buscador no encontraba cursos por nombre de categoría

**Problema:**
Buscar "ingeniería civil" o "salud" no devolvía ningún resultado relacionado con esas categorías, aunque existieran cursos en ellas.

**Causa técnica:**
La búsqueda comparaba el texto escrito contra `course.category` y `course.specialty`, que son UUIDs. Buscar "ingeniería civil" contra un UUID nunca produce coincidencia.

Además, la búsqueda era de frase completa: si una sola palabra no se encontraba, se descartaba todo el curso.

**Solución — Motor de búsqueda reescrito:**

1. **Mapas de resolución UUID → label** (calculados una sola vez con `useMemo`):
   ```ts
   const categoryLabelMap = new Map(categories.map(c => [c.id, c.label]));
   const specialtyLabelMap = new Map(
     categories.flatMap(c => c.specialties.map(s => [s.id, s.label]))
   );
   ```

2. **Búsqueda por palabras** — la query se divide en palabras individuales (mínimo 2 caracteres). Todas las palabras deben aparecer en algún campo del curso. Ejemplo: "ingenieria civil" → busca "ingenieria" Y "civil" por separado.

3. **Normalización** — se eliminan tildes y acentos en query y en todos los campos, por lo que "ingenieria" encuentra "Ingeniería".

4. **Ranking por relevancia** — los resultados se ordenan según puntuación:
   | Campo | Puntos por palabra |
   |---|---|
   | Título | 10 |
   | Categoría (label real) | 6 |
   | Especialidad (label real) | 5 |
   | Subtítulo | 3 |
   | Descripción | 1 |

5. **Fallback de "cursos similares"** también usa los labels reales (ya no UUIDs).

**Líneas afectadas:**
- `useMemo` de `categoryLabelMap` y `specialtyLabelMap` (nuevos)
- `useMemo` de `filteredCourses` — reescrito completamente
- `useMemo` de `similarCourses` — actualizado para usar los mapas de labels

---

## Resumen de archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `src/pages/Catalogo.tsx` | Refactor + corrección de bugs (filtros y buscador) |

No se modificaron servicios, base de datos ni otros componentes.
