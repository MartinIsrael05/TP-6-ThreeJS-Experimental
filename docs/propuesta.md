# Propuesta: TP6 Hogwarts

Resumen del documento "Hogwarts: propuesta, ideas y plan de trabajo" (14/10/2026). Todo lo marcado como propuesta se puede cambiar; si cambia, se actualiza acá y en `AGENTS.md`.

## Premisa

> Recién llegado a Hogwarts, encontrás el diario de Tom Riddle y tenés que seguir sus páginas por el castillo para llegar a la Cámara de los Secretos antes de que vuelva a abrirse.

- **Coleccionables:** las páginas arrancadas del diario. Cada lugar del castillo esconde una.
- **Desbloqueo:** cada página revela el próximo lugar en el mapa. Con todas, se abre la Cámara.
- **Decisión persistida:** la casa que asigna el Sombrero cambia colores, textos y el final.
- **Mecánica unificada:** la varita es la herramienta de interacción en todo el sitio (Lumos, Alohomora, Revelio).

## Recorrido

| Momento | Lugar | Interacción | Resultado |
| --- | --- | --- | --- |
| Inicio | Prólogo | Llegada en bote con scroll; carta de Hogwarts como login | Entrás al castillo |
| Decisión | Gran Comedor | Sombrero seleccionador | Se guarda la casa |
| Herramienta | Ollivanders o aula | La varita te elige; aprendés los hechizos | Se guarda la varita |
| Página 1 | Escaleras giratorias | Rotar tramos hasta alinear el camino | Página del diario |
| Página 2 | Pasillo del 2º piso | Lumos revela el mensaje escrito en la pared | Página del diario |
| Página 3 | Campo de Quidditch | Atrapar la snitch | Página del diario |
| Cierre | Cámara de los Secretos | Hablar pársel para entrar | Final según la casa |

## Ideas, ordenadas

| Idea | Veredicto |
| --- | --- |
| Sombrero seleccionador | Imprescindible: inicio y decisión persistida |
| Varita y hechizos | Imprescindible: mecánica de todo el sitio |
| Cámara de los Secretos | Imprescindible, como cierre |
| Escaleras giratorias | Muy buena: puzzle simple y vistoso |
| Landing con scroll hasta Hogwarts | Sí, achicada: llegada en bote con siluetas, niebla y luces |
| Quidditch | Reducido a atrapar la snitch |
| Ajedrez gigante | Bonus como mucho (mate en una jugada) |

Ideas sumadas: Mapa del Merodeador como navegación ("Juro solemnemente..." / "Travesura realizada"), el diario como segunda ruta dinámica (`/diario/[pagina]`), relojes de arena de puntos como progreso, persistencia dentro del mundo (Lechuza enviada / Pergamino local / Sin lechuzas), login como carta de Hogwarts, shader o partículas de hechizos como recurso propio.

## Look 3D

La sensación de película sale más de la atmósfera que del detalle de los modelos: texturas PBR reales (Poly Haven, ambientCG), luz cálida de velas, HDRI, niebla, polvo en el aire, postprocesado (bloom, viñeta, grano, corrección de color) y cámara sobre rieles que solo muestra lo que está construido, como un set de filmación. Las piezas protagonistas se modelan en Maya o Blender.

## Fases

1. **Base y narrativa:** textos, paleta y tipografía, `data/` con los lugares, ruta renombrada, `loading`/`error`/`not-found`.
2. **Estado y Firebase:** casa, varita, páginas, hechizos, lugar actual y final en Firestore; reglas; estado offline.
3. **Escenas 3D:** hook común de escena, un componente por lugar, modelos `.glb`, shader de hechizos, alternativas accesibles.
4. **Prólogo y pulido:** cámara por scroll, sonido, responsive.
5. **Entrega:** README completo, deploy en Vercel, ensayo de la demo.

## Modelo de datos propuesto

```js
// progress/{uid}
{
  userId: "uid-de-firebase-auth",
  authProvider: "google.com",
  house: "ravenclaw",
  wand: "sauco-pluma-fenix",
  spells: ["lumos", "alohomora"],
  pages: ["escaleras", "pasillo"],
  currentPlace: "quidditch",
  ending: null,
  updatedAt: serverTimestamp()
}
```

## Alcance

- **Mínimo:** prólogo simple, Sombrero, varita con dos hechizos, escaleras, pasillo y snitch con una página cada uno, Cámara como cierre, Mapa del Merodeador, Firebase completo, README y deploy.
- **Bonus:** llegada en bote elaborada, Patronus de partículas, ajedrez, cuarta página que cambia el final, audio espacial.

## Pendiente de definir

- Fecha de entrega.
- Nombre del proyecto.
- Quién es Persona A (Three.js) y quién Persona B (Next, Firebase y UI).
- Confirmar la premisa de la Cámara.
