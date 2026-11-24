# Cambios

Versiones de `@nexfluid/{foundation,core,components,sheets,react}`. Los cinco paquetes comparten versión y se fijan entre sí con versión exacta.

## Sin publicar

### Añadido

- **`NexCombobox`** (nuevo). Campo de texto libre con sugerencias (patrón
  WAI-ARIA combobox con `aria-autocomplete="list"`): el foco se queda en el
  `<input>` mientras la lista está abierta, la sugerencia activa la marca la
  gota de NexSelect y sigue al puntero, y elegir NO vuelve a abrir la lista
  aunque cambien las sugerencias. Las sugerencias las da la aplicación; con
  `filter` (por defecto) se filtran aquí sin acentos, con `filter={false}` se
  muestran tal cual (búsqueda propia). `onOptionSelect` avisa de la elección;
  las teclas que el combobox no usa (Intro con la lista cerrada, Escape con la
  lista ya cerrada) llegan a `onKeyDown`. Tab cierra sin elegir. Reutiliza la
  membrana de `NexInput` y la lista de `NexSelect`. Origen: el campo de
  producto de la caja V3, que no podía usar NexSelect porque éste mueve el
  foco a su buscador.

### Corregido

- NexSheets: arrastrar la barra de desplazamiento de la rejilla avanzaba una
  casilla y se detenía. El estado "arrastrando" de los carriles era una
  variable local de `railHandlers`, que se vuelve a crear en cada render, y el
  desplazamiento vuelve a renderizar la rejilla (filas virtuales): tras el
  primer movimiento valía `false` y los demás se ignoraban. Ahora vive en un
  `useRef`, como en `NexScrollRail`. Medido en WebKitGTK: antes el
  desplazamiento se quedaba en 259 px; ahora avanza en cada paso. Detectado en
  la caja V3.
- NexSheets: el anillo de foco de la rejilla sólo se veía abajo y a la derecha.
  Era una sombra interior de la zona con scroll: la tapaban los encabezados
  fijos y la recortaban las esquinas redondeadas. Ahora lo pinta el contenedor
  (`.nx-sheets::after`), encima de todo y con sus esquinas, como el foco de
  NexInput. Detectado en la caja V3.
- Anillos de foco interiores (barra de fórmulas de NexSheets, buscadores de
  NexSelect y de la paleta de comandos, editores de Markdown, consola, NexInk,
  NexPortal): se veían más gruesos de un lado. Medían 1.5 px y el motor
  redondea un lado a 2 filas de píxeles y el otro a 1 (medido en WebKitGTK).
  Pasan a 2 px, como el foco de NexInput. Una prueba del contrato CSS impide
  que vuelva un anillo de foco de medio píxel. Detectado en la caja V3.
- `NexCheckbox`: al marcar, la casilla pasaba a gota de golpe, y al desmarcar
  se quedaba redonda casi toda la transición y luego saltaba a cuadrada. La gota
  animaba `border-radius` hacia `9999px`: el límite visible (10 px, la mitad de
  la casilla) se cruzaba en el primer instante al marcar y en el último al
  desmarcar. Ahora usa los radios que el navegador dibujaba tras reducirlos en
  proporción (`20px 0 20px 0`): la hoja se ve igual y la transición es pareja en
  los dos sentidos. Detectado en la caja V3.
- Redondez de los controles: un `NexButton` no tenía la misma redondez que un
  `NexInput` o un `NexSelect` a su lado. La familia `capsule` (la de los
  controles) declaraba `cornerShape: 'round'` pero `smoothing: 1`, y la membrana
  dibujaba sus extremos como superelipse de exponente 5, casi cuadrados; los
  campos, en CSS, eran semicírculos. Ahora `capsule` tiene `smoothing: 0`
  (semicírculo, como su `cornerShape`). Además `NexInput`, el disparador de
  `NexSelect` y su buscador leen `--nx-control-radius` y `--nx-control-corner`
  en vez de un radio fijo: cambiar el token cambia todos los controles por
  igual. Por defecto se ven igual que antes. Detectado en la caja V3.
