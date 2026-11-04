import { useState } from 'react';
import { NexButton, NexPreviewBoundary, NexScroll, type NexScrollSection, type NexScrollVariant } from '@eclipsis/react';
import { NexMarkdown, markdownOutline } from '@eclipsis/react/markdown';
import { NexMarkdownEditor } from '@eclipsis/react/widgets';
import type { ComponentDoc } from '../docs/component-page.tsx';
import { jsx, type Values } from '../docs/kit.tsx';
import { example } from '../examples/index.ts';

const VARIANTS = ['editorial', 'fluid', 'minimal', 'spatial'] as const;
const MOTIONS = ['none', 'subtle', 'fluid', 'elastic'] as const;
const DENSITIES = ['compact', 'comfortable', 'spacious'] as const;

/** Un documento de verdad: capítulos con texto, listas y citas de longitud distinta. */
const CHAPTERS: ReadonlyArray<NexScrollSection & { body: ReadonlyArray<string | readonly string[]> }> = [
  { id: 'ns-introduccion', label: 'Introducción', body: [
    'Desplazarse no es sólo moverse por una página: es orientarse. El carril de la derecha es el mapa del documento y el pulgar, la ventana que estás leyendo ahora mismo.',
    'Todo lo que ves en el carril sale del desplazamiento real del navegador. La rueda, el touchpad, el teclado y el dedo siguen siendo los de siempre.',
  ] },
  { id: 'ns-materia', label: 'Materia viva', body: [
    'En reposo, el carril es una línea discreta y el pulgar apenas se distingue del papel. Al moverte, el pulgar se ensancha y toma el color de acento.',
    'Con velocidad, el borde que avanza se adelanta y el posterior le sigue con resistencia viscosa. Al detenerte, la forma vuelve al equilibrio sin rebotes.',
    ['La deformación sólo añade material alrededor de la posición real.', 'El arrastre es exacto: sin inercia ni posiciones aproximadas.', 'Con movimiento reducido, el pulgar sigue sin deformarse.'],
  ] },
  { id: 'ns-capitulos', label: 'Capítulos', body: [
    'Los trazos del carril marcan dónde empieza cada capítulo. Son botones: llevan el capítulo arriba y le pasan el foco.',
    'La cabecera indica el capítulo actual y el progreso. Al señalar un trazo, anticipa a qué capítulo lleva. Nada flota sobre el texto.',
  ] },
  { id: 'ns-composicion', label: 'Composición', body: [
    'El área y el carril son columnas distintas de una rejilla: el texto nunca pasa por debajo del riel. En contenedores estrechos, la cabecera se resume y los trazos se simplifican antes de tocar la lectura.',
    'Una sola autoridad de desplazamiento: la barra nativa sólo se oculta cuando el carril está medido y funciona. Si el contenido desborda también en horizontal, se conserva la nativa y el carril no se muestra.',
    'Las áreas anidadas no atrapan la rueda: al llegar al extremo, el desplazamiento continúa en la página, como el nativo.',
  ] },
  { id: 'ns-rendimiento', label: 'Rendimiento', body: [
    'El desplazamiento se escucha en modo pasivo. Las medidas se toman con ResizeObserver cuando cambia el tamaño del área, del contenido o del carril, no en cada fotograma.',
    'El reloj compartido sólo corre mientras el pulgar se mueve o se asienta. En reposo no hay bucle de animación.',
  ] },
  { id: 'ns-accesibilidad', label: 'Accesibilidad', body: [
    'El área es una región con nombre que se enfoca con Tab y se desplaza con flechas, Re Pág, Av Pág, Inicio y Fin.',
    'El riel y el pulgar son una ayuda de puntero y se ocultan a los lectores de pantalla, como una barra nativa. Los trazos son una navegación real con aria-current.',
  ] },
];

