import { useEffect, useRef, useState } from 'react';
import { NexButton, NexInk, NexPortal, type NexAlign, type NexSide } from '@eclipsis/react';
import {
  MARKDOWN_INK_COMMANDS, NexMarkdownField, createTextareaInkAdapter, type MarkdownInkCommand,
} from '@eclipsis/react/markdown';
import type { NexInkAdapter } from '@eclipsis/react';
import type { ComponentDoc } from '../docs/component-page.tsx';
import { jsx } from '../docs/kit.tsx';

// ---- NexPortal ---------------------------------------------------------------------

function PortalPlayground({ side, align, presentation, modal, surface }: { side: NexSide; align: NexAlign; presentation: 'anchored' | 'adaptive'; modal: boolean; surface: 'raised' | 'ink' | 'plain' }) {
  const [open, setOpen] = useState(false);
  const [inner, setInner] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const anchor = useRef<HTMLButtonElement>(null);
  const innerAnchor = useRef<HTMLButtonElement>(null);
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
      <NexButton ref={anchor} appearance="outlined" aria-expanded={open} aria-haspopup="dialog" onClick={() => { setReason(null); setOpen(!open); }}>
        {open ? 'Cerrar opciones' : 'Opciones de la figura'}
      </NexButton>
      <NexPortal
        open={open}
        onOpenChange={(next, why) => { setOpen(next); setReason(why); }}
        anchor={anchor}
        side={side}
        align={align}
        presentation={presentation}
        modal={modal}
        surface={surface}
        label="Opciones de la figura"
      >
        <div style={{ display: 'grid', gap: 10, width: 280, maxWidth: '100%', textAlign: 'left' }}>
          <strong className="nx-type-label">Figura 2 · Esperas</strong>
          <p className="nx-type-small" style={{ margin: 0 }}>Una superficie no modal: el resto de la página sigue disponible. Escape o un clic fuera la cierran.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <NexButton ref={innerAnchor} density="compact" appearance="ghost" aria-expanded={inner} onClick={() => setInner(!inner)}>Exportar…</NexButton>
            <NexButton density="compact" onClick={() => setOpen(false)}>Listo</NexButton>
          </div>
          <NexPortal open={inner} onOpenChange={setInner} anchor={innerAnchor} side="right" align="start" label="Exportar figura">
            <div style={{ display: 'grid', gap: 6 }}>
              {['PNG', 'SVG', 'CSV de datos'].map((f) => <NexButton key={f} density="compact" appearance="ghost" onClick={() => setInner(false)}>{f}</NexButton>)}
            </div>
          </NexPortal>
        </div>
      </NexPortal>
      <p className="doc-hint" role="status" style={{ margin: 0 }}>{reason ? `Se cerró por: ${reason}` : 'Ábrela, prueba Escape, un clic fuera o la capa anidada «Exportar…».'}</p>
    </div>
  );
}

/** Colisiones: anclas pegadas a los bordes de un marco desplazable. */
function CollisionDemo() {
  const [open, setOpen] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const frame = useRef<HTMLDivElement>(null);
  const spots: Array<[string, React.CSSProperties]> = [
    ['Arriba izq.', { top: 8, left: 8 }], ['Arriba der.', { top: 8, right: 8 }],
    ['Abajo izq.', { bottom: 8, left: 8 }], ['Abajo der.', { bottom: 8, right: 8 }],
  ];
  return (
    <div style={{ width: '100%', maxWidth: 520 }}>
      <div ref={frame} tabIndex={0} role="region" aria-label="Marco desplazable con anclas en los bordes" style={{ position: 'relative', height: 220, overflow: 'auto', borderRadius: 16, boxShadow: 'inset 0 0 0 1px var(--nx-border)', background: 'var(--nx-surface-sunken)' }}>
        <div style={{ position: 'relative', height: 420 }}>
          {spots.map(([name, pos]) => (
            <span key={name} style={{ position: 'absolute', ...pos }}>
              <NexButton ref={(el) => { refs.current[name] = el; }} density="compact" aria-expanded={open === name} onClick={() => setOpen(open === name ? null : name)}>{name}</NexButton>
            </span>
          ))}
          <p className="doc-hint" style={{ position: 'absolute', top: 180, left: 0, right: 0, textAlign: 'center' }}>Desplaza el marco: la capa sigue a su ancla y se oculta si el ancla sale de la vista.</p>
        </div>
      </div>
      {spots.map(([name]) => (
        <NexPortal key={name} open={open === name} onOpenChange={() => setOpen(null)} anchor={refs.current[name] ?? null} boundary={frame} side="bottom" align="center" label={`Capa de ${name}`} initialFocus="none">
          <p className="nx-type-small" style={{ margin: 0, width: 200 }}>Pedí «abajo, centrado» dentro del marco (boundary). Si no cabo, me doy la vuelta; si me salgo por un lado, me deslizo hacia dentro.</p>
        </NexPortal>
      ))}
    </div>
  );
}