- `NexSurface` (NexButton, NexCard… interactivas): el brillo bajo el puntero
  (`.nx-surface__zone`) se quedaba con las esquinas de la caja mientras la
  membrana se abombaba hacia el puntero, y se veían dos formas. Con la
  membrana dibujada, la zona se recorta ahora con su misma forma (un
  `<clipPath>` que se actualiza en el mismo cuadro que el borde) y se extiende
  `--nx-zone-bleed` (24 px) fuera del elemento para cubrir el abombamiento. El
  degradado usa un radio explícito (`--nx-zone-ray`, la esquina más lejana de
  la caja original), así que el brillo mide lo mismo que antes. Detectado en la
  caja V3.
- `liquidCapsule` (la gota de NexSelect, NexNav, NexTabs…): en listas
  verticales anchas, a mitad del viaje la gota mostraba una hendidura en cada
  lado. El cuello se aplicaba aunque la cápsula no tuviera tramo recto (una
  gota tan ancha como larga: 182 × 184 px con los valores por defecto en una
  lista de 255 px) y sus curvas bajaban casi en vertical. Ahora el cuello se
  limita a la mitad del tramo recto de cada lado; con tramo recto de sobra
  (pestañas, navegación) no cambia. Detectado en la caja V3.
- `NexSelect`: en WebKit la lista quedaba con un hueco vacío
  hasta el borde de la ventana. En la capa superior, WebKit estira una rejilla
  (`display: grid`) hasta su `max-height`; el popup es ahora una columna flex,
  que mide su contenido en los tres motores. La lista sube de 300 a 320 px de
  alto máximo: caben 8 opciones de una línea sin barra de desplazamiento.
- `NexSelect` (y cualquier dueño de `useLiquid` cuyo contenedor se desmonte):
  la gota sólo se animaba la primera vez que se abría la lista. `useLiquid`
  marcaba «lista» con un booleano del componente, así que la lista nueva de
  cada apertura nunca recibía `data-nx-ready` y quedaba el resaltado de
  respaldo; el `ResizeObserver` seguía además a la lista vieja. Ahora «lista»
  y el observador van por elemento. Detectado en la caja V3.
- `NexInput`: un clic por encima o por debajo del texto dejaba el cursor al
  principio del campo en Chromium y WebKit. El `<input>` mide ahora sólo su
  línea y un clic en el resto de la membrana enfoca el campo con el cursor al
  final (o al principio, si cae antes del texto); los botones y enlaces de los
  adornos conservan su clic. Alargar la línea con `line-height` no basta:
  WebKit lo ignora dentro del `<input>`. Detectado en la caja V3.
- `NexFrame`: el lienzo ya no aísla el apilamiento de su contenido
  (`isolation: auto` en `.nx-frame__canvas`). Las capas `position: fixed` que
  abre la aplicación desde el lienzo (visores, revisiones, modos de foco)
  quedaban por debajo de la barra superior (`--nx-layer-frame`). Detectado al
  adoptar `NexFrame` como shell autenticado de Nextudio.
- `NexMorph`: el panel en modo `viewport` se monta en `<body>`, fuera del
  `NexProvider`, y caía en los tokens por defecto (claro) aunque la aplicación
  estuviera en un tema oscuro o en otra dirección. Ahora la raíz del portal
  repite `data-nx-theme`, `data-nx-direction` y `data-nx-density` del
  proveedor más cercano. `useNex()` expone `theme` y `direction` heredados.

## 0.9.0 — preparada el 2026-11-20 (sin publicar)

Navegación de aplicación: el riel lateral compacto, sus rótulos y los iconos de destino. Compatible hacia atrás con 0.8.0: sólo añade exportaciones y props opcionales; `NexNav` sin las props nuevas se pinta igual. Origen: la barra lateral de Nextudio (`AppSidebar`), que mantenía su propio sistema de iconos, rótulos y estados y ocultaba los iconos al expandirse.

