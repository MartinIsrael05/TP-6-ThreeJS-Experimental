<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TP6 Hogwarts: manual del proyecto para agentes de IA

Este archivo lo leen todos los agentes (Claude Code, Codex, Copilot, Cursor, opencode). `CLAUDE.md` solo contiene `@AGENTS.md`. Máximo 200 líneas: lo extenso va en `docs/` con un link. Cualquier cambio a este archivo lo revisan las dos personas del equipo.

## Proyecto

TP6 de Programación Multimedial III (UMAI): experiencia web transmedia con Next.js, Three.js y Firebase ambientada en el mundo de Harry Potter. Trabajo en dupla. La consigna completa está en `README.md` (sección "Requisitos obligatorios"); revisala antes de proponer cambios grandes.

- **Premisa (propuesta, a confirmar):** Recién llegado a Hogwarts, encontrás el diario de Tom Riddle y tenés que seguir sus páginas por el castillo para llegar a la Cámara de los Secretos antes de que vuelva a abrirse.
- **Recorrido:** Prólogo (llegada con scroll + carta como login) → Gran Comedor (Sombrero seleccionador, se guarda la casa) → Ollivanders (varita y hechizos) → Escaleras giratorias (página 1) → Pasillo del 2º piso (página 2, Lumos) → Campo de Quidditch (página 3, atrapar la snitch) → Cámara de los Secretos (cierre según la casa).
- **Coleccionables:** páginas del diario. **Decisión persistida:** casa y varita.
- Detalle completo en [docs/propuesta.md](docs/propuesta.md). Forma de trabajo con IA en [docs/plan-ia.md](docs/plan-ia.md).

## Stack

- Next.js 16 con App Router, **JavaScript** (no TypeScript), React 19.
- Three.js 0.186 **directo** (sin React Three Fiber, lo pide la cátedra).
- Firebase 12: Auth (anónima, Google, email/contraseña) y Cloud Firestore.
- CSS propio en `app/globals.css`. Deploy en Vercel.

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # servidor local en http://localhost:3000
npm run lint       # ESLint, tiene que pasar antes de cada PR
npm run build      # build de producción, tiene que pasar antes de cada PR
```

Sin `.env.local` el sitio funciona en modo LOCAL con localStorage.

## Estructura

```text
app/                      rutas (App Router), layout, estilos globales
  archivo/[chapter]/      ruta dinámica actual (se va a renombrar a castillo/[lugar])
components/               Experience (estado narrativo), ThreeArtifact (escena), AuthPanel
data/chapters.js          contenido de cada capítulo: textos, colores, pistas
hooks/useProgress.js      progreso local + Firebase (auth y Firestore)
lib/firebase.js           inicialización de Firebase
firestore.rules           reglas de acceso por usuario
public/                   modelos .glb, texturas, audio (crear subcarpetas)
docs/                     propuesta, plan de IA y documentación del TP
.claude/skills/ y .agents/skills/   skills aprobadas (mismo contenido, una copia por agente)
```

## Reglas de código

- Las páginas son Server Components por defecto. `"use client"` solo donde hay estado, efectos, eventos o Three.js, y con un comentario de una línea que justifique por qué (la cátedra evalúa ese criterio).
- Toda escena Three.js vive en un Client Component dentro de `useEffect` y en el cleanup libera geometrías, materiales, texturas, render targets, listeners y el renderer.
- `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` siempre. El canvas se adapta con `ResizeObserver`.
- Toda interacción 3D necesaria para avanzar tiene una alternativa accesible con un botón HTML. Respetar `prefers-reduced-motion`.
- El contenido narrativo vive en `data/`, no hardcodeado en componentes.
- Los textos visibles van en español rioplatense (vos, tenés). Nada de guiones largos en los textos.
- Las skills de Three.js pueden mostrar APIs viejas: antes de importar algo de `three/addons/...`, verificá que exista en `node_modules/three/examples/jsm/` y que no esté marcado como deprecado.
- Antes de tocar rutas, metadata, `loading.js` o `error.js`, leé la guía correspondiente en `node_modules/next/dist/docs/` (Next 16 cambió cosas).
- Cambios chicos y enfocados. No reformatear archivos que no son parte de la tarea.

## Assets y propiedad intelectual

- **Prohibido** descargar o copiar modelos, texturas, música o sonidos extraídos de las películas o de videojuegos (Hogwarts Legacy, LEGO, etc.). El deploy es público.
- Solo recursos con licencia que permita el uso (CC0, CC-BY, MIT) o hechos por nosotros. Cada recurso nuevo se anota en [CREDITS.md](CREDITS.md) en el mismo PR (nombre, autor, link, licencia).
- Fuentes recomendadas: Poly Haven y ambientCG (texturas y HDRI CC0), Sketchfab filtrando por licencia descargable, Poly Pizza, Freesound.
- Modelos en `public/models/` como `.glb`, comprimidos (Draco o meshopt) y con texturas de 2K como máximo. Avisar si un archivo supera los 10 MB.

## Firebase y secretos

- `.env.local` nunca se sube ni se pega en chats, issues o capturas. En el repo solo va `.env.example` sin valores.
- Todo documento de usuario usa el UID como id y tiene `userId == request.auth.uid`, como en `progress/{uid}`.
- Cualquier cambio a `firestore.rules` se revisa con la skill `firebase-security-rules-auditor` antes del PR, y se publica en la consola de Firebase recién cuando el PR está aprobado.
- No correr `firebase deploy`, `firebase-tools` ni ningún comando que cree o modifique recursos en la nube sin pedir permiso explícito.

## Git y revisión

- `main` siempre funciona. Cada tarea va en una rama `feature/<nombre-corto>` y entra por Pull Request.
- La otra persona del equipo revisa y aprueba cada PR, incluido el código escrito por IA.
- Antes de abrir un PR: `npm run lint` y `npm run build` sin errores, y probar el flujo en el navegador.
- Mensajes de commit en español, en imperativo: "Agrega escena del Gran Comedor".
- El historial de commits es un entregable: commits frecuentes y descriptivos.

## Reglas para los agentes

- Explicá qué vas a cambiar antes de editar varios archivos y esperá confirmación en cambios grandes.
- No instales paquetes npm ni skills sin aprobación de las dos personas. Si hace falta uno, proponelo y explicá por qué.
- No apruebes ni corras comandos destructivos (`rm -rf`, `git push --force`, `git reset --hard`) sin pedirlo.
- Si no sabés algo de la consigna o del diseño, preguntá en lugar de inventar.
- Si la IA se equivoca dos veces en lo mismo, se agrega una regla acá.

## Skills aprobadas

| Skill | Para qué |
| --- | --- |
| `threejs-*` (10) | Escena, geometría, materiales, luces, texturas, loaders, animación, interacción, postprocesado, shaders |
| `frontend-design` | Dirección visual antes de programar UI |
| `vercel-react-best-practices` | Rendimiento y patrones de React/Next |
| `firestore-rules-creation` | Escribir `firestore.rules` |
| `firebase-security-rules-auditor` | Auditar las reglas antes de cada PR que las toque |
| `webapp-testing` | Probar el sitio con Playwright y sacar capturas (requiere Python) |

La revisión de cada skill y las rechazadas están en [docs/plan-ia.md](docs/plan-ia.md#revisión-de-skills).

## Diseño (provisorio)

Pergamino, tinta, vino y dorado. Tipografía serif para títulos y textos narrativos. Escenas oscuras con luz cálida de velas, niebla y partículas. A definir en la Fase 1.
