# Mapa de tokens, temas e iconografía frente a Nextudio (#404, primera entrega)

gibran564/UINEXUS#404 · EPIC #395 · Fuente de Nextudio: `src/app/globals.css` y `src/app/layout.tsx` en `main` `b9029099`.

Este documento lo mantiene NexFluidUI y no contiene lógica de Nextudio. Describe cómo el adaptador `compat/nextudio.css` (`data-nx-theme="nextudio"`, `data-nx-direction="nextudio"`) presenta los tokens de una aplicación anfitriona.

## 1. Color: roles de NexFluid → variables de Nextudio

`NEXTUDIO_BRIDGE` (`packages/foundation/src/compat.ts`) resuelve cada rol con `var(--nextudio, respaldo NEX Origen claro)`.

| Rol NexFluid (`--nx-*`) | Variable de Nextudio | Notas |
|---|---|---|
| `bg`, `surface`, `surface-raised`, `surface-sunken` | `--bg`, `--surface`, `--surface-raised`, `--surface-sunken` | 1:1 |
| `fg`, `fg-muted`, `fg-subtle` | `--fg`, `--fg-muted`, `--fg-subtle` | 1:1 |
| `border`, `border-strong` | `--border`, `--border-strong` | 1:1. Ver §2 sobre `border-strong` |
| `accent`, `accent-hover`, `accent-fg`, `accent-soft`, `accent-line` | igual | 1:1 |
| `success`, `warning`, `danger` y sus `-soft` | igual | 1:1 |
| `fluid`, `fluid-soft`, `fluid-fg` | `--accent`, `--accent-line`, `--accent-fg` | Nextudio no tiene «materia»: la gota usa el acento |
| `code-keyword`, `code-string`, `code-number`, `code-comment`, `code-type` | `--accent`, `--success`, `--warning`, `--fg-muted`, `--accent-hover` | Aproximación. Monaco y NexBook tienen su propio tema (`monaco-nexperience-theme`) |
| `zone` | — (`transparent`) | Sin equivalente; la zona de color no se ve en Nextudio |
| `depth` | — (`rgb(25 26 28 / 0.12)`) | **No sigue al tema oscuro**: es la misma sombra en los dos esquemas. Aceptable, porque la sombra es oscura, pero no está verificado visualmente |

Las 20 variables existen en los cuatro estilos de Nextudio: terracotta y graphite, cada uno en claro y en oscuro (verificado al leer `globals.css`).

## 2. Contraste con los valores reales de Nextudio

`hostContrast()` (nuevo en `@nexfluid/foundation`) aplica a un anfitrión los mismos 18 `CONTRAST_REQUIREMENTS` que a un tema nativo:

```sh
node --conditions=nexfluid-source scripts/host-contrast.ts <ruta>/globals.css "[data-style='terracotta']"
node --conditions=nexfluid-source scripts/host-contrast.ts <ruta>/globals.css "[data-style='terracotta']" "[data-theme='dark'],\n[data-theme='dark'] [data-style='terracotta']"
```

| Estilo de Nextudio | 18 requisitos de NexFluid | `--border-strong` / `--bg` (no es requisito) |
|---|---|---|
| terracotta · claro | **Cumple** | 1,67:1 |
| terracotta · oscuro | **Cumple** | 1,92:1 |
| graphite · claro | **Cumple** | 3,04:1 |
| graphite · oscuro | **Cumple** | 3,66:1 |

**Riesgo (WCAG 1.4.11):** con contraste normal, en terracotta, un control delineado cuya única frontera es `border-strong` (por ejemplo `NexInput` o `NexButton appearance="outlined"`) queda por debajo de 3:1. Pasa lo mismo hoy con los `.field` de Nextudio, así que no es una regresión, pero #407 debe decidir:
- que los campos lleven fondo `surface-sunken` además del borde, o
- que Nextudio oscurezca `--border-strong` en terracotta.

