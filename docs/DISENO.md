# NexFluidUI · NexFluid Native — Living Editorial Interfaces

Documento de diseño público: la gramática visual, las decisiones y sus límites. La demostración viva está en NexDocs (`npm run dev`).

## 1. Principio

NexFluidUI no es un estilo extraído de una aplicación: es un lenguaje propio que las aplicaciones del ecosistema Nex adoptan. Su inspiración es la física de las lámparas de lava aplicada al **comportamiento** de la interfaz:

* los elementos no aparecen: **emergen** desde lo que los pidió;
* no se desplazan: **fluyen** (un borde tira, el otro sigue con viscosidad);
* no cambian de tamaño: **se transforman** (una tarjeta es la misma membrana que el panel que abre);
* no sólo reaccionan: responden con **tensión, inercia y recuperación**.

Con el movimiento apagado, la identidad se mantiene: la tipografía, las membranas y la composición son reconocibles inmóviles.

## 2. Tres direcciones y la síntesis

| Dirección | Idea | Se queda | Se descarta |
|---|---|---|---|
| A · Fluid Editorial | La tipografía manda; superficies estructurales; hilo líquido | Titulares pesados y condensados, cursivas serif, jerarquía editorial | Superficies rectas como norma; un hilo como único indicador |
| B · Living Matter | Materia expresiva: menisco, profundidad teñida, zonas cromáticas, gotas con cuello | Membranas superelípticas, menisco y profundidad (al 45 %), gota rellena | Intensidad diaria (fatiga), coste de pintura |
| C · Kinetic Minimalism | La identidad es la transformación | Color y movimiento sólo con propósito | Ausencia de bordes; inmóvil se vuelve genérica |
| **NexFluid Native** | Síntesis | — | — |

Las cuatro son conjuntos de tokens reales (`data-nx-direction`) aplicados a los mismos componentes: NexDocs las compara en «Identidad → Tres direcciones».

## 3. Gramática

### Membrana (la única primitiva de superficie)

`NexSurface`: contorno de esquinas **superelípticas** (curvatura continua) dibujado por el motor. Modo estático en CSS (`corner-shape`, con `border-radius` de respaldo) y modo vivo en SVG que se deforma. Toda tarjeta, panel, botón, región del marco, bloque de código y aviso es una membrana.

* **Papel** (`kind`): `surface` · `control` · `content`. La dirección asigna una familia a cada papel.
* **Familias geométricas** (`shape`): `fluid` (orgánica, 28 px), `membrane` (tensión controlada, 20 px), `capsule` (cápsula deformable), `morph` (preparada para transformarse), `editorial` (casi recta, sin deformación).
* **Materiales** (`material`): `base`, `raised`, `sunken`, `clear`, `accent`, `solid`, `ink`, `fluid`.

### Estados

`rest → attract → deform → activate → morph → settle`

* **attract**: el borde más cercano al puntero se abomba (campo de influencia gaussiano, normal hacia fuera); el borde gana tensión; aparece la zona cromática bajo el puntero.
* **deform**: la presión aplasta conservando el área.
* **activate**: la zona cromática inunda la membrana.
* **morph**: la membrana cambia de forma (tarjeta → panel) con el mismo número de puntos; ver NexMorph (§ 6).
* **settle**: recuperación con la física de su familia.

Teclado equivalente: foco visible = attract; Intro/Espacio = activate. Movimiento reducido: los estados cambian de color, no de forma.

### Gota líquida

Indicador compartido por `NexTabs`, `NexNav` y `NexSegmented`: dos bordes con física distinta y un cuello tipo metaball mientras se estira (`liquidCapsule`). Se inclina hacia la opción bajo el puntero. Formas: `liquid` (rellena), `thread` (hilo), `editorial` (tinta) y `compact`.

### Espacio

`NexFrame`: un campo con zonas cromáticas sobre el que flotan membranas separadas por costuras (`--nx-gap`). Las regiones vacías no ocupan columna; las cerradas se retraen a un riel; `layout="focus"` retrae explorador e inspector y el lienzo crece; bajo 1080 px la navegación es un cajón y bajo 760 px el inspector es una hoja inferior (container queries: responde a su propio ancho). Variantes `floating`, `joined` y `flush`.

### Tipografía

Bricolage Grotesque (titulares: peso alto, tracking cerrado, tamaño óptico), Geist (interfaz y lectura), Geist Mono (código e índices), Instrument Serif (cursivas editoriales). Escala con póster y cita; el **índice editorial** (gota de materia + mono) marca secciones.

### Color

Se conserva la paleta vigente (seis temas). Lo nuevo es su papel: el acento marca interacción y estado; la **materia** (`--nx-fluid`) aparece en gotas, zonas y activaciones; la profundidad se tiñe (`--nx-depth`). Contraste WCAG verificado por prueba (23 pares por tema).

### Física por familia

| Familia | Preset | Componentes |
|---|---|---|
| surface | viscous | NexCard, NexPanel, NexFrame |
| control | elastic | NexButton, NexSegmented |
| indicator | magnetic + viscous | NexTabs, NexNav, NexSegmented |
| content | calm (emerge una vez) | paneles de pestaña, expansión |

