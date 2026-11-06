# TP6 — Experiencia web transmedia

> **Boilerplate:** SEÑAL 88
> Next.js + Three.js + Firebase · JavaScript · App Router

## Descripción

Desarrollar una experiencia web transmedia inmersiva inspirada en una película de culto, un videojuego, una obra audiovisual, una producción musical, una leyenda urbana o un universo narrativo original.

La experiencia debe proponer una navegación con hilo conductor. La persona usuaria deberá descubrir información, relacionar elementos o reconstruir una parte del relato mediante la exploración y la interacción.

El resultado no debe limitarse a una landing page temática. Tampoco se requiere desarrollar un videojuego. El objetivo es integrar narrativa, diseño de interacción, contenido multimedia, gráficos 3D y persistencia de datos en una aplicación web navegable.

Si se utiliza una propiedad intelectual existente, el proyecto tendrá finalidad académica y deberá incluir las referencias y los créditos correspondientes.

## Referencia del boilerplate

SEÑAL 88 presenta el archivo de una transmisión perdida. La experiencia está organizada en tres fragmentos. Cada fragmento contiene un artefacto 3D interactivo y una evidencia. La recuperación de las evidencias habilita la navegación y permite acceder al desenlace.

La propuesta narrativa y la identidad visual funcionan como demostración técnica. Deben ser reemplazadas o reformuladas para el proyecto entregado.

## Posibles enfoques

- Archivo de una transmisión interrumpida.
- Escritorio o sistema operativo de un personaje.
- Museo virtual cuyos objetos modifican el relato.
- Investigación compuesta por documentos, audios y escenas 3D.
- Enciclopedia de un mundo ficticio.
- Sitio institucional de una organización perteneciente al universo narrativo.
- Relato paralelo a una película o videojuego, situado antes, después o desde otro punto de vista.

## Referencias de narrativa web interactiva

Estas referencias permiten analizar proyectos en los que la interfaz, la navegación y las condiciones de acceso forman parte del relato.

### Requiem for a Dream — sitio web de la película (2000)

El sitio desarrollado por Hi-ReS! para la película de Darren Aronofsky fue concebido como una extensión narrativa que podía recorrerse antes, después o de manera independiente al film. La persona visitante ocupaba un lugar dentro del relato y atravesaba una estructura no lineal vinculada con sus personajes.

La interfaz se degradaba progresivamente durante la navegación: aparecían errores, pérdida de control, desorientación y rechazo del sistema. Esta transformación convertía al propio sitio en una metáfora de la adicción y el deterioro presentes en la película. Es una referencia relevante para estudiar cómo el comportamiento de una interfaz puede comunicar un tema y no limitarse a presentar información.