/** El documento de la guía como Markdown (lo que se edita). */
const toMarkdown = (chapters: typeof CHAPTERS) => chapters.map((c) => `## ${c.label}\n\n${c.body.map((b) => (typeof b === 'string' ? b : b.map((li) => `- ${li}`).join('\n'))).join('\n\n')}`).join('\n\n');

/**
 * NexScroll — Reading Experience: un lector con un solo carril. El texto es
 * Markdown editable: los capítulos salen de sus títulos `##` (markdownOutline,
 * con los mismos id que pone NexMarkdown), así que escribir un título nuevo
 * crea un trazo en el carril.
 */
function ReadingExperience({ v }: { v: Values }) {
  const [source, setSource] = useState(() => toMarkdown(CHAPTERS));
  const [editing, setEditing] = useState(false);
  const outline = markdownOutline(source, 'ns-');
  const chapters = outline.filter((h) => h.level === 2).slice(0, Number(v.sections)).map((h) => ({ id: h.id, label: h.text }));
  const variant = v.variant as NexScrollVariant;
  return (
    <div className="doc-reader" data-editing={editing ? '' : undefined}>
      {editing && <NexMarkdownEditor label="guia.md" value={source} onChange={setSource} layout="editor" rows={14} className="doc-reader__editor" />}
      <NexScroll.Area
        variant={variant}
        motion={v.motion as never}
        density={v.density as never}
        readingLine={Number(v.readingLine)}
        sections={chapters}
        label="Guía de NexScroll"
        maxHeight={Number(v.height)}
        className="doc-reader__area"
        chapter={<span className="doc-reader__kicker">Guía</span>}
      >
        <article className="doc-reader__doc">
          <header className="doc-reader__title">
            <p className="nx-index">NexFluidUI · lectura</p>
            <h2 className="nx-type-title">El desplazamiento como lugar</h2>
          </header>
          <NexMarkdown source={source} idPrefix="ns-" headingOffset={1} className="doc-reader__md" />
        </article>
      </NexScroll.Area>
      <div className="doc-reader__foot">
        <NexButton density="compact" appearance={editing ? 'filled' : 'default'} aria-pressed={editing} onClick={() => setEditing((e) => !e)}>{editing ? 'Terminar de editar' : 'Editar el texto'}</NexButton>
        <span className="doc-muted">{chapters.length} capítulos · {source.trim() ? source.trim().split(/\s+/).length : 0} palabras · escribe «## Título» para añadir un capítulo</span>
      </div>
    </div>
  );
}

const WS_FILES: Record<string, string> = {
  'README.md': '# Práctica 3\n\nColas M/M/1: teoría y datos.\n\n## Archivos\n\n- `semana-01.md` — planteamiento\n- `semana-02.md` — notas de clase',
  ...Object.fromEntries(CHAPTERS.map((c, i) => [`semana-${String(i + 1).padStart(2, '0')}.md`, `# ${c.label}\n\n${c.body.map((b) => (typeof b === 'string' ? b : b.map((li) => `- ${li}`).join('\n'))).join('\n\n')}`])),
};

/**
 * NexScroll — Workspace Experience: explorador, documento e inspector, cada
 * región con su único desplazamiento. Los archivos se abren y se editan; el
 * inspector cuenta lo escrito en vivo. En espacio reducido, una columna.
 */
