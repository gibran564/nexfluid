import { useState } from 'react';
import { NexBadge, NexButton, NexCard, NexCodeBlock, NexFrame, NexIcon, NexIconButton, NexSegmented, NexTab, NexTabs } from '@nexfluid/react';
import { NexMarkdown } from '@nexfluid/react/markdown';
import { NexExplorerWidget, NexInspectorWidget, NexPreviewWidget } from '@nexfluid/react/widgets';
import { FluidBlob } from '@nexfluid/react/motion';
import { PageHeader } from '../docs/kit.tsx';

const FILES = {
  'enunciado.md': { language: 'markdown', size: '1.2 KB', code: `# Colas que esperan menos\n\nModela una cola **M/M/1** con λ = 0.5 y μ = 0.75.\n\n1. Calcula la espera media teórica.\n2. Simula 1 000 clientes.\n3. Explica la diferencia.\n\n> [!TIP]\n> La fórmula de Little relaciona espera, llegadas y longitud de la cola.\n\n| Métrica | Teórica | Simulada |\n|---|---|---|\n| Espera (min) | 4.0 | — |` },
  'colas.py': { language: 'python', size: '0.6 KB', code: `import random\n\ndef espera_media(lam: float, mu: float) -> float:\n    """Espera media en cola de un sistema M/M/1."""\n    return lam / (mu * (mu - lam))\n\ndef simula(n: int, lam: float, mu: float) -> float:\n    t = salida = total = 0.0\n    for _ in range(n):\n        t += random.expovariate(lam)\n        inicio = max(t, salida)\n        total += inicio - t\n        salida = inicio + random.expovariate(mu)\n    return total / n\n\nprint(espera_media(0.5, 0.75), simula(1000, 0.5, 0.75))` },
  'llegadas.csv': { language: 'plaintext', size: '14 KB', code: `cliente,llegada,servicio\n1,0.00,1.21\n2,1.84,0.96\n3,2.10,2.40` },
} as const;
type FileName = keyof typeof FILES;

/**
 * Nex Composition Lab: un espacio de trabajo hecho sólo con componentes públicos.
 * NexTabs envuelve el marco: la lista vive en la membrana superior y los paneles en el lienzo.
 */
