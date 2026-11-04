import { NexBadge, NexCard, NexCodeBlock } from '@eclipsis/react';
import { NexMarkdown } from '@eclipsis/react/markdown';
import { PageHeader, Section } from '../docs/kit.tsx';

export function InstallPage() {
  return (
    <article className="doc-page">
      <PageHeader eyebrow="Primeros pasos" title="Instalación" lead="Los paquetes están publicados en npm bajo el ámbito @eclipsis. Instala los que uses: react incluye como dependencias a foundation, core, components y sheets." />
      <Section title="1 · Instalar">
        <NexCodeBlock language="bash" title="terminal" code={`npm install @eclipsis/react @eclipsis/foundation @eclipsis/components\n\n# Fórmulas en Markdown (KaTeX): sus estilos, una vez\nnpm install katex`} />
        <p className="doc-hint">Sin React: <code>@eclipsis/core</code> (motor de movimiento), <code>@eclipsis/components</code> (clases y ayudantes) y <code>@eclipsis/sheets</code> (modelo de hojas de cálculo) funcionan solos.</p>
      </Section>
      <Section title="2 · Estilos (una vez, en la raíz)">
        <NexCodeBlock language="tsx" title="app/layout.tsx" code={`import '@eclipsis/foundation/tokens.css';   // tokens --nx-*, temas y densidades\nimport '@eclipsis/components/styles.css';  // clases nx-* de los componentes\nimport 'katex/dist/katex.min.css';         // sólo si usas fórmulas en NexMarkdown`} />
        <p className="doc-hint">Sin estilos globales: todo vive bajo clases <code>nx-</code> y propiedades <code>--nx-</code>. En Nextudio, el tema <code>nextudio</code> lee <code>--bg</code>, <code>--accent</code>… y sigue a NEX Origen o NEX Pulso automáticamente.</p>
      </Section>
      <Section title="3 · Proveedor (opcional) y componentes">
        <NexCodeBlock language="tsx" title="page.tsx" showLineNumbers code={`import { NexProvider, NexCard, NexTabs, NexTab, NexFrame } from '@eclipsis/react';\nimport { NexMarkdown } from '@eclipsis/react/markdown';\n\nexport default function Page() {\n  return (\n    <NexProvider theme="nextudio" motion="subtle">\n      <NexCard appearance="editorial">\n        <NexCard.Title>Proyecto</NexCard.Title>\n        <NexMarkdown source={readme} />\n      </NexCard>\n    </NexProvider>\n  );\n}`} />
      </Section>
      <Section title="Next.js (App Router)">
        <NexCodeBlock language="ts" title="next.config.ts" code={`const config = {\n  // Sólo si se consume el código fuente; con dist/ no hace falta.\n  transpilePackages: ['@eclipsis/react', '@eclipsis/components', '@eclipsis/core', '@eclipsis/foundation'],\n};`} />
        <ul className="doc-list">
          <li>Los módulos interactivos llevan <code>'use client'</code> (se conserva en <code>dist</code>).</li>
          <li>En Server Components usa los nombres planos (<code>NexCardTitle</code>, <code>NexTabsList</code>…): no se puede acceder con punto (<code>NexCard.Title</code>) a un módulo de cliente desde el servidor.</li>
          <li>SSR e hidratación probados sin discrepancias (<code>packages/react/tests/ssr.test.tsx</code>). <code>NexFrameRegion</code> pinta su contenido en su sitio hasta hidratar.</li>
        </ul>
      </Section>
      <Section title="Paquetes">
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead><tr><th scope="col">Paquete</th><th scope="col">Entradas</th><th scope="col">Dependencias</th></tr></thead>
            <tbody>
              <tr><td><code>@eclipsis/foundation</code></td><td><code>.</code>, <code>./tokens.css</code></td><td>ninguna</td></tr>
              <tr><td><code>@eclipsis/core</code></td><td><code>.</code></td><td>ninguna</td></tr>
              <tr><td><code>@eclipsis/components</code></td><td><code>.</code>, <code>./styles.css</code></td><td>foundation</td></tr>
              <tr><td><code>@eclipsis/sheets</code></td><td><code>.</code></td><td>ninguna</td></tr>
              <tr><td><code>@eclipsis/react</code></td><td><code>.</code>, <code>./markdown</code>, <code>./widgets</code>, <code>./motion</code>, <code>./sheets</code></td><td>react ^19 (peer), react-markdown + remark-gfm + remark-math + rehype-katex (sólo <code>./markdown</code>)</td></tr>
            </tbody>
          </table>
        </div>
      </Section>
    </article>
  );
}