- [Registro en video del sitio](https://www.youtube.com/watch?v=SNuZjwX7Xxk&t=28s)
- [Caso de estudio de sus creadores](https://alexandrajugovic.com/requiem)

### A Journal of Insomnia (2013)

Documental interactivo producido por el National Film Board of Canada. El proyecto reunía testimonios, imágenes y videos enviados por personas con insomnio y organizaba la experiencia alrededor de cuatro protagonistas.

La disponibilidad del contenido dependía del horario: durante el día el sitio ofrecía funciones limitadas y, entre las 22:00 y las 03:00, habilitaba la experiencia completa. También solicitaba reservar una cita nocturna. De esta manera, el tiempo, la espera y el contexto real de acceso se incorporaban como recursos narrativos.

El proyecto funciona como referencia para estudiar narrativa documental, participación de usuarios, contenido colectivo y experiencias cuyo estado depende de condiciones externas.

- [Ficha y descripción en MIT Docubase](https://docubase.mit.edu/project/a-journal-of-insomnia/)
- [Registro de funcionamiento](https://www.youtube.com/watch?v=ihpJDpSVEtw)
- [Entrevista con sus realizadores](https://vimeo.com/57935529)

## Requisitos obligatorios

### Narrativa y experiencia

- Una premisa definida en una oración.
- Un recorrido compuesto por un mínimo de tres escenas, capítulos o estados.
- Un inicio, una progresión y un cierre identificables.
- Un mínimo de tres elementos coleccionables: pistas, fragmentos, objetos, testimonios o símbolos.
- Desbloqueo de contenido o modificación del estado a partir de acciones de la persona usuaria.
- Feedback visual o sonoro para las interacciones principales.
- Una interfaz coherente con el universo narrativo seleccionado.
- Diseño responsive.
- Alternativas accesibles para las interacciones 3D necesarias para avanzar.

### Next.js

- Uso de App Router.
- Organización de la interfaz mediante componentes.
- Uso de rutas para representar escenas, capítulos o documentos.
- Una ruta dinámica como mínimo.
- Uso justificado de Server Components y Client Components.
- Metadata específica del proyecto.
- Estados de carga y de error donde corresponda.

### Three.js

- Una escena 3D integrada a la narrativa y a la interacción.
- Configuración de escena, cámara y renderer.
- Uso de geometrías, materiales e iluminación.
- Animación mediante `requestAnimationFrame`.
- Interacción mediante raycasting, puntero o scroll.
- Adaptación del canvas al tamaño disponible.
- Límite de pixel ratio para controlar el costo de renderizado.
- Liberación de recursos al desmontar el componente.
- Incorporación de un recurso desarrollado o adaptado para el proyecto: modelo, textura, geometría procedural, sistema de partículas o shader.

El uso de React Three Fiber es opcional. La implementación inicial se realizará con Three.js directo para identificar los elementos fundamentales de una escena 3D.

### Firebase

- Firebase Authentication anónima, con Google y con email/contraseña.
- Cloud Firestore para persistir progreso, decisiones o contenido.
- Asociación de los datos con el usuario autenticado.
- Reglas de seguridad que impidan el acceso a información de otros usuarios.
- Indicación del estado de persistencia: remoto, local u offline.

### Documentación

- Concepto y sinopsis.
- Referencias visuales y narrativas.
- Mapa del recorrido o diagrama de navegación.
- Decisiones técnicas principales.
- Créditos de imágenes, modelos, tipografías, audio y otros recursos.
- Instrucciones de instalación y configuración.
- Variables de entorno requeridas.
- Enlace al deploy público.

## Entregables

1. Repositorio con historial de desarrollo.
2. Deploy público funcional.
3. README con la documentación del proyecto.
4. Mapa de navegación.
5. Presentación y demostración navegada.
6. Explicación técnica del código implementado.

## Arquitectura del boilerplate

```text
app/
  archivo/[chapter]/
    page.js             # ruta dinámica de cada capítulo
  globals.css           # sistema visual y responsive
  layout.js             # layout y metadata general
  page.js               # portada
components/
  Experience.js         # navegación, estado narrativo e interfaz
  ThreeArtifact.js      # escena Three.js
data/
  chapters.js           # contenido y configuración de capítulos
hooks/
  useProgress.js        # persistencia local y remota
lib/
  firebase.js           # inicialización de Firebase
firestore.rules         # reglas de acceso por usuario
```

Las responsabilidades se distribuyen de la siguiente manera:

- Next.js representa la estructura navegable y las rutas de la aplicación.
- React administra la interfaz y el significado de las interacciones.
- Three.js representa y anima el contenido tridimensional.
- Firebase autentica al usuario y conserva el progreso.

La explicación detallada de la escena se encuentra en [GUIA-THREEJS.md](./GUIA-THREEJS.md).

## Rutas incluidas

| Ruta | Contenido |
| --- | --- |
| `/` | Presentación e ingreso a la experiencia |
| `/archivo/carrier` | Fragmento 01: La portadora |
| `/archivo/witness` | Fragmento 02: El testigo |
| `/archivo/echo` | Fragmento 03: El eco |

La ruta dinámica se implementa en `app/archivo/[chapter]/page.js`. El parámetro `chapter` se utiliza para seleccionar el contenido y generar metadata específica.

## Puesta en marcha

Requiere Node.js 20 o una versión posterior compatible con Next.js 16.

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Sin variables de entorno, la experiencia utiliza `localStorage` y muestra el estado `LOCAL`.

## Configuración de Firebase

1. Crear un proyecto y una Web App en Firebase Console.
2. Habilitar en Authentication los proveedores **Anonymous**, **Google** y **Email/Password**.
3. Crear una base **Cloud Firestore**.
4. Copiar `.env.example` como `.env.local`.
5. Completar las variables de entorno.
6. Publicar las reglas incluidas en `firestore.rules`.
7. Reiniciar el servidor de desarrollo.

El indicador superior cambia de `LOCAL` a `NUBE` cuando la autenticación y la conexión se realizan correctamente.

Las variables con prefijo `NEXT_PUBLIC_` forman parte del bundle del cliente. La seguridad del acceso a los datos depende de Firebase Authentication y de las reglas de Firestore.

## Colección de usuarios

El boilerplate reutiliza la colección `users`. Cada documento utiliza el UID de Firebase Authentication como identificador:

```js
// users/{uid}
{
  userId: "uid-de-firebase-auth",
  email: "persona@example.com",
  displayName: "Nombre visible",
  photoURL: null,
  isAnonymous: false,
  authProvider: "google.com",
  createdAt: serverTimestamp(),
  lastLoginAt: serverTimestamp()
}
```

La escritura utiliza `{ merge: true }`, por lo que conserva los campos que ya existan en el documento. Para reutilizar perfiles anteriores, sus documentos deben estar identificados con el mismo UID utilizado por Firebase Authentication. Una colección `users` no crea credenciales: las cuentas también deben existir en Authentication.

Si el proyecto ya posee reglas de Firestore, los bloques de `firestore.rules` deben integrarse con las reglas existentes. Publicar el archivo completo sin revisar podría reemplazar otras reglas del proyecto.

## Modelo de datos inicial

```js
// progress/{uid}
{
  userId: "uid-del-usuario-anonimo",
  authProvider: "anonymous",
  clues: ["tone", "coordinate", "message"],
  updatedAt: serverTimestamp()
}
```

El UID se utiliza dos veces de manera intencional:

- como identificador del documento `progress/{uid}`;
- como valor del campo `userId` para hacer visible la relación en Firestore.

Las reglas verifican que ambos valores coincidan con `request.auth.uid`. El usuario anónimo correspondiente puede consultarse en Firebase Authentication.

Una experiencia ramificada puede extender el documento:

```js
{
  clues: [],
  currentChapter: "carrier",
  decisions: { answeredCall: true },
  ending: null
}
```

## Posibles extensiones

- Carga de modelos `.glb` con `GLTFLoader`.
- Audio espacial mediante Web Audio API.
- Materiales personalizados mediante shaders GLSL.
- Animaciones vinculadas al scroll.
- Documentos narrativos mediante rutas dinámicas adicionales.
- Finales alternativos basados en decisiones persistidas.
- Contenido administrable desde Firestore.

## Declaración de uso de IA

Usamos la inteligencia artificial como una herramienta de conocimiento y como un tercer integrante del equipo. Le contábamos nuestras ideas y ella nos ayudaba a llevarlas a cabo.

Algunas veces le pedíamos consejo sobre cómo podía resolverse un nivel o una mecánica. Entonces teníamos idas y vueltas: proponíamos, discutíamos las alternativas y ajustábamos hasta llegar a la mejor opción posible. La IA no reemplazó a un profesor ni a una guía: aportó ideas, conocimientos técnicos y código, y las decisiones de diseño y de dirección del proyecto las tomamos nosotros.

Las reglas con las que trabajamos con los agentes están en [AGENTS.md](AGENTS.md), y el plan de trabajo con IA y la revisión de las skills usadas están en [docs/plan-ia.md](docs/plan-ia.md).

## Scripts

```bash
npm run dev      # servidor de desarrollo
npm run lint     # análisis estático
npm run build    # build de producción
npm run start    # ejecución del build
```

---

**Cátedra Programación III — UMAI**
