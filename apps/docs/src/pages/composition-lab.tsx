import { useMemo, useState } from 'react';
import { NexBadge, NexButton, NexCard, NexFrame, NexIcon, NexPortal, NexPreviewBoundary, NexScroll, NexSegmented, NexTab, NexTabs } from '@nexfluid/react';
import { NexMarkdown } from '@nexfluid/react/markdown';
import { NexExplorerWidget, NexInspectorWidget, NexMarkdownEditor, NexPreviewWidget } from '@nexfluid/react/widgets';
import { NexSheets, cellKey, columnName, createSheet, createWorkbook, csvToSheet, type Workbook } from '@nexfluid/react/sheets';
import { FluidBlob } from '@nexfluid/react/motion';
import { PageHeader } from '../docs/kit.tsx';
import { REFERENCE_URL, SandboxWorkbench } from '../examples/web-practice.tsx';

const INITIAL = {
  'enunciado.md': `# Colas que esperan menos

Modela una cola **M/M/1** con $\\lambda = 0.5$ y $\\mu = 0.75$. La espera media en cola es

$$
W_q = \\frac{\\lambda}{\\mu(\\mu - \\lambda)}
$$

1. Calcula la espera media teórica.
2. Calcula la espera de cada cliente con los datos de \`llegadas.csv\`.
3. Explica la diferencia.

> [!TIP]
> La fórmula de Little relaciona espera, llegadas y longitud de la cola.

| Métrica | Teórica | Con datos |
|---|---|---|
| Espera (min) | 4.0 | ver Resultados |`,
  'informe.md': `# Informe

La espera media **teórica** es 4.0 min.

Con los datos de \`llegadas.csv\` (pestaña *Resultados*), la espera media sale de la última fila de la hoja.

- Las primeras llegadas encuentran la cola vacía.
- Edita las llegadas y mira cómo cambia la media.`,
  'colas.py': `import random

def espera_media(lam: float, mu: float) -> float:
    """Espera media en cola de un sistema M/M/1."""
    return lam / (mu * (mu - lam))

print(espera_media(0.5, 0.75))`,
  'llegadas.csv': `cliente,llegada,servicio
1,0.00,1.21
2,1.84,0.96
3,2.10,2.40
4,2.95,1.10
5,5.60,0.80
6,6.02,2.25
7,6.70,1.40
8,9.85,0.65
9,10.10,1.95
10,10.40,1.30`,
} as const;
type FileName = keyof typeof INITIAL;
const KIND: Record<FileName, { language: string; icon: 'file' | 'code' | 'grid' }> = {
  'enunciado.md': { language: 'markdown', icon: 'file' },
  'informe.md': { language: 'markdown', icon: 'file' },
  'colas.py': { language: 'python (texto)', icon: 'code' },
  'llegadas.csv': { language: 'csv', icon: 'grid' },
};
const DOC_SECTIONS = [
  { id: 'lab-enunciado', label: 'Enunciado' },
  { id: 'lab-pasos', label: 'Pasos' },
];

/**
 * La hoja de resultados: los datos de `llegadas.csv` + columnas con fórmulas
 * del motor de NexSheets (inicio = MAX(llegada; salida anterior), salida,
 * espera y su media). Es un cálculo real sobre lo que escribas; no se ejecuta
 * Python.
 */