export function ArchitecturePage() {
  return (
    <article className="doc-page">
      <PageHeader eyebrow="Primeros pasos" title="Arquitectura" lead="Seis responsabilidades, dependencias en un solo sentido. Las reglas se comprueban con pruebas (capas, ciclos y entradas públicas)." />
      <figure className="doc-diagram" aria-labelledby="arch-cap">
        <svg viewBox="0 0 760 300" role="img" aria-labelledby="arch-cap">
          {[
            [20, 24, 'NexDocs', 'apps/docs · consumidor'],
            [270, 24, 'Nextudio', 'consumidor (propuesto)'],
            [520, 24, 'Otras apps Nex', 'consumidor'],
            [145, 128, 'NexBridge', '@eclipsis/react'],
            [395, 128, 'NexWidgets', '@eclipsis/react/widgets'],
            [20, 228, 'NexFoundation', '@eclipsis/foundation'],
            [270, 228, 'NexComponents', '@eclipsis/components'],
            [520, 228, 'NexFluid', '@eclipsis/core'],
          ].map(([x, y, t, s]) => (
            <g key={t as string} transform={`translate(${x} ${y})`}>
              <rect width="220" height="56" rx="6" className="doc-diagram-box" />
              <text x="14" y="24" className="doc-diagram-title">{t}</text>
              <text x="14" y="42" className="doc-diagram-sub">{s}</text>
            </g>
          ))}
          {[[130, 80, 255, 128], [380, 80, 255, 128], [380, 80, 505, 128], [255, 184, 130, 228], [255, 184, 380, 228], [255, 184, 630, 228], [505, 184, 380, 228], [380, 256, 240, 256]].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="doc-diagram-line" markerEnd="url(#arrow)" />
          ))}
          <defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" className="doc-diagram-arrow" /></marker></defs>
        </svg>
        <figcaption id="arch-cap" className="doc-hint">Las flechas van del consumidor a su dependencia. NexFluid (motor) no conoce componentes ni frameworks; NexDocs no es dependencia de nada.</figcaption>
      </figure>
      <NexMarkdown measure headingOffset={1} source={`# Responsabilidades

- **NexFoundation** — tokens semánticos (TS como fuente única, CSS generado y comprobado), seis temas de color, cuatro direcciones (A, B, C y Native), cinco familias geométricas, materiales, escala editorial, densidades, breakpoints, familias de movimiento e iconos. La compatibilidad con Nextudio vive en una hoja aparte y opcional.
- **NexFluid** — resortes analíticos, viscosidad exacta, presets medidos, reloj compartido que se duerme, geometría orgánica con volumen constante. Sin DOM salvo el reloj y FluidBlob.
- **NexComponents** — el contrato sin framework: clases \`nx-*\`, atributos \`data-nx-*\` y comportamiento puro (teclado, URLs seguras, resaltado). Cualquier framework puede emitir el mismo HTML.
- **NexBridge** — \`@eclipsis/react\`: componentes tipados para React 19, SSR-seguros, con movimiento físico opcional.
- **NexWidgets** — composiciones (\`/widgets\`) hechas sólo con componentes públicos.
- **NexDocs** — esta aplicación; importa por \`exports\` como cualquier consumidor y en build usa los \`dist\`.

# Convenciones

| Convención | Regla |
|---|---|
| Prefijos | Clases \`nx-\`, variables \`--nx-\`, atributos \`data-nx-*\`. |
| Variantes | \`appearance\`, \`density\`, \`motion\`, \`tone\`, siempre con los mismos valores y sólo donde tienen sentido. |
| Movimiento | \`none\` · \`subtle\` (CSS, 120–200 ms) · \`fluid\` / \`elastic\` (resortes). Teclado y reducido: inmediato. |
| Composición | \`NexCard.Title\` y también \`NexCardTitle\` (Server Components). |
| Estado | Controlado (\`value\` + \`onValueChange\`) o no controlado (\`defaultValue\`). |
`} />
    </article>
  );
}

