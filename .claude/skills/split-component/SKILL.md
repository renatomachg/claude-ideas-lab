---
name: split-component
description: Extrae un componente de src/App.jsx a su propio archivo en src/components/, respetando el design system del proyecto.
---

El usuario quiere extraer el componente llamado **{{component_name}}** de `src/App.jsx` a `src/components/{{component_name}}.jsx`.

## Pasos a seguir

1. **Localizar el componente** en `src/App.jsx`. Busca la declaración `const {{component_name}} = ` o `function {{component_name}}`.

2. **Identificar dependencias** que usa el componente:
   - Del design system: `C`, `VM`, `SM`, `VENTURES`, `DEFAULT_VENTURES`, `getVM`
   - Helpers de Supabase: `sb`, `SB_URL`, `SB_KEY`, `getToken`
   - Otros componentes definidos en App.jsx que también haya que mover o importar

3. **Decidir dónde viven las constantes compartidas**:
   - Si `src/constants.js` no existe y el componente necesita `C`/`VM`/`SM`/`VENTURES`, crea ese archivo moviendo solo las constantes necesarias e importa desde ahí en ambos archivos.
   - Si `src/constants.js` ya existe, agrégalas ahí.
   - Si las constantes solo las usa este componente (no quedan referencias en App.jsx), muévelas directamente al archivo nuevo sin crear constants.js.

4. **Crear `src/components/{{component_name}}.jsx`** con:
   - Los imports necesarios en la cabecera (React hooks, constantes)
   - El componente extraído tal cual, sin cambios de lógica ni de estilo
   - Un `export default {{component_name}}` al final

5. **Actualizar `src/App.jsx`**:
   - Agregar `import {{component_name}} from "./components/{{component_name}}";`
   - Eliminar la definición del componente del archivo original
   - Si se creó `src/constants.js`, actualizar los imports de las constantes movidas

6. **Verificar** que `src/App.jsx` compile sin errores (todas las referencias al componente siguen funcionando).

7. **Reportar** cuántas líneas quedaron en `src/App.jsx` después de la extracción.

## Convenciones del proyecto a respetar
- Estilos inline con el objeto `C` — sin CSS externo ni clases de Tailwind
- Sin PropTypes, sin TypeScript
- Sin comentarios descriptivos (solo si el WHY no es obvio)
- Sin abstracciones nuevas — el componente debe quedar idéntico en lógica y presentación