export function WorkspaceExperience() {
  const [files, setFiles] = useState(WS_FILES);
  const [open, setOpen] = useState('semana-02.md');
  const [editing, setEditing] = useState(false);
  const text = files[open] ?? '';
  const outline = markdownOutline(text);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const stats: Array<[string, string]> = [
    ['Archivo', open], ['Palabras', String(words)], ['Caracteres', String(text.length)], ['Líneas', String(text.split('\n').length)],
    ['Títulos', String(outline.length)], ['Lectura', `${Math.max(1, Math.round(words / 200))} min`],
    ...outline.map((h): [string, string] => [`h${h.level}`, h.text]),
  ];
  return (
    <NexPreviewBoundary compactBelow={760} constrainedBelow={520}>
      {({ space }) => (
        <div className="doc-ws" data-space={space}>
          <NexScroll.Area variant="spatial" label="Explorador" className="doc-ws__pane doc-ws__explorer">
            <ul className="doc-ws__files">
              {Object.keys(files).map((f) => (
                <li key={f}><button type="button" aria-current={f === open ? 'true' : undefined} onClick={() => setOpen(f)}>{f}{files[f] !== WS_FILES[f] ? ' •' : ''}</button></li>
              ))}
            </ul>
          </NexScroll.Area>
          <NexScroll.Area variant="fluid" label="Documento abierto" className="doc-ws__pane doc-ws__center">
            <div className="doc-ws__doc">
              <div className="doc-ws__doc-bar">
                <strong>{open}</strong>
                <NexButton density="compact" appearance="ghost" aria-pressed={editing} onClick={() => setEditing((e) => !e)}>{editing ? 'Ver' : 'Editar'}</NexButton>
              </div>
              {editing
                ? <NexMarkdownEditor key={open} label={open} value={text} onChange={(t) => setFiles((old) => ({ ...old, [open]: t }))} layout="editor" rows={10} />
                : <NexMarkdown source={text} headingOffset={2} />}
            </div>
          </NexScroll.Area>
          <NexScroll.Area variant="minimal" label="Inspector" className="doc-ws__pane doc-ws__inspector">
            <dl className="doc-ws__props">{stats.map(([k, val], i) => <div key={i}><dt>{k}</dt><dd>{val}</dd></div>)}</dl>
          </NexScroll.Area>
        </div>
      )}
    </NexPreviewBoundary>
  );
}

const SECTIONS: NexScrollSection[] = CHAPTERS.slice(0, 5).map(({ id, label }) => ({ id, label }));
const PARAGRAPHS = CHAPTERS[1]!.body.filter((b): b is string => typeof b === 'string');

function LongList() {
  return (
    <NexScroll.Area variant="minimal" label="Lista de 400 elementos" maxHeight={240}>
      <ol className="doc-scroll-long">
        {Array.from({ length: 400 }, (_, i) => <li key={i}>Elemento {i + 1}</li>)}
      </ol>
    </NexScroll.Area>
  );
}

function NoOverflow() {
  return (
    <NexScroll.Area variant="fluid" label="Contenido corto" maxHeight={240}>
      <p style={{ margin: 0, padding: 12 }}>Sin desbordamiento no hay riel: nada que representar.</p>
    </NexScroll.Area>
  );
}

const editorial = example('scroll-editorial');
const workspace = example('scroll-workspace');
const horizontal = example('scroll-horizontal');