const ROADMAP: Record<string, ReadonlyArray<readonly [string, 'piloto' | 'propuesto' | 'laboratorio']>> = {
  Actions: [['NexButton', 'piloto'], ['NexActionButton', 'piloto'], ['NexIconButton', 'piloto'], ['NexSegmented', 'piloto'], ['NexToggle', 'propuesto'], ['NexSwitch', 'propuesto']],
  Surfaces: [['NexCard', 'piloto'], ['NexBadge', 'piloto'], ['NexPanel', 'piloto'], ['NexSurface', 'piloto'], ['NexDivider', 'propuesto']],
  Navigation: [['NexTabs / NexTab', 'piloto'], ['NexNav', 'piloto'], ['NexBreadcrumbs', 'propuesto'], ['NexToolbar', 'propuesto'], ['NexDock', 'piloto']],
  Layout: [['NexFrame', 'piloto'], ['NexContainer', 'propuesto'], ['NexGrid', 'propuesto'], ['NexStack', 'propuesto'], ['NexSplitView', 'propuesto'], ['NexResizablePanel', 'propuesto']],
  Inputs: [['NexInput', 'piloto'], ['NexSelect', 'piloto'], ['NexCheckbox', 'piloto'], ['NexSlider', 'propuesto'], ['NexSearch', 'propuesto']],
  Content: [['NexMarkdown', 'piloto'], ['NexCodeBlock', 'piloto'], ['NexTable', 'propuesto'], ['NexEmptyState', 'propuesto'], ['NexSkeleton', 'propuesto'], ['NexTooltip', 'propuesto']],
  Widgets: [['NexMarkdownWidget', 'piloto'], ['NexPropertiesWidget', 'piloto'], ['NexFileWidget', 'propuesto'], ['NexPreviewWidget', 'piloto'], ['NexExplorerWidget', 'piloto'], ['NexStatusWidget', 'propuesto'], ['NexInspectorWidget', 'piloto']],
  Motion: [['FluidBlob', 'laboratorio'], ['NexMorph (transformación continua)', 'piloto'], ['FluidReveal', 'propuesto'], ['FluidPresence', 'propuesto'], ['Metaballs (cuello dock → panel)', 'laboratorio']],
};

export function RoadmapPage() {
  const total = Object.values(ROADMAP).flat();
  const done = total.filter(([, s]) => s !== 'propuesto').length;
  return (
    <article className="doc-page">
      <PageHeader eyebrow="Primeros pasos" title="Catálogo y hoja de ruta" lead={`${done} de ${total.length} piezas del catálogo están implementadas. Las propuestas no tienen página de componente: no se documenta como si funcionara lo que aún no existe.`} />
      <div className="doc-roadmap">
        {Object.entries(ROADMAP).map(([group, items]) => (
          <NexCard key={group} appearance="ghost" motion="none" as="section" aria-label={group}>
            <NexCard.Eyebrow>{group}</NexCard.Eyebrow>
            <ul className="doc-roadmap-list">
              {items.map(([name, s]) => (
                <li key={name}><span>{name}</span>{s === 'propuesto' ? <NexBadge density="compact">Propuesto</NexBadge> : <NexBadge density="compact" tone={s === 'piloto' ? 'success' : 'accent'} dot>{s === 'piloto' ? 'Implementado' : 'Laboratorio'}</NexBadge>}</li>
              ))}
            </ul>
          </NexCard>
        ))}
      </div>
    </article>
  );
}
