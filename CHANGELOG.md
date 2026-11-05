# Cambios

Versiones de `@nexfluid/{foundation,core,components,sheets,react}`. Los cinco paquetes comparten versión y se fijan entre sí con versión exacta.

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
