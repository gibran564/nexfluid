# NexFluidUI

**Living Editorial Interfaces** — un sistema de diseño y una biblioteca de componentes donde las superficies son membranas, los indicadores son gotas líquidas y la tipografía sostiene la estructura. Incluye **NexFluid**, el motor de movimiento orgánico, y **NexDocs**, su documentación interactiva.

> Proyecto en fase de laboratorio (0.2). No está publicado en npm.

**Documentación en vivo:** GitHub Pages de este repositorio.

## Ejecutar

Node ≥ 22.18 (ejecuta TypeScript sin compilar).

```bash
npm ci
npm run dev              # NexDocs en http://127.0.0.1:5290
npm run dev:playground   # laboratorio del motor en http://127.0.0.1:5288
npm test                 # Node (motor, tokens, contrato CSS, arquitectura) + Vitest (React, axe, SSR)
npm run typecheck
npm run build            # dist/ de los paquetes → verificación de exports → NexDocs y Playground estáticos
```

## Paquetes (npm workspaces)

| Módulo | Paquete | Contenido |
|---|---|---|
| NexFoundation | `@nexfluid/foundation` | Tokens TS (fuente única) → `tokens.css`; temas, direcciones, familias geométricas, materiales, tipografía, movimiento, iconos. Compatibilidad opcional en `compat/nextudio.css` |
| NexFluid | `@nexfluid/core` | Resortes analíticos, viscosidad exacta, presets medidos, reloj compartido, geometría orgánica, membranas y gotas líquidas |
| NexComponents | `@nexfluid/components` | Contrato sin framework: `styles.css` (`nx-*`, `data-nx-*`) y comportamiento puro |
| NexBridge + NexWidgets | `@nexfluid/react` (`.`, `./markdown`, `./widgets`, `./motion`) | Componentes React 19 tipados y SSR-seguros |
| NexDocs | `apps/docs` | Documentación; consume sólo los `exports` públicos |

## Componentes

`NexSurface` (membrana), `NexButton`, `NexIconButton`, `NexSegmented`, `NexBadge`, `NexCard` (con expansión a panel), `NexPanel`, `NexTabs`, `NexNav`, `NexFrame` (+ `NexFrameRegion`), `NexCodeBlock`, `NexMarkdown`, `NexIcon`, `NexProvider`; widgets `NexMarkdownWidget`, `NexPropertiesWidget`, `NexInspectorWidget`, `NexExplorerWidget`, `NexPreviewWidget`; motion `FluidBlob`.

## Uso mínimo

```tsx
import '@nexfluid/foundation/tokens.css';
import '@nexfluid/components/styles.css';
import { NexProvider, NexCard, NexTabs, NexTab } from '@nexfluid/react';

<NexProvider theme="editorial-light" direction="native" motion="fluid">
  <NexCard interactive expansion={<Detail />}>
    <NexCard.Eyebrow>Proyecto</NexCard.Eyebrow>
    <NexCard.Title>Colas que esperan menos</NexCard.Title>
  </NexCard>
</NexProvider>;
```

## Documentación

* [docs/DISENO.md](docs/DISENO.md) — gramática, direcciones, decisiones y limitaciones.
* [docs/TOKENS.md](docs/TOKENS.md) y [docs/MEDICIONES.md](docs/MEDICIONES.md) — presets del motor y mediciones (fase 1).
