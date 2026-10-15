# Plan de trabajo con IA: TP6 Hogwarts

Adaptación del "Plan de trabajo con IA" de Potrero UMAI (v1.0, 8/10/2026) a un TP de dos personas. Mantiene la misma idea: un único manual del proyecto (`AGENTS.md`) que leen todos los agentes, skills revisadas antes de entrar al repo y todo cambio por Pull Request.

## 1. Resumen

- **Qué:** experiencia web transmedia ambientada en Harry Potter con Next.js 16, Three.js 0.186 y Firebase. Consigna en `README.md`, propuesta en [propuesta.md](propuesta.md).
- **Cómo:** cada uno trabaja en VS Code con el agente que tenga disponible. Todos leen `AGENTS.md`, así que si un agente se traba o se queda sin cuota, la tarea sigue en otro sin perder contexto.
- **Costo:** puede ser $0. Quien paga Claude o ChatGPT usa su suscripción; GitHub Copilot es gratis con GitHub Education; opencode trae modelos gratis.
- **Dato sensible:** no hay datos de menores, pero sí credenciales de Firebase (`.env.local`) y una propiedad intelectual ajena (Harry Potter). Las reglas están en las secciones 7 y 8.

## 2. Roles

| Rol | Persona | Qué hace | Para qué usa IA |
| --- | --- | --- | --- |
| A · Three.js | a definir | Escenas 3D, hook común de escena, shader o partículas de hechizos, prólogo con scroll, carga de modelos | Escenas, shaders, optimización, depurar el render |
| B · Next, Firebase y UI | a definir | Rutas, `loading`/`error`/`not-found`, metadata, `useProgress`, Firestore y reglas, Mapa del Merodeador, carta de login, textos y estilos | Componentes, reglas, textos narrativos, accesibilidad |
| Ambos | | README, créditos, presentación | Documentación, casos de prueba, capturas |

Quien hace el setup inicial del repo cumple el rol de "Especialista IA" del plan original: mantiene `AGENTS.md`, revisa skills nuevas y ayuda al otro con las herramientas.

## 3. Herramientas

| Herramienta | Uso en el TP | Costo |
| --- | --- | --- |
| VS Code | Editor principal de los dos | Gratis |
| Claude Code (extensión de VS Code o terminal) | Agente principal para tareas difíciles | Incluido en Claude Pro/Max |
| Codex (extensión o CLI) | Alternativa con suscripción de ChatGPT | Incluido en ChatGPT Plus/Pro |
| GitHub Copilot | Autocompletado y chat para tareas mecánicas | Gratis con GitHub Education |
| opencode | Agente con modelos gratis, para tareas mecánicas | Gratis |
| herdr | Opcional: varios agentes en paralelo en una terminal | Gratis |

No hace falta instalar todo: alcanza con un agente que funcione y lea `AGENTS.md`. Las cuentas son personales, no se comparten logins.

## 4. Qué agente para qué tarea

| Tipo de tarea | Ejemplos en el TP | Agente sugerido |
| --- | --- | --- |
| Difícil o de criterio | Arquitectura de escenas, shaders, postprocesado, scroll con cámara, bugs de render, reglas de Firestore | Claude Code o Codex |
| Mecánica | `loading.js`/`error.js`, estilos, mover textos a `data/`, componentes simples, créditos | Copilot u opencode con modelo gratis |
| Volumen | Textos de las páginas del diario, variantes del final por casa, casos de prueba | Cualquiera; revisar el tono |
| Búsqueda de recursos | Modelos, texturas y sonidos con licencia válida | Claude con búsqueda web; verificar la licencia a mano |

## 5. El flujo

1. Abrir VS Code en la carpeta raíz del repo (no en una subcarpeta, si no el agente no encuentra `AGENTS.md` ni las skills).
2. Traer lo último de `main`: `git pull`.
3. Crear una rama por tarea: `git checkout -b feature/sombrero`.
4. Pedirle la tarea al agente con contexto concreto: qué archivo, qué resultado, cómo se prueba.
5. Leer cada comando que el agente quiera correr antes de aprobarlo. No usar modos que aprueban todo solos.
6. Probar en `npm run dev`, después `npm run lint` y `npm run build`.
7. Commit y push de la rama, abrir el Pull Request en GitHub y mergearlo a `main`.
8. Si la IA se equivoca dos veces en lo mismo, se agrega una regla a `AGENTS.md` (en su propio PR).

## 6. AGENTS.md: el manual del proyecto

`AGENTS.md` es lo primero que lee cualquier agente. `CLAUDE.md` contiene solo `@AGENTS.md` para que Claude Code lea lo mismo.