function resultsWorkbook(csv: string): { workbook: Workbook; error: string | null } {
  try {
    const { sheet } = csvToSheet(csv, { headers: true });
    const rows = sheet.rows;
    const cells = { ...sheet.cells };
    const put = (r: number, c: number, input: string) => { cells[cellKey(r, c)] = { input }; };
    put(0, 3, 'inicio'); put(0, 4, 'salida'); put(0, 5, 'espera');
    for (let r = 1; r < rows; r++) {
      const n = r + 1;
      put(r, 3, r === 1 ? `=B${n}` : `=MAX(B${n};E${n - 1})`);
      put(r, 4, `=D${n}+C${n}`);
      put(r, 5, `=REDONDEAR(D${n}-B${n};2)`);
    }
    put(rows, 0, 'Espera media');
    put(rows, 5, `=REDONDEAR(PROMEDIO(F2:F${rows});2)`);
    put(rows + 1, 0, 'Máxima');
    put(rows + 1, 5, `=MAX(F2:F${rows})`);
    const result = createSheet('Resultados', { rows: rows + 6, columns: 8, cells, headers: ['cliente', 'llegada', 'servicio', 'inicio', 'salida', 'espera'] }, 'lab-results');
    result.columnWidths = { 0: 120 };
    return { workbook: createWorkbook([result]), error: null };
  } catch (e) {
    return { workbook: createWorkbook([createSheet('Resultados', {}, 'lab-results')]), error: e instanceof Error ? e.message : 'CSV no válido' };
  }
}

const bytes = (text: string) => new TextEncoder().encode(text).length;
const size = (text: string) => (bytes(text) < 1024 ? `${bytes(text)} B` : `${(bytes(text) / 1024).toFixed(1)} KB`);

/**
 * Nex Composition Lab: un espacio de trabajo hecho sólo con componentes públicos.
 * NexTabs envuelve el marco: la lista vive en la membrana superior y los paneles en el lienzo.
 *
 * Todo es editable de verdad: los archivos son texto, los .md se pintan con
 * NexMarkdown en cada pulsación y los resultados son una hoja NexSheets que
 * calcula con los datos del CSV. No hay ejecución simulada.
 *
 * Integridad espacial: NexPreviewBoundary mide el ancho real de la demostración y
 * NexFrame pliega sus regiones antes de comprimir el lienzo por debajo de
 * `canvasMinWidth` (inspector → hoja lateral, explorador → riel; en estrecho, una
 * columna con hoja inferior). Cada panel tiene una sola área de desplazamiento.
 */
