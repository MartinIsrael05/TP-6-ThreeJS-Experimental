# Pruebas en celulares reales

Guía para probar el sitio en teléfonos de verdad antes de la entrega. El emulador del navegador no alcanza: el rendimiento, el acelerómetro, la cámara y el micrófono solo se prueban en un equipo real.

## Cómo abrirlo en el celular

La cámara (mano y capa), el micrófono (pársel) y el acelerómetro (agitar la varita) **solo funcionan con HTTPS**. Hay dos caminos:

1. **Preview de Vercel (recomendado).** Al subir la rama a GitHub, Vercel arma un deploy de prueba con su propia URL `https://…vercel.app`. Se abre en el celular y anda todo.
2. **Red local.** Con la compu y el celular en el mismo Wi-Fi: `npm run dev -- -H 0.0.0.0` y en el celular `http://<IP de la compu>:3000`. Sirve para ver el diseño y el rendimiento, pero sin HTTPS no van a andar la cámara, el micrófono ni el acelerómetro. Next 16 también trae `npm run dev -- -H 0.0.0.0 --experimental-https`, con un certificado propio que el celular va a marcar como no confiable.

## Medir el rendimiento

Agregá `?fps` al final de cualquier URL (por ejemplo `/castillo/escaleras?fps`). Abajo a la izquierda aparece un medidor con:

- **FPS:** cuadros por segundo. Menos de 30 se nota trabado.
- **Calidad:** la que eligió la escena sola. Arranca en `alta`; si no llega a 40 FPS, baja a `media` (pixel ratio 1) y después a `baja` (sin postprocesado y paneles sin desenfoque).
- **DPR:** el pixel ratio de la pantalla.

Esperá unos 10 segundos en cada escena antes de anotar: la calidad se ajusta en los primeros segundos.

## Qué probar

| Lugar | Qué revisar |
| --- | --- |
| Prólogo | El scroll mueve el bote sin tirones; "Abrir el diario" o "Seguir en…" |
| Nota del diario | Se lee entera sin hacer zoom y el botón queda a mano |
| Mapa | Se ve completo, los lugares se pueden tocar, las huellas caminan |
| Gran Comedor | Tocar los pergaminos del Sombrero con el dedo |
| Ollivanders | Abrir cajas, **agitar el teléfono** (en iPhone tiene que pedir permiso de movimiento la primera vez), dibujar los tres hechizos con el dedo |
| Escaleras | Arrastrar y tocar los tramos; la segunda vuelta |
| Pasillo | Pasar la luz con el dedo por los dos mensajes |
| Quidditch | Atrapar la snitch dos veces; Accio con el dedo |
| Sala de trofeos | Botón "Mantené para cubrirte"; la cámara con las dos manos; encontrar el escudo |
| Cámara | Sisear al micrófono (pide permiso) y el botón "Mantené para sisear" |
| Final | Se ve el contador (tiempo, hechizos, páginas) |
| General | Girar el teléfono a horizontal; nada se corta ni aparece scroll de costado |

## Registro

Copiar la tabla por cada equipo probado.

| Equipo y navegador | Escena | FPS | Calidad | Problemas |
| --- | --- | --- | --- | --- |
| Ej.: Moto G54, Chrome | Gran Comedor | | | |
| | Ollivanders | | | |
| | Escaleras | | | |
| | Pasillo | | | |
| | Quidditch | | | |
| | Sala de trofeos | | | |
| | Cámara | | | |

Conviene probar por lo menos un Android de gama media y un iPhone (Safari), que es donde más cosas cambian.
