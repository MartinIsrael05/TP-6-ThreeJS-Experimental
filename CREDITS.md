# Créditos

Proyecto académico de Programación Multimedial III (UMAI), sin fines comerciales. Harry Potter y todos los nombres, personajes y elementos relacionados son propiedad de J. K. Rowling y Warner Bros. Entertainment.

Cada recurso que se suma al repo se anota acá en el mismo Pull Request.

## Modelos 3D y de aprendizaje automático

| Recurso | Autor | Fuente | Licencia | Uso en el sitio |
| --- | --- | --- | --- | --- |
| Hand Landmarker (float16, v1), `public/models/hand_landmarker.task` | Google | storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task | Apache 2.0 | Seguimiento de la mano con la cámara (opcional, corre en el navegador) |

## Texturas y HDRI

| Recurso | Autor | Fuente | Licencia | Uso en el sitio |
| --- | --- | --- | --- | --- |
| Medieval Blocks 03 | Rob Tuytel | polyhaven.com/a/medieval_blocks_03 | CC0 | Paredes, arcos y columnas del Gran Comedor |
| Floor Tiles 02 | Rob Tuytel | polyhaven.com/a/floor_tiles_02 | CC0 | Piso del Gran Comedor |
| Dark Wood | Dario Barresi, Dimitrios Savva, Rico Cilliers | polyhaven.com/a/dark_wood | CC0 | Mesas y bancos del Gran Comedor |

## Tipografías

| Recurso | Autor | Fuente | Licencia | Uso en el sitio |
| --- | --- | --- | --- | --- |
| Cinzel | Natanael Gama | fonts.google.com/specimen/Cinzel | SIL Open Font License 1.1 | Títulos, botones y marca, servida con next/font |
| EB Garamond | Georg Duffner y Octavio Pardo | fonts.google.com/specimen/EB+Garamond | SIL Open Font License 1.1 | Texto narrativo e interfaz, servida con next/font |

## Audio

No hay archivos de sonido: todo el audio se sintetiza en el navegador con Web Audio API, con código propio en `lib/audio/`.

| Recurso | Autor | Fuente | Licencia | Uso en el sitio |
| --- | --- | --- | --- | --- |
| Ambientes por lugar, efectos y fanfarrias de las casas | Equipo del TP | `lib/audio/ambiences.js`, `lib/audio/sfx.js` | Propio | Fondo de cada lugar y respuesta a las interacciones |
| Canción de cuna en Re menor (caja de música) | Equipo del TP | `lib/audio/ambiences.js` | Propio, melodía original | Prólogo y final |

## Código y herramientas

| Recurso | Autor | Fuente | Licencia |
| --- | --- | --- | --- |
| MediaPipe Tasks Vision 1.0.1 (`@mediapipe/tasks-vision`) | Google | github.com/google-ai-edge/mediapipe | Apache 2.0 |
| Algoritmo $1 Unistroke Recognizer (implementación propia en `lib/gestures/recognizer.js`) | Wobbrock, Wilson y Li (UIST 2007) | depts.washington.edu/acelab/proj/dollar | Algoritmo publicado; código propio |
| Boilerplate SEÑAL 88 | Cátedra Programación III, UMAI | github.com/lamaro/maimo-2026-nextjs-threejs-experimental | Uso académico |
| Skills de Three.js para agentes | CloudAI-X | github.com/CloudAI-X/threejs-skills | MIT |
| Skills `frontend-design` y `webapp-testing` | Anthropic | github.com/anthropics/skills | Apache 2.0 |
| Skill `vercel-react-best-practices` | Vercel | github.com/vercel-labs/agent-skills | MIT |
| Skills de reglas de Firestore | Google | github.com/firebase/agent-skills | Apache 2.0 |