export function CompositionLabPage() {
  const [files, setFiles] = useState<Record<FileName, string>>({ ...INITIAL });
  const [file, setFile] = useState<FileName>('enunciado.md');
  const [view, setView] = useState('document');
  const [layout, setLayout] = useState<'split' | 'focus'>('split');
  const results = useMemo(() => resultsWorkbook(files['llegadas.csv']), [files['llegadas.csv']]); // eslint-disable-line react-hooks/exhaustive-deps
  const edited = (Object.keys(INITIAL) as FileName[]).filter((f) => files[f] !== INITIAL[f]);
  const write = (name: FileName, text: string) => setFiles((old) => ({ ...old, [name]: text }));
  const text = files[file];
  const lines = text.split('\n').length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <article className="doc-page doc-page--wide">
      <PageHeader
        eyebrow="Patrones · composición"
        title="Nex Composition Lab"
        lead="Un espacio de trabajo completo y editable: NexFrame con disposición dividida o de foco, explorador, pestañas líquidas, Markdown que se pinta mientras escribes, una hoja NexSheets que calcula con tus datos, vista previa por dispositivo e inspector. Ninguna pieza es una copia: todo se importa de @nexfluid/*."
      />
      <h2 className="nx-visually-hidden">Espacio de trabajo</h2>
      <NexPreviewBoundary compactBelow={1000} constrainedBelow={620}>
      {({ space }) => (
      <NexTabs value={view} onValueChange={setView}>
        <NexFrame
          nested
          height={space === 'constrained' ? 680 : 760}
          canvasMinWidth={440}
          canvasAs="div"
          layout={layout}
          canvasLabel="Lienzo del espacio de trabajo"
          identity={
            <span className="doc-lab-identity">
              <FluidBlob motion="calm" seed={5} interactive={false} base={{ kind: 'superellipse', exponent: 3.2 }} style={{ width: 22, height: 22 }} />
              NexStudio
            </span>
          }
          heading={
            <span style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 10px' }}>
              <span>Práctica 3 · Colas</span> <NexBadge tone={edited.length ? 'accent' : 'neutral'} dot density="compact">{edited.length ? `${edited.length} editado${edited.length > 1 ? 's' : ''}` : 'Sin cambios'}</NexBadge>
            </span>
          }
          actions={
            <>
              <NexSegmented aria-label="Disposición" density="compact" value={layout} onValueChange={(v) => setLayout(v as 'split' | 'focus')} options={[{ value: 'split', label: 'Dividido' }, { value: 'focus', label: 'Foco' }]} />
              <NexButton appearance="ghost" density="compact" disabled={!edited.length} onClick={() => setFiles({ ...INITIAL })}>Restablecer</NexButton>
            </>
          }
          tools={
            <NexTabs.List aria-label="Vista del trabajo">
              <NexTab value="document" icon={<NexIcon name="file" />}>Documento</NexTab>
              <NexTab value="code" icon={<NexIcon name="code" />}>Editor</NexTab>
              <NexTab value="preview" icon={<NexIcon name="eye" />}>Vista previa</NexTab>
              <NexTab value="results" icon={<NexIcon name="grid" />}>Resultados</NexTab>
              <NexTab value="web" icon={<NexIcon name="globe" />}>Práctica web</NexTab>
            </NexTabs.List>
          }
          explorer={
            <div style={{ padding: 6 }}>
              <NexExplorerWidget
                aria-label="Archivos del proyecto"
                selected={file}
                onSelect={(id) => { if (id in INITIAL) { setFile(id as FileName); setView('code'); } }}
                defaultExpanded={['practica']}
                nodes={[{ id: 'practica', label: 'práctica-3', icon: <NexIcon name="folder" />, children: (Object.keys(INITIAL) as FileName[]).map((f) => ({ id: f, label: edited.includes(f) ? `${f} •` : f, icon: <NexIcon name={KIND[f].icon} /> })) }]}
              />
            </div>
          }
          inspector={
            <div style={{ padding: 8 }}>
              <NexInspectorWidget
                sections={[
                  { id: 'file', title: 'Archivo', groups: [{ items: [
                    { label: 'Nombre', value: file }, { label: 'Tipo', value: KIND[file].language }, { label: 'Tamaño', value: size(text) },
                    { label: 'Líneas', value: String(lines) }, { label: 'Palabras', value: String(words) },
                    { label: 'Estado', value: <NexBadge tone={edited.includes(file) ? 'accent' : 'success'} dot density="compact">{edited.includes(file) ? 'Editado' : 'Original'}</NexBadge> },
                  ] }] },
                  { id: 'data', title: 'Datos', groups: [{ items: [
                    { label: 'Clientes', value: String(Math.max(0, files['llegadas.csv'].trim().split('\n').length - 1)) },
                    { label: 'Hoja', value: results.error ? <NexBadge tone="danger" density="compact">CSV no válido</NexBadge> : 'Resultados' },
                  ] }] },
                  { id: 'act', title: 'Ayuda', defaultOpen: false, content: <p className="nx-type-small" style={{ margin: 0 }}>Elige un archivo en el explorador para editarlo. Los .md se pintan en Documento y Vista previa; llegadas.csv alimenta la hoja de Resultados. colas.py es texto: no se ejecuta.</p> },
                ]}
              />
            </div>
          }
          inspectorResizable
        >
          <div className="doc-lab-canvas">
            <NexTabs.Panel value="document" className="doc-lab-panel">
              <NexScroll.Area variant="editorial" label="Enunciado de la práctica" sections={DOC_SECTIONS} className="doc-lab-scroll">
              <div className="doc-lab-doc">
                <div id="lab-enunciado"><NexMarkdown source={files['enunciado.md']} measure headingOffset={2} /></div>
                <h3 id="lab-pasos" className="nx-type-heading" style={{ margin: 0 }}>Pasos</h3>
                <div className="doc-card-grid">
                  {[
                    ['Paso 1', 'Espera teórica', 'Fórmula de Little sobre M/M/1.', 'Con λ = 0.5 y μ = 0.75 la espera media en cola es 4 minutos.'],
                    ['Paso 2', 'Espera con datos', 'Una hoja que calcula cliente a cliente.', 'Resultados calcula inicio, salida y espera de cada cliente con fórmulas.'],
                    ['Paso 3', 'Conclusión', 'Compara y explica la diferencia.', 'Escríbela en informe.md: la vista previa la pinta al instante.'],
                  ].map(([e, t, d, x]) => (
                    <NexCard key={t} interactive density="compact" expansion={<p className="nx-type-subhead" style={{ margin: 0 }}>{x}</p>}>
                      <NexCard.Header>
                        <NexCard.Eyebrow>{e}</NexCard.Eyebrow>
                        <NexCard.Title>{t}</NexCard.Title>
                        <NexCard.Description>{d}</NexCard.Description>
                      </NexCard.Header>
                    </NexCard>
                  ))}
                </div>
              </div>
              </NexScroll.Area>
            </NexTabs.Panel>
            <NexTabs.Panel value="code" className="doc-lab-panel">
              <NexScroll.Area variant="fluid" label={`Editor de ${file}`} className="doc-lab-scroll">
                <div className="doc-lab-pad">
                  <NexMarkdownEditor
                    key={file}
                    label={file}
                    value={text}
                    onChange={(t) => write(file, t)}
                    layout={file.endsWith('.md') ? 'split' : 'editor'}
                    ink={file.endsWith('.md')}
                    rows={16}
                    markdown={{ headingOffset: 2 }}
                    aside={file === 'llegadas.csv' ? (
                      <p className="doc-hint" style={{ margin: 0 }}>{results.error ? `No se pudo leer: ${results.error}` : `Columnas ${['A', 'B', 'C'].map((c, i) => `${c} ${['cliente', 'llegada', 'servicio'][i]}`).join(' · ')}. Resultados añade ${['D', 'E', 'F'].join(', ')} con fórmulas (hasta ${columnName(5)}).`}</p>
                    ) : file === 'colas.py' ? <p className="doc-hint" style={{ margin: 0 }}>Texto plano: el laboratorio no ejecuta código.</p> : undefined}
                  />
                </div>
              </NexScroll.Area>
            </NexTabs.Panel>
            <NexTabs.Panel value="preview" className="doc-lab-panel">
              <NexScroll.Area variant="fluid" label="Vista previa del informe" className="doc-lab-scroll">
                <div className="doc-lab-pad">
                  <NexPreviewWidget title="informe.md publicado" actions={<NexButton appearance="ghost" density="compact" onClick={() => { setFile('informe.md'); setView('code'); }}>Editar</NexButton>}>
                    <div style={{ padding: 24 }}><NexMarkdown source={files['informe.md']} headingOffset={2} /></div>
                  </NexPreviewWidget>
                </div>
              </NexScroll.Area>
            </NexTabs.Panel>
            <NexTabs.Panel value="web" className="doc-lab-panel">
              <NexScroll.Area variant="fluid" label="Práctica web: referencia, código y resultado" className="doc-lab-scroll">
                <div className="doc-lab-pad doc-lab-web">
                  {/* La referencia es una pieza de la composición, no una capa encima de la práctica. */}
                  <NexPortal label="Referencia: cola M/M/1" mode="browser" defaultUrl={REFERENCE_URL} height={560} expandable={false} />
                  <SandboxWorkbench height={220} layout="stack" />
                </div>
              </NexScroll.Area>
            </NexTabs.Panel>
            <NexTabs.Panel value="results" className="doc-lab-panel doc-lab-pad">
              <NexSheets key={files['llegadas.csv']} defaultWorkbook={results.workbook} height="100%" tabs={false} toolbar={false} label="Resultados de la cola" />
            </NexTabs.Panel>
          </div>
        </NexFrame>
      </NexTabs>
      )}
      </NexPreviewBoundary>
    </article>
  );
}
