import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { NexCodeBlock, NexFrameRegion, NexTab, NexTabs, NexTabsList, NexTabsPanel } from '@nexfluid/react';
import { replaceTab } from '../router.ts';
import { ControlPanel, importLine, initialValues, KeyboardTable, LiveExample, PageHeader, PropsTable, Section, Stage, Status, type Control, type PropRow, type Values } from './kit.tsx';

export interface ExampleDef {
  title: string;
  description?: ReactNode;
  Component: ComponentType;
  source: string;
}

export interface ComponentDoc {
  path: string;
  name: string;
  eyebrow: string;
  summary: ReactNode;
  status: 'piloto' | 'laboratorio';
  imports: ReadonlyArray<{ names: readonly string[]; from: string }>;
  /** Componente o patrón de Nextudio cuya intención recoge. */
  origin: ReactNode;
  controls: readonly Control[];
  render: (v: Values) => ReactNode;
  code: (v: Values) => string;
  /** Si la vista previa necesita todo el ancho (layouts). */
  wide?: boolean;
  /** Demostraciones adicionales en la vista previa (antes de las variantes). */
  showcases?: ReadonlyArray<{ title: string; lead?: ReactNode; render: () => ReactNode }>;
  variants?: () => ReactNode;
  states?: () => ReactNode;
  api: ReadonlyArray<{ component: string; rows: readonly PropRow[] }>;
  examples?: readonly ExampleDef[];
  keyboard?: ReadonlyArray<readonly [string, string]>;
  a11y: readonly ReactNode[];
  /** Dependencias, estilos o proveedores que necesita además de los estilos base. */
  requires?: readonly ReactNode[];
}

const TABS = [
  ['preview', 'Vista previa'],
  ['code', 'Código'],
  ['api', 'API'],
  ['examples', 'Ejemplos'],
  ['a11y', 'Accesibilidad'],
] as const;

export function ComponentPage({ doc, tab }: { doc: ComponentDoc; tab: string | null }) {
  const [values, setValues] = useState<Values>(() => initialValues(doc.controls));
  const [active, setActive] = useState(() => (TABS.some(([id]) => id === tab) ? tab! : 'preview'));
  // Un enlace a otra pestaña de la misma página (#/…?tab=api) también la cambia.
  useEffect(() => {
    if (tab && TABS.some(([id]) => id === tab)) setActive(tab);
  }, [tab]);
  const usage = doc.code(values);
  const imports = doc.imports.map((i) => importLine(i.names, i.from)).join('\n');

  return (
    <article className="doc-page">
      <PageHeader
        eyebrow={doc.eyebrow}
        title={doc.name}
        lead={doc.summary}
        meta={
          <>
            <Status value={doc.status} />
            <code className="doc-import">{doc.imports[0]!.from}</code>
            <span className="doc-muted">Recoge: {doc.origin}</span>
          </>
        }
      />
      {doc.controls.length > 0 && (
        <NexFrameRegion region="inspector">
          <ControlPanel
            controls={doc.controls}
            values={values}
            onChange={(name, value) => setValues((v) => ({ ...v, [name]: value }))}
            onReset={() => setValues(initialValues(doc.controls))}
          />
        </NexFrameRegion>
      )}
      <NexTabs value={active} onValueChange={(t) => { setActive(t); replaceTab(doc.path, t); }} className="doc-page-tabs">
        <NexTabsList overflow="wrap" aria-label={`Documentación de ${doc.name}`}>
          {TABS.map(([id, label]) => <NexTab key={id} value={id}>{label}</NexTab>)}
        </NexTabsList>

        <NexTabsPanel value="preview">
          <h2 className="nx-visually-hidden">Vista previa</h2>
          <Stage label={`Vista previa de ${doc.name}`} padded={!doc.wide}>{doc.render(values)}</Stage>
          {doc.controls.length > 0 && <p className="doc-hint">Cambia las propiedades en el panel <strong>Propiedades</strong>; la pestaña Código se actualiza con ellas.</p>}
          {doc.showcases?.map((x) => <Section key={x.title} title={x.title} lead={x.lead}>{x.render()}</Section>)}
          {doc.variants && <Section title="Variantes">{doc.variants()}</Section>}
          {doc.states && <Section title="Estados">{doc.states()}</Section>}
        </NexTabsPanel>

        <NexTabsPanel value="code">
          <Section title="Importar" lead="Componentes y estilos desde las entradas públicas de los paquetes.">
            <NexCodeBlock language="tsx" title="imports.tsx" code={`${imports}\n\n// Una vez, en la raíz de la aplicación:\nimport '@nexfluid/foundation/tokens.css';\nimport '@nexfluid/components/styles.css';`} />
          </Section>
          <Section title="Uso con las propiedades actuales">
            <NexCodeBlock language="tsx" title={`${doc.name}.tsx`} code={usage} showLineNumbers />
          </Section>
          {doc.requires && (
            <Section title="Requisitos">
              <ul className="doc-list">{doc.requires.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </Section>
          )}
        </NexTabsPanel>

        <NexTabsPanel value="api">
          {doc.api.map((a) => <PropsTable key={a.component} component={a.component} rows={a.rows} />)}
        </NexTabsPanel>

        <NexTabsPanel value="examples">
          <h2 className="nx-visually-hidden">Ejemplos</h2>
          {doc.examples?.length ? (
            doc.examples.map((e) => (
              <LiveExample key={e.title} title={e.title} description={e.description} source={e.source}>
                <e.Component />
              </LiveExample>
            ))
          ) : (
            <p className="doc-muted">Sin ejemplos adicionales.</p>
          )}
        </NexTabsPanel>

        <NexTabsPanel value="a11y">
          {doc.keyboard && <Section title="Teclado"><KeyboardTable rows={doc.keyboard} /></Section>}
          <Section title="Comportamiento accesible">
            <ul className="doc-list">{doc.a11y.map((n, i) => <li key={i}>{n}</li>)}</ul>
          </Section>
        </NexTabsPanel>
      </NexTabs>
    </article>
  );
}