| Sección | Contenido | Quién la mantiene |
| --- | --- | --- |
| Bloque de Next.js | Aviso de que Next 16 cambió y dónde está la documentación local | Lo regenera `next dev`, no tocar |
| Proyecto | Premisa, recorrido, coleccionables | Los dos |
| Stack, comandos, estructura | Versiones, scripts, dónde vive cada cosa | Persona B |
| Reglas de código | Three.js, Server/Client Components, accesibilidad | Persona A (3D) y B (Next) |
| Assets y propiedad intelectual | Qué recursos se pueden usar y cómo se acreditan | Los dos |
| Firebase y secretos, Git | Reglas de seguridad y de trabajo | Los dos |
| Diseño | Paleta, tipografía, tono | Los dos, en la Fase 1 |

Reglas del archivo: menos de 200 líneas, lo extenso va en `docs/` con un link, y cualquier cambio entra por PR.

## 7. Seguridad

- `.env.local` nunca se sube (ya está en `.gitignore`), ni se pega en chats, issues o capturas. Las variables `NEXT_PUBLIC_` terminan en el navegador igual, pero la costumbre importa.
- Nunca usar una clave de cuenta de servicio de Firebase (`serviceAccount.json`) en este proyecto.
- Revisar cada comando que propone el agente. Nada de `rm -rf`, `git push --force` ni `firebase deploy` sin pedirlo explícitamente.
- Todo lo hecho por IA entra a `main` por Pull Request.
- Toda skill nueva se revisa como en la sección 10.
- Si una clave se filtra: avisar al otro, rotarla en la consola de Firebase y actualizar `.env.local` y Vercel.

## 8. Propiedad intelectual

- Uso académico, con créditos a J. K. Rowling y Warner Bros. en el README.
- Prohibido usar modelos, texturas, música o sonidos extraídos de las películas o de videojuegos.
- Solo recursos CC0, CC-BY, MIT o propios, cada uno anotado en `CREDITS.md` en el mismo PR que lo agrega.
- Las piezas protagonistas (sombrero, varita, tramo de escalera) conviene modelarlas nosotros en Maya o Blender: cuenta como recurso propio para la consigna.

## 9. Tareas

### Setup (semana 1)

- [x] Skills revisadas e instaladas en `.agents/skills/`.
- [ ] Copiar `.agents/skills` a `.claude/skills` para que Claude Code también las vea (una sola vez: `powershell -ExecutionPolicy Bypass -File scripts\setup-ia.ps1`, que también deja la plantilla de PR y las extensiones de VS Code).
- [x] `AGENTS.md`, `docs/plan-ia.md`, `docs/propuesta.md`, `CREDITS.md`, plantilla de PR y extensiones recomendadas de VS Code.
- [ ] Crear el repo propio en GitHub y subir el proyecto.
- [ ] Invitar al compañero como colaborador y proteger `main` (Settings → Branches: requerir PR antes de mergear).
- [ ] Cada uno: clonar, `npm install`, `npm run dev`, loguearse en su agente.
- [ ] Cada uno: probar que el agente lee el manual preguntándole "¿Qué reglas tenés para los assets?".
- [ ] Crear el proyecto de Firebase (Auth anónima, Google y email; Firestore) y compartir el `.env.local` por un canal privado, no por el repo.
- [ ] Definir quién es Persona A y quién Persona B.

### Persona A · Three.js

- [ ] Separar `ThreeArtifact` en un hook común de escena (setup, resize, limpieza) más un componente por escena.
- [ ] Prototipo del Gran Comedor para validar el look (texturas PBR, velas con bloom, niebla).
- [ ] Recurso propio: shader o partículas de los hechizos.
- [ ] Prólogo con cámara sobre una curva controlada por scroll.

### Persona B · Next, Firebase y UI

- [ ] Reemplazar `data/chapters.js` por los lugares del castillo y renombrar la ruta.
- [ ] `loading.js`, `error.js`, `not-found.js` y metadata por lugar.
- [ ] Extender `useProgress` y Firestore: casa, varita, páginas, hechizos, lugar actual, final.
- [ ] Actualizar `firestore.rules` y auditarlas con la skill.
- [ ] Estado offline en el indicador de persistencia.
- [ ] Mapa del Merodeador como navegación y carta de Hogwarts como login.

### Los dos

- [ ] README final, mapa de navegación, créditos, deploy en Vercel y ensayo de la demo.

## 10. Revisión de skills

Una skill son instrucciones que el agente sigue sin preguntar, por eso cada una se revisó antes de entrar al repo: se leyó el `SKILL.md` y sus scripts desde el repositorio oficial y se buscaron patrones de riesgo (curl, npx, instalaciones, `-y`, envío de datos o claves, sudo, `rm -rf`, contenido descargado en cada uso). Revisión del 14/10/2026.

### Aprobadas (en el repo)