## 4. Separación entre identidad y compatibilidad

* **NexFluid Native** (`tokens.css`): identidad principal.
* **Nextudio Compatibility** (`compat/nextudio.css`, opcional): reproduce la apariencia actual de Nextudio con los mismos componentes, para adopción gradual. Nunca define reglas fundacionales.

## 5. Decisiones

1. **Membrana como única primitiva**: evita duplicar CSS entre tarjetas, pestañas y widgets; la geometría es del motor, no de cada componente.
2. **Superelipse + SVG vivo sólo cuando hay interacción**: regiones grandes, código y tablas son estáticos (CSS), el coste se concentra donde aporta.
3. **El relleno CSS permanece bajo el SVG**: el texto siempre tiene un fondo real (herramientas de contraste, impresión).
4. **Gota compartida**: un único hook (`useLiquid`) para pestañas, navegación y selectores.
5. **Direcciones como tokens**: explorar A/B/C no requiere componentes distintos.
6. **Paleta conservada**: decisión de producto; la reinvención está en forma, materia, tipografía, composición y física.

## 6. NexMorph — transformación continua de materia

Una superficie se convierte en otra cambiando posición, tamaño, contorno y función; el contenido se coreografía aparte. Demostración y parámetros en NexDocs → Movimiento → **NexMorph Studio**.

### Arquitectura

* **Núcleo (`@eclipsis/core`, sin DOM ni React):** `MorphTransition` (controlador interrumpible: `open`, `close`, `pause`, `seek`, `resume`), familias de física `MORPH_PHYSICS`, `morphTimeline`/`morphTiming` (simulación exacta), `morphRect`, `morphPath`, `deformContour` (estiramiento por velocidad con área constante), `resampleContour` y `alignContours` (correspondencia de puntos), `metaballPath`.
* **React (`@eclipsis/react`):** `NexMorph` (`.Source`, `.Target`, `.Trigger`, `.Title`, `.Close`, `.Incoming`, `.Shared`), `useNexMorph`, `useNexMorphSource` y un controlador imperativo para herramientas. Sobre él: la expansión de `NexCard` (misma API, más `expansionContainer`, `expansionPhysics`, `expansionChrome`, `expanded`), `NexDock`, y con las mismas familias `NexActionButton` y las transiciones espaciales de `NexFrame` (`motion`).

### Canales y coreografía

| Canal | Papel |
|---|---|
| position | El centro de la superficie: lidera (sin viscosidad). |
| size | Ancho y alto: siguen con viscosidad τ. La caja crece desde el centro del origen. |
| contour | Radio y color de la membrana: τ × 1.6, llega el último. |
| content | Contenido entrante: empieza cuando size ≥ 60 %; al cerrar sale primero y la superficie no se mueve hasta que ha bajado del 35 %. |

El contenido saliente (el del origen) se deriva de size. Los elementos compartidos (`data-nx-morph-shared`, p. ej. el título de la tarjeta) viajan con traslación y **escala uniforme**: el texto nunca se estira. El resto del contenido entra escalonado (`--nx-morph-in`, `--nx-morph-i`); los contenedores que llevan un elemento compartido reciben su material con el contenido.

### Física (medida con `npm run morph`)

| Familia | Uso | Superficie | Percibida | Sobrepaso |
|---|---|---|---|---|
| precision | micro: estados del botón | 154 ms | 196 ms | 0.2 % |
| flow | micro: anchura del botón | 200 ms | 271 ms | 0.8 % |
| viscous | paneles densos | 429 ms | 508 ms | 0 % |
| morph | tarjeta → panel | 362 ms | 375 ms | 2.2 % |
| spatial | dock, marco | 467 ms | 496 ms | 0 % |

Parámetros: masa, rigidez, amortiguación (o sobrepaso deseado), viscosidad, tensión superficial, deformación y umbral de reposo. Sin rebote exagerado (≤ 4 %, comprobado por prueba) y sin movimiento perpetuo: el reloj compartido se duerme en reposo.

### Implementación en el DOM

El panel destino se monta **una vez en su lugar final**: su contenido nunca se recoloca ni se reescala. En cada fotograma sólo cambian el trazado SVG de la membrana, el `clip-path: path()` del contenido, las transformaciones de los elementos compartidos y dos variables CSS. React no vuelve a renderizar por fotograma. Todas las medidas se hacen en coordenadas del panel sin escalar (funciona bajo un ancestro transformado), y el origen se mide en cada fotograma, así que el regreso va a su posición **actual** aunque el layout haya cambiado o haya habido scroll. Movimiento reducido: mismo estado final, sin trayecto.

### Alternativas consideradas

