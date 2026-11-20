# Cambios

Versiones de `@nexfluid/{foundation,core,components,sheets,react}`. Los cinco paquetes comparten versión y se fijan entre sí con versión exacta.

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