| Skill | Origen y licencia | Qué hace el agente al cargarla | Veredicto |
| --- | --- | --- | --- |
| `threejs-*` (10 skills) | CloudAI-X/threejs-skills, MIT | Referencia de API con ejemplos: escena, geometría, materiales, luces, texturas, loaders, animación, interacción, postprocesado, shaders. No ejecuta comandos. | APROBADA. Condición: algunos ejemplos usan APIs que cambiaron (por ejemplo `RGBELoader`, que hoy convive con `HDRLoader`); regla en `AGENTS.md` para verificar contra `node_modules/three`. |
| `frontend-design` | anthropics/skills, Apache 2.0 | Arma una dirección visual (paleta, tipografía, layout) antes de programar. No ejecuta comandos. | APROBADA. |
| `vercel-react-best-practices` | vercel-labs/agent-skills, MIT | Reglas de rendimiento React/Next por prioridad. No ejecuta comandos. | APROBADA. |
| `firestore-rules-creation` | firebase/agent-skills, Apache 2.0 | Analiza el código y escribe `firestore.rules` con validaciones. Sugiere validar con `firebase deploy --dry-run`. | APROBADA. Condición: no correr comandos de Firebase CLI sin permiso (regla en `AGENTS.md`). |
| `firebase-security-rules-auditor` | firebase/agent-skills, Apache 2.0 | Audita las reglas como un pentester y devuelve un puntaje de 1 a 5 con hallazgos. No ejecuta comandos. | APROBADA. Usarla antes de cada PR que toque reglas. |
| `webapp-testing` | anthropics/skills, Apache 2.0 | Escribe y corre scripts de Playwright en Python. Su `with_server.py` levanta el servidor, espera el puerto en localhost y lo cierra al terminar; se revisó y no hace nada más. | APROBADA. Requiere Python y `pip install playwright` en la máquina de quien la use. |

### Rechazadas

| Skill | Motivo |
| --- | --- |
| `firebase-basics`, `firebase-auth-basics`, `firebase-firestore` | Proponen provisionar con `npx -y firebase-tools@latest` (descarga código nuevo en cada uso) y `firebase-firestore` crea por defecto una base Enterprise desde la CLI. El boilerplate ya tiene Auth y Firestore resueltos con el SDK web. |
| `web-design-guidelines` | Descarga sus instrucciones desde GitHub en cada uso: lo revisado hoy puede no ser lo que corra mañana. |
| `deploy-to-vercel` | Usa `curl` contra un endpoint de terceros y `rm -rf`. El deploy lo hacemos conectando el repo en Vercel. |
| `next-best-practices` | Ya no existe como skill: en Next 16 ese conocimiento viene en `node_modules/next/dist/docs/` y en el bloque que `next dev` escribe en `AGENTS.md`. |
| `find-skills` | Ofrece instalar con `-g -y` (global y sin confirmación). En un equipo de dos no hace falta. |

### Instalar, actualizar o sumar skills

Si después se actualizan las skills, para volver a dejar la copia de Claude Code igual a la de los demás agentes, desde la raíz del repo en PowerShell:

```powershell
Copy-Item -Recurse -Force .agents\skills .claude\
```

Las skills se instalaron como copias (`--copy`) porque en Windows los enlaces simbólicos dan problemas con git. Quedan iguales en `.claude/skills/` (Claude Code) y `.agents/skills/` (Codex, Copilot, Cursor, opencode). El archivo `skills-lock.json` registra origen y hash de cada una.

```bash
# Ver las instaladas
npx skills ls

# Sumar una skill nueva (solo después de revisarla y anotarla en la tabla de arriba)
npx skills add <owner/repo> --skill <nombre> -a claude-code -a codex -a opencode -a github-copilot -a cursor --copy

# Actualizar: después de actualizar, repetir la revisión y mirar el diff en el PR
npx skills update -p
```

## 11. Problemas frecuentes

| Problema | Solución |
| --- | --- |
| El agente no conoce el proyecto o no ve las skills | Abrir VS Code en la carpeta raíz del repo y reiniciar el agente. |
| `next dev` modifica `AGENTS.md` | Es el bloque de Next.js entre los comentarios `BEGIN/END`. Se puede commitear tal cual. |
| `npm ci` falla por el `package-lock.json` | Usar `npm install` y commitear el lock que genere, en un PR aparte. |
| Se acabó la cuota de Claude o ChatGPT | Seguir la tarea con otro agente: el contexto está en `AGENTS.md`. |
| Un modelo gratis de opencode da "Endpoint is unavailable" | Cambiar de modelo con `/models`. |
| El sitio anda lento en la notebook | Revisar pixel ratio, tamaño de texturas y cantidad de luces con sombra antes de culpar al modelo. |