export function CompositionLabPage() {
  const [file, setFile] = useState<FileName>('enunciado.md');
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [view, setView] = useState('document');
  const [layout, setLayout] = useState<'split' | 'focus'>('split');

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setOutput('$ python colas.py\n4.0 4.18\n\nProceso terminado en 1.4 s');
    }, 1200);
  };

  return (
    <article className="doc-page doc-page--wide">
      <PageHeader
        eyebrow="Patrones · composición"
        title="Nex Composition Lab"
        lead="Un espacio de trabajo completo: NexFrame con disposición dividida o de foco, explorador en árbol, pestañas líquidas, tarjetas que se amplían a panel, Markdown con avisos, código, vista previa por dispositivo e inspector plegable. Ninguna pieza es una copia: todo se importa de @nexfluid/*."
      />
      <h2 className="nx-visually-hidden">Espacio de trabajo</h2>
      <NexTabs value={view} onValueChange={setView}>
        <NexFrame
          height={760}
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
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
              Práctica 3 · Colas <NexBadge tone={output ? 'success' : 'neutral'} dot density="compact">{output ? 'Ejecutado' : 'Borrador'}</NexBadge>
            </span>
          }
          actions={
            <>
              <NexSegmented aria-label="Disposición" density="compact" value={layout} onValueChange={(v) => setLayout(v as 'split' | 'focus')} options={[{ value: 'split', label: 'Dividido' }, { value: 'focus', label: 'Foco' }]} />
              <NexIconButton label="Compartir" icon={<NexIcon name="external" />} density="compact" />
              <NexButton appearance="filled" density="compact" loading={running} loadingLabel="Ejecutando" onClick={run} iconStart={<NexIcon name="play" />}>Ejecutar</NexButton>
            </>
          }
          tools={
            <NexTabs.List aria-label="Vista del trabajo">
              <NexTab value="document" icon={<NexIcon name="file" />}>Documento</NexTab>
              <NexTab value="code" icon={<NexIcon name="code" />}>Código</NexTab>
              <NexTab value="preview" icon={<NexIcon name="eye" />}>Vista previa</NexTab>
              <NexTab value="results" icon={<NexIcon name="grid" />} textValue="Resultados" trailing={output ? <NexBadge density="compact" tone="accent">1</NexBadge> : undefined}>Resultados</NexTab>
            </NexTabs.List>
          }
          explorer={
            <div style={{ padding: 6 }}>
              <NexExplorerWidget
                aria-label="Archivos del proyecto"
                selected={file}
                onSelect={(id) => { setFile(id as FileName); setView(id === 'enunciado.md' ? 'document' : 'code'); }}
                defaultExpanded={['practica']}
                nodes={[{ id: 'practica', label: 'práctica-3', icon: <NexIcon name="folder" />, children: (Object.keys(FILES) as FileName[]).map((f) => ({ id: f, label: f, icon: <NexIcon name={f.endsWith('.md') ? 'file' : f.endsWith('.py') ? 'code' : 'grid'} /> })) }]}
              />
            </div>
          }
          inspector={
            <div style={{ padding: 8 }}>
              <NexInspectorWidget
                sections={[
                  { id: 'file', title: 'Archivo', groups: [{ items: [{ label: 'Nombre', value: file }, { label: 'Tipo', value: FILES[file].language }, { label: 'Tamaño', value: FILES[file].size }] }] },
                  { id: 'env', title: 'Entorno', groups: [{ items: [{ label: 'Runtime', value: 'Python 3.12' }, { label: 'Estado', value: <NexBadge tone={running ? 'warning' : 'success'} dot density="compact">{running ? 'Ocupado' : 'Listo'}</NexBadge> }] }] },
                  { id: 'act', title: 'Actividad', defaultOpen: false, content: <p className="nx-type-small" style={{ margin: 0 }}>Entrega el 4 de noviembre · 3 de 5 compañeros han empezado.</p> },
                ]}
              />
            </div>
          }
          inspectorResizable
          bottom={output ? <NexCodeBlock code={output} language="shell" title="Consola" copyable={false} /> : undefined}
          bottomLabel="Consola"
        >
          <div className="doc-lab-canvas">
            <NexTabs.Panel value="document">
              <div className="doc-lab-doc">
                <NexMarkdown source={FILES['enunciado.md'].code} measure headingOffset={2} />
                <div className="doc-card-grid">
                  {[
                    ['Paso 1', 'Espera teórica', 'Fórmula de Little sobre M/M/1.', 'Con λ = 0.5 y μ = 0.75 la espera media en cola es 4 minutos.'],
                    ['Paso 2', 'Simulación', 'Mil clientes con llegadas exponenciales.', 'La simulación converge a ±5 % del valor teórico.'],
                    ['Paso 3', 'Conclusión', 'Compara y explica la diferencia.', 'Las primeras llegadas, con la cola vacía, sesgan la media.'],
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
            </NexTabs.Panel>
            <NexTabs.Panel value="code">
              <NexCodeBlock code={FILES[file].code} language={FILES[file].language} title={file} showLineNumbers highlightLines={file === 'colas.py' ? [3, 4, 5] : undefined} />
            </NexTabs.Panel>
            <NexTabs.Panel value="preview">
              <NexPreviewWidget title="Informe publicado">
                <div style={{ padding: 24 }}><NexMarkdown source={'# Colas que esperan menos\n\nLa espera media teórica es **4.0 min**; la simulada, **4.18 min**.'} headingOffset={2} /></div>
              </NexPreviewWidget>
            </NexTabs.Panel>
            <NexTabs.Panel value="results">
              {output ? (
                <div className="doc-card-grid">
                  <NexCard appearance="editorial"><NexCard.Eyebrow>Teórica</NexCard.Eyebrow><NexCard.Title>4.0 min</NexCard.Title></NexCard>
                  <NexCard appearance="editorial"><NexCard.Eyebrow>Simulada</NexCard.Eyebrow><NexCard.Title>4.18 min</NexCard.Title><NexCard.Description>+4.5 % por las primeras llegadas.</NexCard.Description></NexCard>
                </div>
              ) : (
                <NexCard appearance="filled">
                  <NexCard.Title>Aún no hay resultados</NexCard.Title>
                  <NexCard.Description>Ejecuta el proyecto para ver la comparación.</NexCard.Description>
                  <NexCard.Footer><NexButton onClick={run} loading={running} iconStart={<NexIcon name="play" />}>Ejecutar ahora</NexButton></NexCard.Footer>
                </NexCard>
              )}
            </NexTabs.Panel>
          </div>
        </NexFrame>
      </NexTabs>
    </article>
  );
}