/** Continuidad: la misma capa cambia de ancla y se desliza con los resortes de @eclipsis/core. */
function ReanchorDemo() {
  const steps = ['Datos', 'Modelo', 'Resultados', 'Informe'];
  const [at, setAt] = useState(0);
  const [buttons, setButtons] = useState<(HTMLButtonElement | null)[]>([]);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => { setButtons([...(list.current?.querySelectorAll('button') ?? [])]); }, []);
  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
      <div ref={list} role="group" aria-label="Pasos" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {steps.map((s, i) => <NexButton key={s} density="compact" appearance={i === at ? 'filled' : 'ghost'} aria-pressed={i === at} onClick={() => setAt(i)}>{s}</NexButton>)}
      </div>
      <NexPortal open={buttons.length > 0} onOpenChange={() => {}} anchor={buttons[at] ?? null} side="bottom" role="group" label="Nota del paso" initialFocus="none" dismiss={{ escape: false, outside: false }} surface="ink">
        <span className="nx-type-small" style={{ display: 'block', padding: '6px 12px' }}>Paso {at + 1}: {steps[at]}</span>
      </NexPortal>
      <div style={{ height: 40 }} aria-hidden="true" />
    </div>
  );
}

export const portalDoc: ComponentDoc = {
  path: 'componentes/portal',
  name: 'NexPortal',
  eyebrow: 'Componentes · Capas',
  summary: 'Una superficie contextual junto a un ancla: un elemento, una ref o un rango de texto. Se queda en su sitio del árbol (no remonta lo que contiene) y sube a la capa superior del navegador. Coloca con flip y shift dentro del viewport visual, sigue a su ancla, se desliza si cambia de ancla y gestiona Escape, clic fuera y foco según su modalidad.',
  status: 'laboratorio',
  imports: [{ names: ['NexPortal', 'useAnchoredLayer'], from: '@eclipsis/react' }, { names: ['placeFloating'], from: '@eclipsis/components' }],
  origin: <>las capas contextuales de NexBook (menús de bloque, foco con Popover API) y NexMenu</>,
  controls: [
    { kind: 'select', name: 'side', label: 'Lado', options: ['bottom', 'top', 'right', 'left'], initial: 'bottom' },
    { kind: 'select', name: 'align', label: 'Alineación', options: ['center', 'start', 'end'], initial: 'center' },
    { kind: 'select', name: 'presentation', label: 'Presentación', options: ['anchored', 'adaptive'], initial: 'anchored' },
    { kind: 'select', name: 'surface', label: 'Material', options: ['raised', 'plain', 'ink'], initial: 'raised' },
    { kind: 'boolean', name: 'modal', label: 'Modal', initial: false },
  ],
  render: (v) => <PortalPlayground side={v.side as NexSide} align={v.align as NexAlign} presentation={v.presentation as 'anchored'} modal={Boolean(v.modal)} surface={v.surface as 'raised'} />,
  code: (v) => `const anchor = useRef<HTMLButtonElement>(null);
const [open, setOpen] = useState(false);

<NexButton ref={anchor} aria-expanded={open} onClick={() => setOpen(!open)}>Opciones</NexButton>
${jsx('NexPortal', { open: '{open}' as never, onOpenChange: '{setOpen}' as never, anchor: '{anchor}' as never, side: v.side as string, align: v.align as string, presentation: v.presentation as string, surface: v.surface as string, modal: Boolean(v.modal), label: 'Opciones' }, '…', { side: 'bottom', align: 'center', presentation: 'anchored', surface: 'raised', modal: false }).replace(/"\{(\w+)\}"/g, '{$1}')}`,
  showcases: [
    { title: 'Colisiones y recolocación', lead: 'Cuatro anclas en las esquinas de un marco con scroll, que es el límite de colisión (boundary). La misma petición —abajo y centrado— acaba en sitios distintos sin salir del marco ni del viewport.', render: () => <CollisionDemo /> },
    { title: 'Continuidad: cambiar de ancla', lead: 'Una sola capa abierta; al elegir otro paso, se desliza hasta él con los resortes del motor (sin animar con movimiento reducido).', render: () => <ReanchorDemo /> },
  ],
  api: [
    {
      component: 'NexPortal',
      rows: [
        { name: 'open · onOpenChange', type: "boolean · (open, reason: 'escape' | 'outside' | 'focus-out') => void", description: 'Controlado. La capa pide cerrarse; la aplicación decide.' },
        { name: 'anchor', type: 'Element | RefObject | NexVirtualAnchor | null', description: 'Junto a qué. Un ancla virtual sólo necesita getBoundingClientRect (un rango de texto, un cursor) y, opcionalmente, contextElement.' },
        { name: 'boundary', type: 'Element | RefObject | null', description: 'Límite de colisión además del viewport (se usa su intersección).' },
        { name: 'side · align · gap', type: "NexSide · NexAlign · number", default: "'bottom' · 'center' · 6", description: 'Preferencias. Se da la vuelta (flip) y se desliza (shift) si no cabe; align es lógico (start es la derecha en RTL).' },
        { name: 'presentation · adaptiveBelow', type: "'anchored' | 'adaptive' · number", default: "'anchored' · 560", description: 'adaptive: bajo ese ancho de viewport se reorganiza como hoja inferior a todo el ancho, sobre el teclado en pantalla.' },
        { name: 'modal', type: 'boolean', default: 'false', description: 'true: <dialog> con showModal (inerte fuera, foco contenido, aria-modal nativo). false: sin trampa de foco.' },
        { name: 'role · label', type: "'dialog' | 'toolbar' | 'group' | 'region' | 'menu' | 'listbox' · string", default: "'dialog'", description: 'Semántica y nombre accesible.' },
        { name: 'initialFocus · restoreFocus', type: "'auto' | 'none' | RefObject · boolean", default: "'auto' · true", description: 'Dónde entra el foco al abrir y si vuelve a su origen al cerrar.' },
        { name: 'dismiss', type: '{ escape?, outside?, focusOut? }', default: '{ escape: true, outside: true }', description: 'Qué la cierra.' },
        { name: 'surface · motion', type: "'raised' | 'ink' | 'plain' · NexMotion", default: "'raised'", description: 'Material y nivel de movimiento.' },
      ],
    },
    {
      component: 'useAnchoredLayer(open, ref, anchor, options)',
      rows: [
        { name: 'options', type: 'AnchoredLayerOptions', description: 'La misma colocación para componentes propios (NexMenu, NexSelect y NexInk la usan): side, align, gap, margin, flip, shift, matchWidth, promote, boundary, apply.' },
      ],
    },
    {
      component: 'placeFloating(input) — @eclipsis/components',
      rows: [
        { name: 'anchor · floating · viewport', type: 'AnchorRect · { width, height } · AnchorRect', description: 'Geometría pura, sin DOM: devuelve x, y, side, flipped, shift, maxWidth, maxHeight y arrow.' },
      ],
    },
  ],
  keyboard: [
    ['Escape', 'Cierra la capa de arriba (sólo esa) y devuelve el foco a donde estaba'],
    ['Tab', 'Recorre el contenido en el orden del documento: la capa vive junto a su disparador'],
  ],
  a11y: [
    'No modal: role="dialog" (o el que se pida) con nombre y sin aria-modal; no atrapa el foco.',
    'Modal: un <dialog> real abierto con showModal(): el resto queda inerte y el rol es nativo.',
    'Un clic dentro de una capa anidada no cierra la madre; pulsar el ancla no cuenta como «fuera».',
    'Movimiento reducido: sin entrada ni deslizamiento; la posición final es la misma.',
    'Limitación: sin Popover API (navegadores antiguos) la capa queda fixed en su sitio y un ancestro con transform puede desplazarla.',
    'NexPortal no transforma su contenido: para una superficie que nace de otra, NexMorph (que ya monta su destino).',
  ],
};

