import { useState } from 'react';
import { NexCodeBlock } from '@nexfluid/react';
import { ControlPanel, initialValues, LiveExample, PageHeader, Stage, type Values } from '../docs/kit.tsx';
import type { ComponentDoc } from '../docs/component-page.tsx';
import { example, type ExampleId } from '../examples/index.ts';
import { href } from '../router.ts';

const PATTERNS: ReadonlyArray<readonly [ExampleId, string, string]> = [
  ['project-card', 'Tarjeta de proyecto', 'ProjectCard de Nextudio con NexCard: enlace extendido, insignias y una acción.'],
  ['tab-navigation', 'Navegación por pestañas', 'NexBook, NexCode y Salidas sobre el mismo trabajo.'],
  ['inspector-layout', 'Layout con inspector', 'NexFrame con explorador, lienzo e inspector redimensionable.'],
  ['markdown-viewer', 'Visualizador Markdown', 'NexMarkdownWidget con vista previa, fuente y dividido.'],
  ['tools-panel', 'Panel de herramientas', 'Barra de acciones con carga, botones de icono y estado.'],
];

export function PatternsPage() {
  return (
    <article className="doc-page">
      <PageHeader
        eyebrow="Patrones"
        title="Patrones para Nextudio"
        lead={<>Composiciones aisladas que reproducen pantallas reales de Nextudio sin modificarlo. El código mostrado es el archivo que se ejecuta. La composición completa está en <a href={href('patrones/composition-lab')}>Nex Composition Lab</a>.</>}
      />
      {PATTERNS.map(([id, title, description]) => {
        const e = example(id);
        return (
          <LiveExample key={id} level={2} title={title} description={description} source={e.source}>
            <e.Component />
          </LiveExample>
        );
      })}
    </article>
  );
}

export function PlaygroundPage({ docs }: { docs: readonly ComponentDoc[] }) {
  const [selected, setSelected] = useState(docs[0]!.path);
  const doc = docs.find((d) => d.path === selected) ?? docs[0]!;
  return (
    <article className="doc-page doc-page--wide">
      <PageHeader eyebrow="Playground" title="Banco de componentes" lead="Elige un componente implementado, cambia sus propiedades y copia el código. Es el mismo componente que se importa de los paquetes." />
      <div className="doc-playground">
        <div className="doc-playground-side">
          <label className="doc-field" htmlFor="pg-component">
            <span>Componente</span>
          </label>
          <select id="pg-component" className="doc-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {docs.map((d) => <option key={d.path} value={d.path}>{d.name}</option>)}
          </select>
          <PlaygroundControls key={doc.path} doc={doc} />
        </div>
      </div>
      <p className="doc-hint">Documentación completa: <a href={href(doc.path)}>{doc.name}</a>.</p>
    </article>
  );
}

function PlaygroundControls({ doc }: { doc: ComponentDoc }) {
  const [values, setValues] = useState<Values>(() => initialValues(doc.controls));
  return (
    <div className="doc-playground-body">
      <ControlPanel controls={doc.controls} values={values} onChange={(n, v) => setValues((s) => ({ ...s, [n]: v }))} onReset={() => setValues(initialValues(doc.controls))} />
      <div className="doc-playground-main">
        <Stage label={`Vista previa de ${doc.name}`} padded={!doc.wide}>{doc.render(values)}</Stage>
        <NexCodeBlock language="tsx" title={`${doc.name}.tsx`} code={`import { ${doc.imports[0]!.names.join(', ')} } from '${doc.imports[0]!.from}';\n\n${doc.code(values)}`} showLineNumbers />
      </div>
    </div>
  );
}