* **Motion `layoutId` / FLIP clásico:** interpolan cajas escalando el contenido (texto deformado) o requieren contra-escalas; no cambian la familia del contorno. Se usa FLIP sólo donde sirve: elementos compartidos con escala uniforme. No se añadió la dependencia.
* **View Transitions API:** captura imágenes y las funde; no es interrumpible a mitad ni reorientable desde la velocidad actual, y el contenido es una captura, no estado real.
* **WAAPI:** necesita keyframes conocidos de antemano; una interrupción reinicia en vez de continuar con la velocidad actual.
* **Interpolación de trazados SVG arbitrarios:** se cubre con remuestreo + correspondencia (`resampleContour`, `alignContours`); las membranas ya comparten 48 puntos, así que no hace falta en el caso general.
* **Canvas/WebGL:** innecesario para un contorno de 48 puntos; mantendría el contenido fuera del DOM accesible.

### Limitaciones

* Fluidez no medida en un equipo modesto; el panel del navegador usado para validar limita requestAnimationFrame, así que la validación visual se hizo con el scrubber (`seek`), que pinta fotogramas exactos de la simulación.
* `clip-path: path()` repinta el contenido recortado en cada fotograma durante la transformación (sólo mientras dura).
* En `NexFrame` las columnas laterales se animan con layout real (el lienzo central se recompone en cada fotograma); el contenido de las regiones conserva su ancho final y no se recompone.
* La expansión modal no bloquea el desplazamiento de la página (la transformación sigue al origen si se desplaza).

## 7. Integridad espacial y NexScroll

**Integridad espacial.** Las composiciones responden a su contenedor, no a la ventana. `resolveSpace`
(`@eclipsis/components`) da `expanded · compact · constrained`; `NexPreviewBoundary` lo mide con
ResizeObserver y lo publica por contexto, atributo y container query. `NexFrame` pliega sus regiones
antes de comprimir el lienzo bajo `canvasMinWidth` (inspector → hoja lateral, explorador → riel). No
se escala la interfaz ni se oculta el desbordamiento: cambia la estructura.

**NexScroll 2.0.** Un carril de lectura sobre el desplazamiento nativo. Composición en rejilla:
`[cabecera de capítulo]` / `[área | carril]`; el carril es una columna propia y el riel y los
marcadores viven en ella, nunca sobre el texto. Una sola autoridad: el área desplaza el navegador; la
barra nativa sólo se oculta cuando el carril está medido (`data-nx-scroll-ready`) y se conserva si el
contenido desborda en el otro eje. El pulgar es exacto (las deformaciones sólo añaden material); el
arrastre no tiene inercia. `ScrollTracker` (core) es el motor; las rejillas de dos ejes usan un tracker
por eje sobre el mismo elemento (`crossAxisFallback: false`).

## 8. NexSheets

Cuatro capas: **Core** (`@eclipsis/sheets`: libro, celdas, rangos, selección, historial, fórmulas,
autollenado, CSV/TSV/JSON, ejes virtuales; sin framework ni estilos), **React**
(`@eclipsis/react/sheets`), **capa fluida** (selección como superficie con resortes por borde, barra de
fórmulas que se tiñe al editar, carriles NexScroll) y **adaptadores** (contrato de hoja idéntico al de
NexBook; XLSX pendiente).

El motor de fórmulas, las direcciones, las ediciones y el CSV proceden del editor de hojas de
Nextudio, portados sin cambiar su comportamiento (sus 30 pruebas pasan aquí). Fórmulas soportadas:
aritmética, comparaciones, `&`, referencias y rangos de una hoja y las funciones de `FORMULA_NAMES`.
No soportado: referencias entre hojas, matrices, fechas, formato condicional, compatibilidad completa
con Excel.

Rendimiento: la rejilla sólo pinta la ventana visible; la selección vive en un almacén externo y no
vuelve a pintar celdas; la evaluación se cachea por hoja inmutable. Las cifras se miden en NexDocs
(Widgets → NexSheets → Rendimiento) en el navegador de quien mira; no se publican cifras de referencia.

## 9. Limitaciones

* Fluidez no medida aún en un equipo modesto (NexDocs → Accesibilidad y rendimiento incluye el medidor).
* `corner-shape` sólo en Chromium reciente; en otros navegadores el modo estático usa `border-radius` (el modo vivo SVG es igual en todos).
* La versión publicada de Bricolage Grotesque no trae eje de anchura: `--nx-display-stretch` sólo actúa con fuentes que lo tengan.
* La expansión tarjeta → panel (NexMorph) atrapa el foco en modo modal y no bloquea el desplazamiento de la página.
* Probado en Chromium y jsdom; sin Safari ni Firefox.
* NexSheets: sin XLSX, formato de celdas, inmovilizar paneles, desplazamiento automático al arrastrar fuera de la rejilla ni edición de filas/columnas desde la interfaz. Evalúa la hoja completa en cada cambio (adecuado a decenas de miles de celdas con fórmulas; medir antes de más).
* NexScroll: el pulgar no es enfocable (el área ya se desplaza con teclado); el carril horizontal de una rejilla no reenvía la rueda vertical.

## 10. Pendiente

Medición de fps en equipos modestos; pruebas visuales de regresión por tema/dirección; NexInput/NexSelect/NexDialog/NexMenu; fusión de más de dos superficies con metaballs; generación de tablas de API desde los tipos.