- **`NexNav` · `compact`.** Riel de iconos: la etiqueta de cada destino sigue siendo su nombre accesible (texto oculto) y aparece como rótulo (`NexTooltip`) con el puntero o el foco de teclado. El icono es el mismo en los dos estados; los títulos de `NexNav.Group` siguen nombrando su sublista aunque no se vean, y los grupos se separan con un filete. `tooltipSide` y `tooltipGap` eligen el lado (`right`) y la distancia (8 px; más si el riel tiene margen y el rótulo debe quedar fuera). Lo que acompaña a un destino (`trailing`, p. ej. un contador) queda superpuesto al icono.
- **`NexNav` · `density`.** `compact` 32 px, `comfortable` 36 px (por defecto), `spacious` 44 px; siempre 44 px con puntero grueso.
- **`NexNav` · `landmark={false}`.** Un grupo con nombre (`role="group"`) en vez de un `<nav>`: una barra lateral compone varias listas dentro de UNA navegación sin anidar landmarks.
- **`NexTooltip`** (nuevo). Rótulo de un control sin texto visible. No añade caja (`display: contents`), aparece con el puntero o con el foco de TECLADO (`:focus-visible`), sube a la capa superior con el posicionamiento de las capas ancladas (ningún contenedor con `overflow` lo recorta) y cumple WCAG 1.4.13: Escape lo descarta, se puede recorrer con el puntero y dura mientras haya puntero o foco. Decorativo por defecto (`aria-hidden`, repite el nombre del control); con `describe` se une con `aria-describedby`. `gap` fija la distancia al control. Sin animación con movimiento reducido.
- **`NexButton` · `contentAlign`.** `start`: el contenido se lee de izquierda a derecha y `iconEnd` va al extremo, para filas de una barra lateral o de una lista. `center` por defecto: los botones existentes no cambian.
- **Iconos** `home`, `academic`, `compass`, `chart`, `bell`, `shield` y `user`, en la retícula de 24 px (trazo 1.5, extremos redondos).
- NexDocs: página de `NexTooltip`; `NexNav` gana el control «Riel compacto» y las filas de API nuevas.

## 0.8.0 — preparada el 2026-11-19 (sin publicar)

Primitivas para contenido creado por personas: identidad, texto largo y menús de elección. Compatible hacia atrás con 0.7.0: sólo añade exportaciones y props opcionales; ningún componente existente cambia por defecto. Origen: NexFeed 2.0 (muro social de Nextudio), donde se auditó qué faltaba en la biblioteca antes de reimplementarlo en la aplicación (`docs/NEXFEED.md` en Nextudio).

- **`NexAvatar`** (nuevo). Imagen o, si falta o no carga (también antes de hidratar), hasta dos iniciales por grafemas sobre un tono estable que sale del nombre (FNV-1a: mismo nombre, mismo tono en servidor y cliente). El tono es una de cuatro parejas de tokens de foundation (`accent`, `success`, `warning`, `neutral`): ningún color nuevo. `shape="circle"` (personas, cápsula) o `"membrane"` (espacios: cursos, equipos; superelipse de la dirección). Decorativo por defecto (`aria-hidden`); `decorative={false}` lo anuncia como `role="img"` con el nombre. Se exportan `avatarInitials` y `avatarTone`. Sustituye a `UserAvatar` de Nextudio, que no recuperaba una imagen rota.
- **`NexTextarea`** (nuevo). `<textarea>` nativo con la membrana, la etiqueta, la ayuda y el error de `NexInput` (`aria-describedby`, `aria-invalid`). Crece con lo escrito entre `minRows` (3) y `maxRows` (12; `Infinity` sin tope), medido antes de pintar y también cuando el valor cambia desde fuera. `footer`: una fila de acciones dentro de la misma membrana (contadores, adjuntos, enviar). En pantallas táctiles el texto no baja de 16 px. Nextudio tenía 42 `<textarea>` propios.
- **`NexMenu` · `selection="single"`.** Con `checked`, cada acción es una opción excluyente (`menuitemradio`) en vez de un interruptor (`menuitemcheckbox`): el icono se conserva (p. ej. el de una reacción) y la marca va al final. `selection` vale `multiple` por defecto: los menús existentes no cambian.
- **`NexMenuItem.description`.** Segunda línea bajo la etiqueta («Una instrucción para IA, reutilizable»), unida con `aria-describedby`. La rejilla de la acción admite ahora icono, texto, pista y marca sin columnas fijas.
- **`NexButton` · `linkAs`.** Con `href`, el componente de enlace del enrutador (`Link` de Next.js, de React Router…) para navegar en el cliente sin perder la membrana, la física ni los atributos. Un enlace inerte (`disabled`, `loading`) sigue siendo `<a>` sin destino. Antes, un `NexButton` con `href` siempre recargaba la página: en Nextudio rompía las rutas interceptadas (el permalink de una publicación como diálogo).
- NexDocs: páginas de `NexAvatar` y `NexTextarea`; `NexMenu` gana el control «Selección única» y las filas de API nuevas.

