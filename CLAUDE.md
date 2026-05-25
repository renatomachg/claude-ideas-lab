# Claude Ideas Lab — Instrucciones para Claude

## Stack
- React 18 + Vite
- Supabase (auth + DB) vía fetch directo, sin SDK
- Deploy en Vercel

## Reglas de workflow

**NUNCA hacer commit/push sin aprobación explícita del usuario.**
1. Hacer los cambios en el archivo
2. Mostrar el diff o resumir qué cambió
3. Esperar que el usuario apruebe ("listo", "manda", "dale", etc.)
4. Solo entonces ejecutar `git add` + `git commit` + `git push`

El usuario puede acumular varios cambios y mandarlos todos en un solo commit.

## Estilo de código
- Sin comentarios salvo que el WHY sea no obvio
- Sin abstracciones prematuras — tres líneas similares están bien
- Design system definido en el objeto `C` (colores) y `VM`/`SM` (venture/status maps)

## Dev server
Node está instalado vía nvm. Siempre cargar nvm antes de correr npm:
```bash
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh"
cd ~/Desktop/Proyectos/Brainlab/claude-ideas-lab
npm run dev   # http://localhost:5173
```