export const scrollDoc: ComponentDoc = {
  path: 'componentes/scroll',
  name: 'NexScroll',
  eyebrow: 'Componentes · Navegación',
  summary: 'Un carril de lectura hecho de materia viva sobre el scroll nativo: mapa del contenido, pulgar viscoso que representa la posición real, progreso, capítulos y una cabecera contextual que nunca tapa el texto.',
  status: 'laboratorio',
  wide: true,
  imports: [{ names: ['NexScroll'], from: '@eclipsis/react' }, { names: ['ScrollTracker'], from: '@eclipsis/core' }],
  origin: <>barras de desplazamiento por defecto en paneles y documentación</>,
  controls: [
    { kind: 'select', name: 'variant', label: 'Variante', options: VARIANTS, initial: 'editorial' },
    { kind: 'select', name: 'motion', label: 'Movimiento', options: MOTIONS, initial: 'fluid' },
    { kind: 'select', name: 'density', label: 'Densidad', options: DENSITIES, initial: 'comfortable' },
    { kind: 'number', name: 'sections', label: 'Capítulos en el carril (máx.)', initial: 12, min: 1, max: 12, step: 1 },
    { kind: 'number', name: 'readingLine', label: 'Línea de lectura', initial: 0.3, min: 0, max: 1, step: 0.05 },
    { kind: 'number', name: 'height', label: 'Altura máxima', initial: 520, min: 220, max: 720, step: 20 },
  ],
  render: (v) => <ReadingExperience v={v} />,
  showcases: [
    { title: 'Workspace Experience', lead: 'Explorador, documento e inspector: tres regiones con un único desplazamiento cada una, límites claros y sin barras horizontales. Al llegar al extremo, la rueda sigue en la página.', render: () => <WorkspaceExperience /> },
  ],
  code: (v) =>
    jsx(
      'NexScroll.Area',
      {
        variant: v.variant as string, motion: v.motion as string, density: v.density as string, label: 'Documento',
        sections: v.variant === 'editorial' ? { code: 'sections' } : undefined, readingLine: Number(v.readingLine) === 0.3 ? undefined : { code: String(v.readingLine) },
        maxHeight: { code: String(v.height) }, onSectionChange: { code: 'setActive' },
      },
      '<article>{/* secciones con id */}</article>',
      { variant: 'fluid', motion: 'fluid', density: 'comfortable' },
    ),
  variants: () => (
    <div className="doc-scroll-variants">
      {VARIANTS.map((variant) => (
        <figure key={variant} className="doc-variant doc-variant--wide">
          <NexScroll.Area variant={variant} label={`Variante ${variant}`} maxHeight={180} sections={variant === 'editorial' ? SECTIONS.slice(0, 3).map((s) => ({ ...s, id: `${s.id}-${variant}` })) : undefined}>
            <div style={{ padding: '4px 2px' }}>
              {SECTIONS.slice(0, 3).map((s) => (
                <div key={s.id}>
                  <h3 id={`${s.id}-${variant}`} className="nx-type-subhead" style={{ margin: '10px 0 4px' }}>{s.label}</h3>
                  {PARAGRAPHS.slice(0, 2).map((p) => <p key={p} className="nx-type-small" style={{ margin: '0 0 8px' }}>{p}</p>)}
                </div>
              ))}
            </div>
          </NexScroll.Area>
          <figcaption><code>variant="{variant}"</code></figcaption>
        </figure>
      ))}
    </div>
  ),
  states: () => (
    <div className="doc-scroll-variants">
      <figure className="doc-variant doc-variant--wide"><LongList /><figcaption>Prueba de desplazamiento largo · 400 elementos · pulgar con longitud mínima</figcaption></figure>
      <figure className="doc-variant doc-variant--wide"><NoOverflow /><figcaption>Sin desbordamiento · sin riel, sin barra</figcaption></figure>
    </div>
  ),
  api: [
    {
      component: 'NexScroll.Area',
      rows: [
        { name: 'variant', type: "'minimal' | 'fluid' | 'editorial' | 'spatial'", default: "'fluid'", description: 'Anatomía y deformación: minimal (hilo rígido), fluid (pulgar viscoso), editorial (progreso, marcadores y etiqueta), spatial (región con bordes y desvanecido).' },
        { name: 'orientation', type: "'vertical' | 'horizontal'", default: "'vertical'", description: 'Eje del riel. En horizontal respeta RTL.' },
        { name: 'sections', type: '{ id: string; label: string }[]', description: 'Elementos del contenido (por id) para marcadores, sección activa y etiqueta.' },
        { name: 'readingLine', type: 'number', default: '0.3', description: 'Fracción del área visible que decide la sección activa.' },
        { name: 'label', type: 'string', description: 'Nombre accesible de la región desplazable.' },
        { name: 'maxHeight', type: 'number | string', description: 'Altura máxima del área. Sin ella, ocupa la altura de su contenedor.' },
        { name: 'motion', type: "'none' | 'subtle' | 'fluid' | 'elastic'", default: 'contexto', description: 'none o movimiento reducido: el pulgar sigue sin deformarse; desplazamientos a sección inmediatos.' },
        { name: 'density', type: 'NexDensity', default: 'contexto', description: 'compact estrecha el canal reservado al riel.' },
        { name: 'onSectionChange', type: '(id: string | null) => void', description: 'Sección activa (sólo cuando cambia).' },
        { name: 'onScrollStateChange', type: '(state: NexScrollState) => void', description: 'Cambios discretos: sección, desbordamiento, extremos y progreso en ese momento.' },
        { name: 'controller', type: 'Ref<NexScrollController>', description: 'scrollToSection(id, { smooth, focus }), scrollToProgress(0..1), refresh(), state.' },
        { name: 'markersLabel', type: 'string', default: "'Secciones'", description: 'Nombre de la navegación por secciones.' },
      ],
    },
    {
      component: 'Primitivas',
      rows: [
        { name: 'NexScroll.Root', type: 'NexScrollRootProps', description: 'Crea el controlador; contiene el resto.' },
        { name: 'NexScroll.Viewport', type: 'HTMLAttributes & { label }', description: 'El elemento que desplaza el navegador (enfocable).' },
        { name: 'NexScroll.Rail', type: '{ children }', description: 'Superficie de puntero: arrastre exacto, clic para centrar, rueda reenviada.' },
        { name: 'NexScroll.Thumb / Progress / Label', type: '—', description: 'Pulgar fluido, línea de progreso y etiqueta contextual (dentro de Rail).' },
        { name: 'NexScroll.Markers', type: '{ label? }', description: 'Navegación por secciones con aria-current="location".' },
      ],
    },
    {
      component: 'ScrollTracker (@eclipsis/core)',
      rows: [
        { name: 'new ScrollTracker(el, options)', type: 'ScrollTrackerOptions', description: 'El mismo controlador sin React: scroll pasivo, ResizeObserver y reloj compartido sólo mientras hay movimiento.' },
        { name: 'setParts({ root, track, thumb, progress, label, markers })', type: 'ScrollParts', description: 'Elementos que pinta.' },
        { name: 'scrollThumb · scrollThumbPath · activeSection', type: 'funciones puras', description: 'Geometría exacta del pulgar, contorno deformado y sección activa.' },
      ],
    },
  ],
  examples: [
    { title: 'Documento con secciones', description: 'Variante editorial: progreso, marcadores navegables y sección actual anunciada.', ...editorial },
    { title: 'Regiones de un espacio de trabajo', description: 'Dos áreas independientes (spatial y fluid). Al llegar al extremo, la rueda continúa en la página: no hay trampas.', ...workspace },
    { title: 'Lista horizontal', description: 'Variante minimal en horizontal.', ...horizontal },
  ],
  keyboard: [
    ['Tab', 'Enfoca el área desplazable y después los marcadores de sección'],
    ['↑ ↓ ← →, Re Pág, Av Pág, Inicio, Fin, Espacio', 'Desplazan el área (comportamiento nativo)'],
    ['Intro / Espacio en un marcador', 'Lleva la sección arriba y le pasa el foco'],
  ],
  a11y: [
    'El desplazamiento es el del navegador: rueda, touchpad, teclado, táctil y lectores de pantalla funcionan sin cambios.',
    'La barra nativa sólo se oculta cuando el riel ya está medido; si el contenido desborda también en el otro eje, se conserva la nativa.',
    'El riel y el pulgar son ayudas de puntero (como una barra nativa) y llevan aria-hidden: no hay controles duplicados para los lectores.',
    'Los marcadores son una navegación real (<nav> con botones y aria-current="location"); al activarlos, el foco pasa a la sección.',
    'El arrastre del pulgar es exacto (sin inercia) y la deformación nunca cambia la posición representada.',
    'Con prefers-reduced-motion o motion="none" no hay deformación, expansión animada ni desplazamiento suave.',
    'No usa overscroll-behavior: contain: al llegar al extremo de un área anidada, la rueda continúa en la página (sin trampas).',
  ],
};