## 0.7.0 — preparada el 2026-11-16 (sin publicar)

Primera versión publicable después de 0.5.0: **0.6.0 nunca se publicó** y todo su contenido (sección siguiente) llega con 0.7.0. Compatible hacia atrás con 0.5.0 en API: sólo añade exportaciones y props opcionales; los cambios visibles por defecto de 0.6.0 siguen anotados abajo.


- **`useNexLayoutTransition(ref, clave, opciones)`.** Transición de disposición genérica: cuando un contenedor se recompone (un panel que se abre o se cierra, un lienzo que pasa de una columna a dos, una superficie que se amplía), cada elemento con `data-nx-layout-id` viaja desde su caja anterior. FLIP sin reescalar: la disposición final se calcula una vez (un editor de código dentro mide su tamaño final una sola vez) y sólo se animan `transform` y `clip-path`; lo que crece se descubre con un recorte desde su tamaño anterior, lo que encoge se desplaza, lo que llega emerge con opacidad. Duración y curva de la familia `surface`. Interrumpible (un cambio nuevo cancela el anterior y parte de la última disposición); inmediata con movimiento reducido, `motion="none"` o un cambio hecho con el teclado (`data-nx-input="keyboard"`). `layoutKeyframes` se exporta para quien anime a mano. Ejemplo vivo en NexDocs → Motion. Origen: NexCode V2 (Nextudio), donde `NexFrame` no servía porque anima la rejilla en cada fotograma y el editor se redimensionaría 60 veces por segundo. Sólo añade exportaciones.
- **NexView · un programa de consola como pequeña aplicación.** Lo que el propio programa escribió se presenta con jerarquía, sin cambiar ni inventar texto: su primera línea como **título** (`leadingTitle`: una sola línea corta en prosa, sin `:`/`?`/`.` final, y sólo si después el programa pregunta algo) y las líneas seguidas `Etiqueta: valor` como **datos** (`factLines`: dos o más, todas con esa forma; `Error:`/`Traceback` no cuentan; una enumeración —`Paso 1: listo`, `Paso 2: listo`— es un registro y sigue siendo texto). Ante la duda, texto fiel. Las preguntas de `input()` ya se presentaban como pregunta y respuesta (0.6). La Consola no cambia. Origen: NexCode V2 (Nextudio), donde NexView pasa a ser la presentación por defecto.
- **NexView · `input()` en línea.** La pregunta y su campo comparten línea (`Nombre: ____`) si caben; una pregunta larga (más de 40 caracteres) deja el campo debajo, a lo ancho, y en pantallas estrechas el campo baja solo. La pregunta es la `<label>` del campo y se ve una sola vez. Respondida: `Nombre: Ana`, sin píldora. Desaparece la etiqueta «Entrada» (sin pregunta, sólo el campo, con su nombre accesible). Una pregunta nueva no le quita el foco a otro control que se está usando (un deslizador, un editor).
- **NexView · figuras.** Una figura sola se centra, conserva su tamaño natural (nunca se amplía) y tiene más sitio antes de reducirse (hasta 760 px de ancho y `min(65vh, 560px)` de alto).
- **Consola y NexView · controles de terminal.** `applyTerminalControls(outputs)` aplica lo que una terminal haría con los controles del programa antes de presentar la salida (las dos vistas leen el mismo resultado): borrar la pantalla (`ESC[2J`/`3J`, `ESC[H`+`ESC[J`, `ESC c`), borrar línea (`ESC[K`/`1K`/`2K`), `\r` (sobrescribir la línea: barras de progreso), `\b` y movimientos del cursor (`H`/`f`, `A`–`D`, `G`). Sólo se interpretan secuencias que empiezan por `ESC`; las no compatibles (colores SGR, `ESC[?25l`, OSC) se ignoran sin enseñarse, y una incompleta al final de un fragmento se retiene hasta que llega el resto. La pantalla es el texto (stdout, stderr, respuestas a `input()`): tablas, imágenes y widgets no se borran. Nuevo `NexConsoleClearOutput` (`stream: 'clear'`, `wait?`): `clear_output()` de IPython, que limpia toda la salida anterior (con `wait`, al llegar la siguiente). Sin controles, la lista se devuelve tal cual. **Tipo**: `NexConsoleOutput` gana el miembro `clear`; un `switch` exhaustivo sobre `stream` debe contemplarlo.
- **NexView · el mensaje del programa a la vista en los diagnósticos.** `NexViewDiagnostic.message` (opcional) lleva el mensaje de la excepción tal como lo escribió el programa y se muestra bajo el título (`ValueError: dato inválido`); antes sólo se veía la explicación genérica y el mensaje quedaba plegado en «Mensaje original». Sin duplicarlo como explicación.
- **NexConsole · la barra de estado se reparte entera.** En un contenedor estrecho el estado ya no se encoge hasta partir su contenido («Finalizado» / «75» / «ms»): mide lo que mide su texto, cada dato va en una línea y los datos secundarios llevan separador («Finalizado · 75 ms»).
- **NexMarkdownField · una lista dentro de un párrafo se guarda como lista.** Chromium deja la lista dentro del párrafo al convertirlo (`<p><ul>…</ul></p>`, o `<div><ul>…`); `richTextToMarkdown` guardaba ese envoltorio como texto y el Markdown perdía los marcadores.

