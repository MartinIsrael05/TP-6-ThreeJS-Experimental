# Propuesta: TP6 Hogwarts

Resumen del documento "Hogwarts: propuesta, ideas y plan de trabajo" (14/10/2026). Todo lo marcado como propuesta se puede cambiar; si cambia, se actualiza acá y en `AGENTS.md`.

## Premisa

> Recién llegado a Hogwarts, encontrás el diario de Tom Riddle y tenés que seguir sus páginas por el castillo para llegar a la Cámara de los Secretos antes de que vuelva a abrirse.

- **Coleccionables:** las páginas arrancadas del diario. Cada lugar del castillo esconde una.
- **Desbloqueo:** cada página revela el próximo lugar en el mapa. Con todas, se abre la Cámara.
- **Decisión persistida:** la casa que asigna el Sombrero cambia colores, textos y el final.
- **Mecánica unificada:** la varita es la herramienta de interacción en todo el sitio. Es el mouse, el dedo o la mano frente a la cámara (MediaPipe), y los hechizos se lanzan dibujando su forma en la escena: triángulo para Lumos, círculo para Alohomora, zeta para Accio.

## Recorrido

| Momento | Lugar | Interacción | Resultado |
| --- | --- | --- | --- |
| Inicio | Prólogo | Llegada en bote con scroll; carta de Hogwarts como login | Entrás al castillo |
| Decisión | Gran Comedor | Las respuestas del Sombrero flotan como pergaminos y se eligen señalándolas | Se guarda la casa |
| Herramienta | Ollivanders | Sacar cajas, agitar cada varita y ver cómo reacciona la tienda; aprendés las formas de los hechizos | Se guarda la varita |
| Página 1 | Escaleras giratorias | Dibujar Alohomora para soltarlas y arrastrar los tramos hasta alinear el camino | Página del diario |
| Página 2 | Pasillo del 2º piso | Dibujar Lumos y barrer la pared con la luz hasta leer el mensaje | Página del diario |
| Página 3 | Campo de Quidditch | Atrapar la snitch; Accio dibujado la acerca un momento | Página del diario |
| Sigilo | Sala de trofeos | Caminar mientras Filch está de espaldas y cubrirse con la capa cuando se da vuelta: las dos manos frente a la cara (cámara), o la barra espaciadora o un botón | Paso a escondidas |
| Cierre | Cámara de los Secretos | Repetir el patrón de la puerta siseando al micrófono (o con la barra espaciadora) | Final según la casa |

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

**Mapa del Merodeador (hecho):** pergamino con el castillo en tinta, el recorrido que el diario ya reveló, tus huellas y tu nombre donde estás, y Filch, Señora Norris, Peeves y Riddle moviéndose. Se abre desde la barra (o con la tecla M) después del juramento, y al pasar al siguiente lugar o al entrar desde el prólogo las huellas caminan hasta el destino. Textos y coordenadas en `data/map.js`.

Ideas sumadas: Mapa del Merodeador como navegación ("Juro solemnemente..." / "Travesura realizada"), el diario como segunda ruta dinámica (`/diario/[pagina]`), relojes de arena de puntos como progreso, persistencia dentro del mundo (Lechuza enviada / Pergamino local / Sin lechuzas), login como carta de Hogwarts, shader o partículas de hechizos como recurso propio.

## Look 3D

La sensación de película sale más de la atmósfera que del detalle de los modelos: texturas PBR reales (Poly Haven, ambientCG), luz cálida de velas, HDRI, niebla, polvo en el aire, postprocesado (bloom, viñeta, grano, corrección de color) y cámara sobre rieles que solo muestra lo que está construido, como un set de filmación. Las piezas protagonistas se modelan en Maya o Blender.

## Fases

1. **Base y narrativa:** textos, paleta y tipografía, `data/` con los lugares, ruta renombrada, `loading`/`error`/`not-found`.
2. **Estado y Firebase:** casa, varita, páginas, hechizos, lugar actual y final en Firestore; reglas; estado offline.
3. **Escenas 3D:** hook común de escena, un componente por lugar, modelos `.glb`, shader de hechizos, alternativas accesibles.
4. **Prólogo y pulido:** cámara por scroll, sonido, responsive.
5. **Entrega:** README completo, deploy en Vercel, ensayo de la demo.

## Modelo de datos

Implementado en la Fase 2 (`hooks/useProgress.js`) y validado en `firestore.rules`.

```js
// progress/{uid}
{
  userId: "uid-de-firebase-auth",
  authProvider: "google.com",
  house: "ravenclaw",
  wand: "nogal-fenix",
  spells: ["lumos", "alohomora", "accio"],
  items: ["sombrero", "varita", "pagina-1"],
  currentPlace: "pasillo",
  ending: null,
  updatedAt: serverTimestamp()
}
```

| Campo | Tipo | Valores válidos |
| --- | --- | --- |
| `userId` | string | El uid autenticado; también es el id del documento |
| `authProvider` | string | `anonymous`, `password` o `google.com` |
| `house` | string o null | `gryffindor`, `hufflepuff`, `ravenclaw`, `slytherin` (`data/houses.js`) |
| `wand` | string o null | `sauce-unicornio`, `cerezo-dragon`, `nogal-fenix`, `abedul-unicornio` (`data/wands.js`) |
| `spells` | lista | Hasta 3, sin repetir: `lumos`, `alohomora`, `accio` (`data/spells.js`) |
| `items` | lista | Hasta 7, sin repetir: `sombrero`, `varita`, `pagina-1`, `pagina-2`, `pagina-3`, `capa`, `camara-abierta` (`data/places.js`) |
| `currentPlace` | string o null | Uno de los 7 lugares de `data/places.js` |
| `ending` | string o null | Igual a `house`, y solo cuando `items` incluye `camara-abierta` |
| `updatedAt` | timestamp | Lo pone el servidor con `serverTimestamp()` |

- El cliente escribe el documento completo, sin `merge`, en Firestore y en `localStorage` (clave `tp6-hogwarts-progress`).
- `ending` no se elige: el hook lo deriva de la casa cuando se abre la Cámara.
- Migración de la Fase 1: un documento con `clues` se lee como `items` y la primera escritura lo reemplaza; un `localStorage` con un array suelto se convierte al objeto nuevo.
- Al iniciar sesión se une el progreso local con el remoto: `house`, `wand` y `currentPlace` priorizan lo remoto y las listas se suman.
- Las reglas repiten las listas de ids: si cambia un id en `data/`, hay que cambiarlo también en `firestore.rules`.
- `users/{uid}` no cambió en la Fase 2.

## Alcance

- **Mínimo:** prólogo simple, Sombrero, varita con dos hechizos, escaleras, pasillo y snitch con una página cada uno, Cámara como cierre, Mapa del Merodeador, Firebase completo, README y deploy.
- **Bonus:** llegada en bote elaborada, Patronus de partículas, ajedrez, cuarta página que cambia el final, audio espacial.

## Pendiente de definir

- Fecha de entrega.
- Nombre del proyecto.
- Quién es Persona A (Three.js) y quién Persona B (Next, Firebase y UI).
- Confirmar la premisa de la Cámara.
