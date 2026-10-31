# Tokens y presets de movimiento (fase 1)

> Histórico de la fase 1. Desde las iteraciones A–D la fuente es `packages/foundation/src/tokens.ts` y las propiedades usan el prefijo `--nx-*` con los nombres de Nextudio (`--nx-bg`, `--nx-fg-muted`…); `paper/ink/rule` pasaron a `bg/fg/border`. La versión vigente está en [DISENO.md](DISENO.md) y en NexDocs → Fundamentos.

Fuente única: `src/tokens/tokens.ts` (color y geometría) y `src/core/presets.ts` (movimiento). Las cifras derivadas están en [MEDICIONES.md](MEDICIONES.md), generadas por `npm run presets`.

## Color

Propiedades CSS que consumen los componentes. El motor no conoce ninguna.

| Token | CSS | Requisito (verificado por prueba) |
|---|---|---|
| `paper` | `--nf-paper` | Fondo |
| `surface` | `--nf-surface` | `ink` ≥ 7:1 encima |
| `ink` | `--nf-ink` | ≥ 7:1 sobre `paper` |
| `inkMuted` | `--nf-ink-muted` | ≥ 4.5:1 sobre `paper` |
| `rule` | `--nf-rule` | Decorativo |
| `accent` | `--nf-accent` | ≥ 3:1 sobre `paper` (indicador, WCAG 1.4.11) |
| `accentInk` | `--nf-accent-ink` | ≥ 4.5:1 sobre `accent` |
| `fluid` | `--nf-fluid` | ≥ 3:1 sobre `paper` (gráfico) |
| `fluidSoft` | `--nf-fluid-soft` | Decorativo |

Temas incluidos: **Editorial Light** (alineado con NEX Origen), **Editorial Dark**, **Monochrome Ink**, **Chromatic Fluid**. **Custom Brand Theme:** `customTheme('editorial-light', { name: 'Marca', accent: '#…', fluid: '#…' })`; conviene añadir la marca a la prueba de contraste. **Nextudio:** `NEXTUDIO_BRIDGE` apunta a `var(--bg)`, `var(--accent)`… y hereda los contrastes ya medidos en `globals.css`.

## Geometría y materia (`GEOMETRY_TOKENS`)

| Token | Valor | Unidad | Efecto |
|---|---|---|---|
| `curvature` | 1 | tensión Catmull‑Rom | 1 redondo; < 1 contorno más tirante |
| `elasticity` | 0.84 | ζ (razón de amortiguación) | < 1 rebota; ≥ 1 sin sobrepaso |
| `viscosity` | 0.04 | s (τ) | Retraso del objetivo; 0 = agua, 0.3 = miel |
| `smoothness` | 24 | puntos del contorno | Coste lineal (16 → 19 µs, 48 → 59 µs/fotograma) |
| `radius` | 6 | px | Coherente con los 2–10 px de Nextudio |
| `maxDeform` | 0.12 | fracción del radio | Techo de cualquier deformación |
| `fusion` | 0.5 | 0–1 | Reservado para metaballs (fase 5) |
| `amplitude` | 0.02 | fracción del radio | Amplitud ambiental |

## Presets de movimiento

Cada preset = resorte (k, c, m) + viscosidad τ + deformación máxima + ambiente (amplitud, ciclos/s). `intensity` (0–1, por defecto 0.5) escala deformación y amplitud ×(2·intensity).

| Preset | ζ | Sobrepaso | Asentamiento ±0.1 % | τ | Uso |
|---|---|---|---|---|---|
| `calm` | 1.19 | 0 % | 1208 ms | 0.08 s | Superficies de lectura |
| `flow` | 0.84 | 0.7 % | 667 ms | 0.04 s | Predeterminado de interfaz |
| `elastic` | 0.44 | 21.8 % | 783 ms | 0 | Presión y suelta breves |
| `viscous` | 1.26 | 0 % | 1542 ms | 0.18 s | Interruptores, paneles |
| `magnetic` | 0.81 | 1.4 % | 525 ms | 0.02 s | Seguir puntero o foco |
| `morph` | 0.85 | 0.7 % | 737 ms | 0.06 s | Cambio de geometría |
| `spring` | 0.52 | 14.8 % | 733 ms | 0 | Confirmaciones, con moderación |
| `ambient` | 1.11 | 0 % | 1854 ms | 0.30 s | Fondo detenible, nunca sobre texto |

El asentamiento se mide sin τ; la viscosidad añade retraso de llegada pero no sobrepaso adicional apreciable.

## Movimiento reducido

* `MotionPreference`: `system` (sigue `prefers-reduced-motion`), `reduce`, `full`. Sólo la aplicación decide `full`.
* En modo reducido: sin ambiente, sin atracción, sin suscripción al reloj; la presión se muestra como un cambio de escala instantáneo (97 %) y la suelta vuelve al estado exacto.