## 0.6.0 — no publicada (su contenido se publica en 0.7.0)

Reúne #8–#13. Compatible hacia atrás con 0.5.0 en API (sólo añade exportaciones y props opcionales); dos cambios VISIBLES por defecto, anotados en la matriz.

### Compatibilidad con Nextudio (verificada con los paquetes locales, `npm install --no-save`)

| Superficie de Nextudio | Resultado con 0.6.0 | Acción al integrar |
|---|---|---|
| `tsc --noEmit` | 0 errores | ninguna |
| NexCode · Consola / NexView (`nexcode-console`) | 18/18 | la prueba del prompt de `input()` ya acepta ambas versiones (NexView no conserva el espacio final del prompt) |
| NexCode · hojas CSV (`workspace-sheet`) | rejilla 101 × 27 en un CSV vacío; ceros iniciales conservados; sin filas añadidas al guardar | ninguna (`workbookToCsv` ya guarda sólo el rango usado) |
| NexCode · pestañas, Explorer, inspector, paquetes | unitarias en verde | retirar los shims propios cuando se adopten `NexTab onClose` y `NexExplorerWidget` |
| NexBook / Vivlio | unitarias en verde | ninguna |

Cambios visibles por defecto: (1) NexView presenta el texto ordinario con tipografía de lectura y `input()` como pregunta; (2) NexSheets muestra una rejilla mayor que los datos (`extent={false}` recupera las dimensiones exactas).