// ---- NexInk ------------------------------------------------------------------------

const INK_SAMPLE = `## Plan de la práctica

Selecciona cualquier palabra: aparecen las **herramientas de formato**. Con *teclado*, selecciona con Mayús + flechas y pulsa Alt+F10.

- Medir la espera en la cola
- Comparar con la fórmula de Little

La fórmula $W_q = \\frac{\\lambda}{\\mu(\\mu - \\lambda)}$ y la tabla son islas: se conservan exactas.

| Servicio | Minutos |
|---|---|
| Banco | 4.2 |`;

function InkFieldDemo() {
  const [value, setValue] = useState(INK_SAMPLE);
  return (
    <div style={{ display: 'grid', gap: 16, width: 'min(680px, 100%)', textAlign: 'left' }}>
      <NexMarkdownField label="Plan" value={value} onChange={setValue} />
      <details>
        <summary className="nx-type-small">Markdown guardado ({value.length} caracteres)</summary>
        <pre className="nx-type-small" style={{ whiteSpace: 'pre-wrap' }}>{value}</pre>
      </details>
    </div>
  );
}

/** Un consumidor sin capas: NexInk fija sobre un textarea, con el adaptador público. */
function InkInlineDemo() {
  const [value, setValue] = useState('Selecciona texto y usa la barra fija. Ctrl+Z deshace cada formato de una vez.');
  const area = useRef<HTMLTextAreaElement>(null);
  const [adapter, setAdapter] = useState<NexInkAdapter<MarkdownInkCommand> | null>(null);
  useEffect(() => { if (area.current) setAdapter(createTextareaInkAdapter(area.current)); }, []);
  return (
    <div style={{ display: 'grid', gap: 8, width: 'min(560px, 100%)', textAlign: 'left' }}>
      <NexInk adapter={adapter} commands={MARKDOWN_INK_COMMANDS} presentation="inline" label="Formato del comentario" />
      <textarea ref={area} aria-label="Comentario (Markdown)" className="nx-md-field__source" rows={3} value={value} onChange={(e) => setValue(e.target.value)} />
    </div>
  );
}