El piloto (#406) solo migra botones con texto, que no dependen del borde para identificarse.

## 3. Cascada y coexistencia de estilos

| Hoja de Nextudio | Capa | Efecto dentro de una isla NexFluid |
|---|---|---|
| Preflight de Tailwind y reglas de elemento (`*`, `html`, `body`, `button`, `input`, `a`, `h1–h6`, `:focus-visible`, `::selection`, `svg`) | `@layer base` | **Pierden** frente a las hojas de NexFluid, que no van en capa. No hay que subir especificidad |
| `.btn`, `.field`, `.tag` y demás | `@layer components` | No se aplican: NexFluid usa `.nx-*` |
| `@media (prefers-reduced-motion: reduce) *, ::before, ::after` (`globals.css:750`) | sin capa | Pone `animation-duration` y `transition-duration` a `0.01ms !important`, también dentro de NexFluid. Es coherente con la política de NexFluid, que ya es inmediata con movimiento reducido. La física por JS (resortes) no la toca: la controla `useMotionPreference`, verificado en #401 |
| `@media (prefers-contrast: more)` (`globals.css:767`) | sin capa | Oscurece `--border`, `--border-strong`, `--fg-muted` y `--fg-subtle` en los cuatro estilos. Como el puente lee esas variables, **NexFluid hereda el modo de contraste alto de Nextudio sin código propio** (por cascada de propiedades; no verificado en navegador) |
| `[data-theme='dark']`, `[data-style=…]` con `color-scheme` | sin capa | Desde #1, NexFluid ya no pisa `color-scheme` en `:root` |
| Variables propias de Nextudio `--nx-*` / clases `.nx-*` | — | Las seis que coincidían se renombraron a `nxp-*` en gibran564/UINEXUS (PR de coexistencia). Las demás `--nx-*` de Nextudio (`--nx-float-right`, `--nx-tools-*`, `--nx-keyboard-inset`, `--nx-emerge-y`, …) **no** las define NexFluid hoy. Cualquier token nuevo de NexFluid debe comprobarse contra esa lista |

## 4. Tipografía

`NEXTUDIO_DIRECTION` usa `var(--font-space-grotesk)`, `var(--font-inter)` y `var(--font-jetbrains-mono)`. Son exactamente las variables que declara `next/font` en `layout.tsx`. Source Serif 4 (`--font-source-serif`, lectura opcional) **no** está mapeada: `[data-font='serif']` de Nextudio no llega al texto de los componentes NexFluid. Hay que decidirlo en #407, si algún control muestra texto de lectura.

## 5. Iconografía

- **NexFluid:** 33 iconos en retícula de 24 px (`ICONS`): `arrow-right`, `arrow-left`, `chevron-right`, `chevron-down`, `check`, `close`, `plus`, `minus`, `copy`, `search`, `menu`, `external`, `reload`, `expand`, `shrink`, `globe`, `file`, `folder`, `code`, `eye`, `settings`, `sun`, `moon`, `play`, `inspector`, `sidebar`, `grid`, `dot`, `info`, `alert`, `drop`, `grip` y `more`.
- **Nextudio:** no usa ninguna librería de iconos. Tiene SVG en línea en 46 componentes, más `nexbook-block-icon.tsx`, `nexbook-output-icon.tsx` y los `.md-icon` de Markdown (18 nombres).
- **Piloto (#406):** las cuatro acciones migradas son de solo texto. **No necesita iconos.**
- **Pendiente para #407/#408:** inventariar los SVG en línea de Mi estudio (crear, importar y tipos NexBook/NexCode/NexWeb) frente a `ICONS`, y añadir a NexFluid solo los que falten con demanda real. No se migran iconos por migrar.

## 6. Estado de los criterios de #404

| Criterio | Estado |
|---|---|
| Contrato y ejemplos de tokens claro/oscuro y contraste | **Hecho para color:** §1–§2, `hostContrast()` y pruebas. Faltan ejemplos visuales en NexDocs |
| Identificar el CSS global que requiere coexistencia o aislamiento | **Hecho:** §3. Colisiones resueltas en Nextudio y `color-scheme` corregido en #1 |
| Tokens y adaptador visual publicados en NexFluidUI, sin lógica de Nextudio | **Pendiente de publicar:** `compat/nextudio.css` está en 0.3.0 y en 0.4.0 (#2). `hostContrast` entra en la versión que siga a este PR |