- **NexSheets · rejilla de hoja de cálculo desde el inicio.** Un CSV nuevo o vacío ya no muestra una sola celda: la hoja tiene una **extensión visible** distinta del rango con datos (por defecto 26 columnas × 100 filas, `DEFAULT_SHEET_EXTENT`) que crece sola al acercarse al borde, con los topes de `limits`. Es vista, no datos: sólo se guardan las celdas con contenido y `sheetValueRows`/`toCsv` exportan el rango usado, sin filas de relleno. `viewExtent` y `withExtent` en `@nexfluid/sheets`; `NexSheets`/`NexSheetsProvider` aceptan `extent` (`false` = dimensiones exactas del libro). Compatible hacia atrás salvo que la rejilla visible por defecto es mayor que los datos.
- **NexView · texto editorial.** El texto ordinario de stdout se presenta con la tipografía de lectura (`data-form="prose"`) y conserva TODOS sus bytes (`pre-wrap`: saltos y espacios intactos). Lo que depende de la rejilla —tablas dibujadas, arte ASCII, código impreso, columnas alineadas, barras de progreso, tabuladores— se queda en monoespaciada (`data-form="literal"`). Reglas conservadoras y verificables (`textForm`); ante la duda, literal. La Consola no cambia.
- **NexView · `input()` como intercambio.** La pregunta de un `input()` (lo impreso justo antes en la misma línea) se presenta como pregunta: con el campo mientras espera y con la respuesta cuando se contestó. `NexViewEvent` de tipo `input` gana `prompt` (opcional); `splitPrompt` y `textForm` se exportan desde `@nexfluid/components`. Ningún byte se pierde: lo anterior a la pregunta sigue como texto.
- **NexTab · `onClose` y `closeLabel`.** Pestañas cerrables para editores (archivos abiertos): aspa visible que no es un botón anidado ni recibe foco; Supr sobre la pestaña y el clic central también cierran. Quien la usa decide qué pestaña queda activa. Sin `onClose`, nada cambia. Origen: las pestañas de archivos de NexCode.
Compatible hacia atrás con 0.5.0: sólo añade props opcionales. Origen: la integración de `NexConsole` en NexCode (Nextudio), donde la consola vive en un panel inferior redimensionable junto a un botón «Detener» propio.

- **NexConsole · `fill`.** Ocupa el alto de su contenedor: la barra queda fija y la zona de salida crece y se desplaza dentro. Antes la salida tenía un tope fijo de 420 px (880 px en NexView) que `height` no podía superar, así que en un panel más bajo la línea de `input()` quedaba fuera de la vista y en uno más alto sobraba hueco. Con `fill` se ignora `height`; el contenedor debe tener un alto definido.
- **NexConsole · `viewToggle` y `chrome`.** `viewToggle={false}` retira el selector Consola | NexView (la aplicación muestra NexView en otro sitio, como el panel lateral de NexCode); `chrome={false}` retira la barra entera para incrustar NexView en una superficie con su propia cabecera. Por defecto, `true`: nada cambia.
- **NexConsole · `interruptButton`.** Con `false` no se pinta «Detener» en la barra (la aplicación ya tiene el suyo); Ctrl+C en la línea de entrada sigue llamando a `onInterrupt`. Por defecto `true`: nada cambia.

## 0.5.0 — 2026-11-12

Compatible hacia atrás con 0.4.0: sólo añade exportaciones y props opcionales. Mientras NexFluid esté en `0.x`, Nextudio debe tratar cualquier subida como potencialmente incompatible (ADR 0001 §6.3).

- **Añade NexGrid** (`NexGrid`, `NexGridItem` en `@nexfluid/react`). Es una cuadrícula editorial con columnas (1–12), separación por tokens, `span`, `rowSpan` y `spanCompact`. Se adapta al ancho del **contenedor**, no al de la ventana. Su edición es opcional: arrastre 2D, flechas para mover, Mayús+flechas para cambiar el ancho, anuncios en región viva y FLIP sin movimiento cuando está reducido. Las cuadrículas anidadas tienen un tope y la interior se apila. Dentro de NexFlow vive en un `NexEditorialBlock`: cada nivel tiene un único dueño del orden. Ver `docs/NEXGRID.md`.
- **Añade** en `@nexfluid/components` el contrato serializable de cuadrícula: `normalizeGridLayout`, `gridKeyboardMove`, `gridResizeStep`, `gridReorderSlot`, `gridRowsOf`, `gridGapValue`, `clampSpan`, `clampColumns`, `NEX_GRID_LIMITS` y `NEX_GRID_GAPS`, con los tipos `NexGridLayout`, `NexGridItemLayout`, `NexGridGap` y `GridRect`.
- **NexPortal · sandbox para runtimes.** El modo `sandbox` puede alojar un runtime como Pyodide sin abrir `allow-same-origin`. Ver `docs/NEXPORTAL.md` §2.1.
  - `permissions.workers` permite Workers de módulo desde `data:` y nada más: ni `blob:` ni rutas del host.
  - `permissions.wasm` añade `'wasm-unsafe-eval'`, nunca `'unsafe-eval'`.
  - `resources` (`SandboxResources`) admite prefijos http(s) exactos para `script-src` y `connect-src`. `sandboxResource()` descarta los comodines, las credenciales, la consulta y el fragmento.
  - Nuevo canal de datos en ambos sentidos: `onMessage` en el host, `nexPortal.send` y `nexPortal.onMessage` dentro. Se apoya en `isPortalChannelMessage` y `portalHostMessage`, y valida el origen del frame y el token de la sesión.
  - Control imperativo por `ref` (`NexPortalHandle`): `post` espera a que cargue el documento y `reload` crea un documento nuevo, lo que también termina sus Workers. `chrome={false}` oculta la etiqueta del sandbox.

