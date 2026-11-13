# Cambios

Versiones de `@nexfluid/{foundation,core,components,sheets,react}`. Los cinco paquetes comparten versión y se fijan entre sí con versión exacta.

## Sin publicar

Compatible hacia atrás con 0.5.0: sólo añade props opcionales. Origen: la integración de `NexConsole` en NexCode (Nextudio), donde la consola vive en un panel inferior redimensionable junto a un botón «Detener» propio.

- **NexConsole · `fill`.** Ocupa el alto de su contenedor: la barra queda fija y la zona de salida crece y se desplaza dentro. Antes la salida tenía un tope fijo de 420 px (880 px en NexView) que `height` no podía superar, así que en un panel más bajo la línea de `input()` quedaba fuera de la vista y en uno más alto sobraba hueco. Con `fill` se ignora `height`; el contenedor debe tener un alto definido.
- **NexConsole · `interruptButton`.** Con `false` no se pinta «Detener» en la barra (la aplicación ya tiene el suyo); Ctrl+C en la línea de entrada sigue llamando a `onInterrupt`. Por defecto `true`: nada cambia.

## 0.5.0 — sin publicar (preparada el 2026-11-11)

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