export const inkDoc: ComponentDoc = {
  path: 'componentes/ink',
  name: 'NexInk',
  eyebrow: 'Componentes · Editorial',
  summary: 'Herramientas editoriales que aparecen con la selección y se retiran al leer. NexInk es la barra y su interacción; un adaptador habla con el editor concreto (textarea, contenteditable, Monaco…). Refleja formatos activos y mixtos, no destruye la selección, se recorre con teclado y en pantallas estrechas se acomoda sobre el teclado en pantalla.',
  status: 'laboratorio',
  imports: [
    { names: ['NexInk'], from: '@eclipsis/react' },
    { names: ['MARKDOWN_INK_COMMANDS', 'createTextareaInkAdapter', 'createRichTextInkAdapter', 'NexMarkdownField'], from: '@eclipsis/react/markdown' },
  ],
  origin: <>la barra de formato de NexBook (operaciones de texto con toggle y una parada de deshacer)</>,
  controls: [],
  render: () => <InkFieldDemo />,
  code: () => `// Con NexMarkdownField ya viene integrado (Visual · Markdown · Vista):
<NexMarkdownField label="Plan" value={markdown} onChange={setMarkdown} />

// Con un editor propio, un adaptador:
const area = useRef<HTMLTextAreaElement>(null);
const [adapter, setAdapter] = useState<NexInkAdapter<MarkdownInkCommand> | null>(null);
useEffect(() => { if (area.current) setAdapter(createTextareaInkAdapter(area.current)); }, []);

<textarea ref={area} value={markdown} onChange={(e) => setMarkdown(e.target.value)} />
<NexInk adapter={adapter} commands={MARKDOWN_INK_COMMANDS} />`,
  showcases: [
    { title: 'Barra fija, mismo contrato', lead: 'presentation="inline": para un consumidor que no quiere capas flotantes. El adaptador es el público de @eclipsis/react/markdown.', render: () => <InkInlineDemo /> },
  ],
  api: [
    {
      component: 'NexInk',
      rows: [
        { name: 'adapter', type: 'NexInkAdapter<C> | null', description: 'El motor. Sin adaptador no pinta nada.' },
        { name: 'commands', type: 'NexInkCommand<C>[]', description: 'id, label, icon, shortcut (Mod+B), tier (primary | more) e input (pide un valor, como la URL de un enlace).' },
        { name: 'presentation', type: "'contextual' | 'inline'", default: "'contextual'", description: 'Flota junto a la selección (NexPortal) o queda fija en su sitio.' },
        { name: 'label · shortcuts · onRun · motion', type: '…', description: 'Nombre de la barra, atajos sobre el editor (y Alt+F10), aviso tras ejecutar y movimiento.' },
      ],
    },
    {
      component: 'NexInkAdapter<C>',
      rows: [
        { name: 'element() · selection()', type: 'HTMLElement | null · NexInkSelection | null', description: 'El editable y la selección: { collapsed, anchor } con un ancla virtual que se lee en vivo.' },
        { name: 'state(c) · enabled?(c)', type: "boolean | 'mixed' · boolean", description: 'Formato activo, inactivo o mixto; si se puede ejecutar.' },
        { name: 'run(c, value?)', type: 'void', description: 'Ejecuta sobre la selección en UNA parada de deshacer del motor.' },
        { name: 'bookmark() · restore(m)', type: 'unknown · void', description: 'Conservar la selección mientras se usa la barra (teclado, campo de enlace).' },
        { name: 'subscribe(listener)', type: '() => void', description: 'Avisa de cambios de selección o de contenido.' },
      ],
    },
    {
      component: 'Markdown (@eclipsis/react/markdown)',
      rows: [
        { name: 'createTextareaInkAdapter(textarea)', type: 'NexInkAdapter', description: 'Ediciones mínimas con insertText: entran en el deshacer nativo del campo.' },
        { name: 'createRichTextInkAdapter(root, { onChange })', type: 'NexInkAdapter', description: 'El editor visual de NexMarkdownField. Estado por nodos del rango (mixto real); las islas no se tocan.' },
        { name: 'applyMarkdownCommand · markdownCommandState', type: 'puras', description: 'Formato sobre texto y offsets, con alternancia (negrita sobre negrita la quita).' },
      ],
    },
  ],
  keyboard: [
    ['Ctrl/⌘ + B · I · E · K · Mayús+X', 'Negrita · cursiva · código · enlace · tachado'],
    ['Alt + F10 (en el texto)', 'Entra en la barra sin perder la selección'],
    ['← / → · Inicio / Fin', 'Recorren la barra (una sola parada de Tab)'],
    ['Escape (en la barra)', 'Vuelve al texto y restaura la selección'],
    ['Escape (en el texto)', 'Retira la barra hasta la próxima selección'],
  ],
  a11y: [
    'La barra es role="toolbar" con nombre; cada formato es un botón con aria-pressed (true, false o mixed) y aria-keyshortcuts.',
    '«Más formatos» usa aria-expanded y aria-controls; lo revelado es un grupo con nombre.',
    'Pulsar un botón no roba el foco ni la selección; con teclado, un marcador del adaptador la restaura antes de ejecutar.',
    'Con puntero grueso la barra va debajo de la selección (el menú nativo sale encima) y sus objetivos miden 44 px; en viewports estrechos se acomoda sobre el teclado.',
    'Deshacer: dentro de cada perspectiva, el del navegador (cada comando, una parada). Cambiar entre Visual y Markdown conserva el valor byte a byte, no la pila de deshacer.',
    'Fuera de alcance (sin modelo de datos aún): comentarios, menciones, sugerencias y colaboración. No hay botones para ellas.',
  ],
};