## 0.4.0 — 2026-11-04

Primera versión que se puede reconstruir desde un commit. `npm run release:pack` compila dos veces y verifica que la integridad sha512 coincida (ver `docs/RELEASE.md`).

- **Integra** `feat/nexportal-nexink` (`58a244f`): `NexPortal`, `NexInk`, `NexAnchoredLayer`, `NexMenu`, `NexCommandMenu`, `NexConsole`, `NexLiveConsole`, `NexTerminalSurface`, `NexFlow`, `NexEditorialBlock`, `NexMarkdownField` y `live="engaged"`.
- **Ámbito:** se queda en `@nexfluid/*`. El renombre a `@eclipsis/*` de esa rama nunca se publicó y se revierte.
- **Corrige** (#1): `tokens.css` ya no declara `color-scheme` en `:root`, porque imponía el esquema claro a la aplicación anfitriona. `color-scheme` solo va con un `[data-nx-theme]` explícito.
- **Añade** (#3) en `@nexfluid/foundation`: `hostContrast()`, `resolveBridge()` y `readCssVariables()`, con los tipos `HostContrastResult` y `HostContrastFailure`. Aplican los 18 `CONTRAST_REQUIREMENTS` de un tema a los colores reales de una aplicación anfitriona vista por un puente `var(--x, respaldo)`. `scripts/host-contrast.ts` los ejecuta sobre una hoja CSS.
- **Añade** el icono `ai-generate` (generar con IA): una chispa fluida, su burbuja y una partícula, en tres trazos. Es animable: con `data-nx-live`, `@nexfluid/components` hace respirar la chispa (interpola `d` hacia la nueva `ICON_POSES['ai-generate'].breath`), sube la burbuja y titila la partícula. Se detiene con `prefers-reduced-motion` y con `data-nx-motion-pref="reduce"`. `NexIcon` marca el `<svg>` con `data-nx-icon`.

### Diferencias con 0.3.0 (importante)

`@nexfluid/*@0.3.0` (npm, 2026-11-02) **no salió de ningún commit** de este repositorio: no tiene `gitHead` ni *provenance*. Al comparar su `dist/` con esta versión:

| Paquete | Igual que 0.3.0 | Solo en 0.3.0, sin fuente en Git |
|---|---|---|
| `core`, `sheets` | Todo | — |
| `foundation` | Todo salvo la corrección de `color-scheme` | — |
| `components` | Todo salvo `styles.css` | En `styles.css`: color de texto con respaldo, `--nx-on` en material `clear`, el fondo de `nx-surface` dibujada pasa al SVG con respaldo de impresión, la zona de color de superficie, el contorno de `NexBadge` sobre tinta, y el modo `focus` de `NexMarkdownField` |
| `react` | Todo salvo 9 archivos | `./feed` (`NexFeed`, `NexPost`, `NexComposer`, `NexAttachment`, `NexThread`), `markdown/tools` (`tools` y `focus` en `NexMarkdownField`), la guarda de tamaño cero y la zona de color en `surface`, y el orden de `enabled` en `ink` |

Si esa fuente existe fuera de GitHub, hay que subirla antes de etiquetar `v0.4.0`. Si no, 0.4.0 sale sin esos cambios y `./feed` deja de existir. Para un consumidor de 0.3.0, por tanto, 0.4.0 es una versión incompatible.

## 0.3.0 — publicada, no reproducible

Publicada el 2026-11-02 desde una copia local. Equivale a `feat/nexportal-nexink` con el ámbito `@nexfluid`, más los cambios de la tabla anterior.

## 0.2.0

`main` `6c4c2ca`. No se publicó.
