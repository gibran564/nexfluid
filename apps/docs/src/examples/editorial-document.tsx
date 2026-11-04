import { memo, useCallback, useId, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  NexButton, NexCodeBlock, NexEditorialBlock, NexFlow, NexIcon, NexSegmented, useNexFlow, type NexFlowMode, type NexMenuItem,
} from '@eclipsis/react';
import { NexDataView, sheetFromRows, type SheetData } from '@eclipsis/react/sheets';

/**
 * Un documento editorial vivo sobre NexFlow. El modelo (un array de nodos), la
 * edición de texto, «/», Intro/Retroceso y el historial son de ESTA página,
 * como lo serían de NexBook: NexFlow sólo pone la hoja, la selección, el
 * orden, la inserción y el movimiento.
 */

type Node =
  | { id: string; kind: 'title' | 'heading' | 'paragraph'; text: string }
  | { id: string; kind: 'list'; items: string[] }
  | { id: string; kind: 'quote'; text: string; cite: string }
  | { id: string; kind: 'figure'; caption: string }
  | { id: string; kind: 'code'; source: string; ran?: boolean; failed?: boolean }
  | { id: string; kind: 'table'; view: 'table' | 'chart'; sheet: SheetData }
  | { id: string; kind: 'simulator'; rate: number };
type Kind = Node['kind'];

const NAMES: Record<Kind, string> = {
  title: 'Título', heading: 'Sección', paragraph: 'Párrafo', list: 'Lista', quote: 'Cita', figure: 'Figura', code: 'Código', table: 'Tabla', simulator: 'Simulador',
};

const ROWS = [['Banco', 4.2, 3.1], ['Cafetería', 7.8, 2.4], ['Ventanilla escolar', 12.5, 6.9], ['Farmacia', 3.4, 1.2]] as const;

const FIGURE = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 360"><rect width="960" height="360" fill="#efe7da"/><g fill="#c2410c">${Array.from({ length: 13 }, (_, i) => `<circle cx="${70 + i * 46 + (i % 3) * 9}" cy="${180 + Math.sin(i * 1.7) * 38}" r="${10 + (i % 4) * 3}" opacity="${0.35 + (i / 20)}"/>`).join('')}</g><rect x="720" y="110" width="150" height="140" rx="44" fill="#1f1a17"/><circle cx="795" cy="180" r="26" fill="#c2410c"/><path d="M640 180h60" stroke="#1f1a17" stroke-width="3" stroke-dasharray="4 8"/></svg>`)}`;

/** El dato de una tabla es una hoja de NexSheets: la misma para la tabla, el gráfico y el editor. */
function sheetOf(rows: Array<Array<string | number>>): SheetData {
  const s = sheetFromRows('Hoja', rows);
  return { rows: s.rows, columns: s.columns, cells: s.cells };
}

let seq = 100;
const uid = () => `n${++seq}`;

const INITIAL: Node[] = [
  { id: 'n1', kind: 'title', text: 'Por qué esperamos' },
  { id: 'n2', kind: 'paragraph', text: 'Una fila no se forma porque lleguen demasiadas personas, sino porque no llegan a un ritmo constante. La variabilidad, más que el volumen, es lo que convierte un servicio holgado en una espera.' },
  { id: 'n3', kind: 'heading', text: 'Tres ideas antes de medir' },
  { id: 'n4', kind: 'list', items: ['La ocupación media engaña: un servidor al 90 % ya hace esperar mucho.', 'Las llegadas se agrupan; los servicios se alargan.', 'Reducir la variabilidad suele costar menos que añadir capacidad.'] },
  { id: 'n5', kind: 'figure', caption: 'Fig. 1 — Llegadas irregulares frente a un único punto de servicio.' },
  { id: 'n6', kind: 'quote', text: 'La espera es el precio de la variabilidad, no el de la escasez.', cite: 'Notas de clase, Teoría de colas' },
  { id: 'n7', kind: 'paragraph', text: 'Medimos cuatro servicios del campus durante una semana. La tabla resume los minutos de espera en la hora punta y en el resto del día.' },
  { id: 'n8', kind: 'table', view: 'table', sheet: sheetOf([['Servicio', 'Hora punta', 'Resto del día'], ...ROWS.map((r) => [...r]), ['Media', '=PROMEDIO(B2:B5)', '=PROMEDIO(C2:C5)']]) },
  { id: 'n9', kind: 'heading', text: 'El cálculo' },
  { id: 'n10', kind: 'code', source: 'llegadas = [3, 5, 2, 8, 4]\nmedia = sum(llegadas) / len(llegadas)\nprint(f"{media:.1f} personas por minuto")' },
  { id: 'n11', kind: 'paragraph', text: 'Mueve la tasa de llegada para ver cómo crece la espera cuando el servicio se acerca a su capacidad.' },
  { id: 'n12', kind: 'simulator', rate: 0.7 },
];

function blank(kind: Kind): Node {
  const id = uid();
  switch (kind) {
    case 'list': return { id, kind, items: [''] };
    case 'quote': return { id, kind, text: '', cite: '' };
    case 'figure': return { id, kind, caption: 'Pie de figura' };
    case 'code': return { id, kind, source: 'print("hola")' };
    case 'table': return { id, kind, view: 'table', sheet: sheetOf([['Columna', 'Valor'], ['A', 1], ['B', 2]]) };
    case 'simulator': return { id, kind, rate: 0.5 };
    default: return { id, kind, text: '' };
  }
}

/** Posición del cursor dentro de un texto editable plano. */
function caretOffset(el: HTMLElement): number {
  const sel = getSelection();
  if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return el.textContent?.length ?? 0;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.setEnd(sel.anchorNode!, sel.anchorOffset);
  return range.toString().length;
}
function placeCaret(el: HTMLElement | null, at: 'start' | 'end') {
  if (!el) return;
  el.focus({ preventScroll: false });
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(at === 'start');
  const sel = getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/**
 * Texto editable NO controlado: React pinta el valor inicial y no vuelve a
 * tocar el DOM mientras se escribe (si lo hiciera, el cursor saltaría). Un
 * cambio externo —deshacer— se aplica remontando con otra `version`.
 */
const Editable = memo(function Editable({ tag: Tag, text, editable, placeholder, label, onText, onKeyDown, id }: {
  tag: 'h1' | 'h2' | 'p' | 'span'; text: string; editable: boolean; placeholder: string; label: string; id: string;
  onText: (text: string) => void; onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
}) {
  // Sólo el valor del montaje: si React volviera a escribir el texto, el cursor saltaría.
  const [initial] = useState(text);
  return (
    <Tag
      data-edit={id}
      contentEditable={editable ? 'plaintext-only' as never : undefined}
      suppressContentEditableWarning
      role={editable ? 'textbox' : undefined}
      aria-label={editable ? label : undefined}
      aria-multiline={editable ? 'true' : undefined}
      data-placeholder={placeholder}
      spellCheck={editable}
      onInput={(e) => onText(e.currentTarget.textContent ?? '')}
      onKeyDown={onKeyDown}
    >
      {initial}
    </Tag>
  );
});

/** Espera media en una cola M/M/1 con servicio 1/min: Wq = ρ / (μ − λ). */
function Simulator({ rate, onRate }: { rate: number; onRate: (r: number) => void }) {
  const result = useId();
  const wait = rate / (1 - rate);
  return (
    <div className="editorial-sim">
      <label className="editorial-sim__control">
        <span>Llegadas por minuto <b>{rate.toFixed(2)}</b></span>
        <input type="range" min={0.05} max={0.95} step={0.05} value={rate} onChange={(e) => onRate(Number(e.target.value))} aria-describedby={result} />
      </label>
      <p id={result} className="editorial-sim__result" aria-live="polite"><span>{wait.toFixed(1)}</span> min de espera media</p>
      <div className="editorial-sim__bar" aria-hidden="true"><span style={{ width: `${Math.min(100, (wait / 19) * 100)}%` }} /></div>
    </div>
  );
}

/** Abre la paleta de inserción de la hoja junto a una línea (para «/»). */
function useSlash(at: number) {
  const flow = useNexFlow();
  return useCallback((el: HTMLElement) => {
    if (flow?.canInsert) flow.openInsert({ at, anchor: el, returnFocus: el });
  }, [flow, at]);
}

function TextNode({ node, index, editable, onText, onKey }: {
  node: Extract<Node, { kind: 'title' | 'heading' | 'paragraph' }>; index: number; editable: boolean;
  onText: (id: string, text: string) => void; onKey: (event: KeyboardEvent<HTMLElement>, node: Node, index: number, slash: (el: HTMLElement) => void) => void;
}) {
  const slash = useSlash(index + 1);
  const handler = useCallback((e: KeyboardEvent<HTMLElement>) => onKey(e, node, index, slash), [onKey, node, index, slash]);
  const tag = node.kind === 'title' ? 'h1' : node.kind === 'heading' ? 'h2' : 'p';
  return (
    <Editable id={node.id} tag={tag} text={node.text} editable={editable} label={NAMES[node.kind]}
      placeholder={node.kind === 'paragraph' ? 'Escribe, o «/» para insertar' : NAMES[node.kind]} onText={(t) => onText(node.id, t)} onKeyDown={handler} />
  );
}

export function EditorialDocument({ initialMode = 'edit', motion = 'fluid' }: { initialMode?: NexFlowMode; motion?: string }) {
  const [mode, setMode] = useState<NexFlowMode>(initialMode);
  const [doc, setDoc] = useState<Node[]>(INITIAL);
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const past = useRef<Node[][]>([]);
  const future = useRef<Node[][]>([]);
  const typing = useRef<{ id: string; at: number } | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const focusAfter = useRef<{ id: string; at: 'start' | 'end' } | null>(null);
  const slashTarget = useRef<string | null>(null);
  const editing = mode === 'edit';
  const [running, setRunning] = useState<string | null>(null);
  // El modo enfoque lo pinta la aplicación: aquí sólo se refleja qué bloque lo tiene abierto.
  const [focused, setFocused] = useState<string | null>(null);
  /** Ejecución simulada: el contorno late mientras dura. */
  const run = (id: string) => {
    setRunning(id);
    setTimeout(() => { setRunning(null); update(id, { ran: true, failed: false } as Partial<Node>); }, 1400);
  };

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  /** Un cambio de estructura o de valor: entra en el historial. */
  const commit = useCallback((next: Node[], focus?: { id: string; at: 'start' | 'end' }) => {
    past.current.push(docRef.current);
    future.current = [];
    typing.current = null;
    if (focus) focusAfter.current = focus;
    setDoc(next);
  }, []);

  /** Escribir: una entrada de historial por racha (hasta 1 s sin teclear o cambiar de elemento). */
  const onText = useCallback((id: string, text: string) => {
    const now = Date.now();
    if (!typing.current || typing.current.id !== id || now - typing.current.at > 1000) {
      past.current.push(docRef.current);
      future.current = [];
    }
    typing.current = { id, at: now };
    setDoc((d) => d.map((n) => (n.id === id && 'text' in n ? { ...n, text } : n)));
  }, []);

  const travel = useCallback((dir: 'undo' | 'redo') => {
    const from = dir === 'undo' ? past.current : future.current;
    const to = dir === 'undo' ? future.current : past.current;
    const target = from.pop();
    if (!target) return;
    to.push(docRef.current);
    typing.current = null;
    setDoc(target);
    setVersion((v) => v + 1);
    setNotice(dir === 'undo' ? 'Deshecho' : 'Rehecho');
  }, []);

  useLayoutEffect(() => {
    const f = focusAfter.current;
    if (!f) return;
    focusAfter.current = null;
    placeCaret(document.querySelector<HTMLElement>(`[data-edit="${f.id}"]`), f.at);
  });

  const insertAt = useCallback((at: number, kind: Kind) => {
    const d = docRef.current;
    const node = blank(kind);
    const before = d[at - 1];
    // «/» en una línea vacía la convierte; desde el margen, se inserta.
    const replace = before && slashTarget.current === before.id && before.kind === 'paragraph' && before.text === '';
    slashTarget.current = null;
    const next = replace ? [...d.slice(0, at - 1), node, ...d.slice(at)] : [...d.slice(0, at), node, ...d.slice(at)];
    commit(next, 'text' in node || node.kind === 'list' ? { id: node.kind === 'list' ? `${node.id}:0` : node.id, at: 'start' } : undefined);
    setSelected(node.id);
  }, [commit]);

  const insertItems = useCallback((at: number): NexMenuItem[] => [
    { id: 'paragraph', label: 'Párrafo', hint: 'Texto', group: 'Escribir', icon: <NexIcon name="file" />, onSelect: () => insertAt(at, 'paragraph') },
    { id: 'heading', label: 'Sección', hint: 'Título', group: 'Escribir', icon: <NexIcon name="menu" />, onSelect: () => insertAt(at, 'heading') },
    { id: 'list', label: 'Lista', group: 'Escribir', icon: <NexIcon name="dot" />, onSelect: () => insertAt(at, 'list') },
    { id: 'quote', label: 'Cita', group: 'Escribir', icon: <NexIcon name="drop" />, onSelect: () => insertAt(at, 'quote') },
    { id: 'figure', label: 'Figura', hint: 'Imagen y pie', group: 'Medios', icon: <NexIcon name="eye" />, onSelect: () => insertAt(at, 'figure') },
    { id: 'code', label: 'Código', hint: 'Python', group: 'Datos', icon: <NexIcon name="code" />, onSelect: () => insertAt(at, 'code') },
    { id: 'table', label: 'Tabla', hint: 'Tabla ↔ gráfico', group: 'Datos', icon: <NexIcon name="grid" />, onSelect: () => insertAt(at, 'table') },
    { id: 'simulator', label: 'Simulador', hint: 'Interactivo', group: 'Datos', icon: <NexIcon name="settings" />, onSelect: () => insertAt(at, 'simulator') },
  ], [insertAt]);

  const remove = useCallback((id: string) => {
    const d = docRef.current;
    const i = d.findIndex((n) => n.id === id);
    const neighbor = d[i - 1] ?? d[i + 1];
    commit(d.filter((n) => n.id !== id), neighbor ? { id: neighbor.kind === 'list' ? `${neighbor.id}:${neighbor.items.length - 1}` : neighbor.id, at: 'end' } : undefined);
    setSelected(neighbor?.id ?? null);
  }, [commit]);

  const onTextKey = useCallback((event: KeyboardEvent<HTMLElement>, node: Node, index: number, slash: (el: HTMLElement) => void) => {
    const el = event.currentTarget;
    const text = el.textContent ?? '';
    if (event.key === '/' && text === '' && node.kind === 'paragraph') {
      event.preventDefault();
      slashTarget.current = node.id;
      slash(el);
    } else if (event.key === 'Enter' && !event.shiftKey && node.kind !== 'quote') {
      event.preventDefault();
      const at = caretOffset(el);
      const head = text.slice(0, at);
      const tail = text.slice(at);
      const next: Node = { id: uid(), kind: 'paragraph', text: tail };
      const d = docRef.current.map((n) => (n.id === node.id && 'text' in n ? { ...n, text: head } : n));
      commit([...d.slice(0, index + 1), next, ...d.slice(index + 1)], { id: next.id, at: 'start' });
      setVersion((v) => v + 1);
      setSelected(next.id);
    } else if (event.key === 'Backspace' && text === '' && node.kind === 'paragraph' && docRef.current.length > 1) {
      event.preventDefault();
      remove(node.id);
    }
  }, [commit, remove]);

  const onListKey = useCallback((event: KeyboardEvent<HTMLElement>, node: Extract<Node, { kind: 'list' }>, item: number) => {
    const el = event.currentTarget;
    const text = el.textContent ?? '';
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (text === '' && item === node.items.length - 1) {
        // Intro en el último punto vacío sale de la lista a un párrafo.
        const d = docRef.current;
        const i = d.findIndex((n) => n.id === node.id);
        const p: Node = { id: uid(), kind: 'paragraph', text: '' };
        const list = { ...node, items: node.items.slice(0, -1) };
        commit([...d.slice(0, i), ...(list.items.length ? [list] : []), p, ...d.slice(i + 1)], { id: p.id, at: 'start' });
        setVersion((v) => v + 1);
        return;
      }
      const items = [...node.items];
      items.splice(item + 1, 0, '');
      commit(docRef.current.map((n) => (n.id === node.id ? { ...node, items } : n)), { id: `${node.id}:${item + 1}`, at: 'start' });
      setVersion((v) => v + 1);
    } else if (event.key === 'Backspace' && text === '' && node.items.length > 1) {
      event.preventDefault();
      const items = node.items.filter((_, i) => i !== item);
      commit(docRef.current.map((n) => (n.id === node.id ? { ...node, items } : n)), { id: `${node.id}:${Math.max(0, item - 1)}`, at: 'end' });
      setVersion((v) => v + 1);
    }
  }, [commit]);

  const setListItem = useCallback((id: string, item: number, text: string) => {
    const now = Date.now();
    const key = `${id}:${item}`;
    if (!typing.current || typing.current.id !== key || now - typing.current.at > 1000) { past.current.push(docRef.current); future.current = []; }
    typing.current = { id: key, at: now };
    setDoc((d) => d.map((n) => (n.id === id && n.kind === 'list' ? { ...n, items: n.items.map((t, i) => (i === item ? text : t)) } : n)));
  }, []);

  const update = (id: string, patch: Partial<Node>) => commit(docRef.current.map((n) => (n.id === id ? ({ ...n, ...patch } as Node) : n)));
  const move = (from: number, to: number) => {
    const d = [...docRef.current];
    const [n] = d.splice(from, 1);
    d.splice(to, 0, n!);
    commit(d);
  };
  const actionsFor = (node: Node, index: number): NexMenuItem[] => [
    ...(node.kind === 'code' ? [{ id: 'fail', label: node.failed ? 'Quitar el error simulado' : 'Simular un error', onSelect: () => update(node.id, { failed: !node.failed, ran: false }) }] : []),
    { id: 'dup', label: 'Duplicar', onSelect: () => { const copy = { ...node, id: uid() } as Node; const d = docRef.current; commit([...d.slice(0, index + 1), copy, ...d.slice(index + 1)]); } },
    ...(node.kind === 'paragraph' || node.kind === 'heading'
      ? [{ id: 'turn', label: node.kind === 'paragraph' ? 'Convertir en sección' : 'Convertir en párrafo', onSelect: () => { update(node.id, { kind: node.kind === 'paragraph' ? 'heading' : 'paragraph' } as Partial<Node>); setVersion((v) => v + 1); } }]
      : []),
    { id: 'up', label: 'Subir', hint: '↑ en el asa', disabled: index === 0, onSelect: () => move(index, index - 1) },
    { id: 'down', label: 'Bajar', hint: '↓ en el asa', disabled: index === doc.length - 1, onSelect: () => move(index, index + 1) },
    { id: 'del', label: `Eliminar ${NAMES[node.kind].toLowerCase()}`, tone: 'danger', onSelect: () => remove(node.id) },
  ];

  const body = (node: Node, index: number): ReactNode => {
    switch (node.kind) {
      case 'title': case 'heading': case 'paragraph':
        return <TextNode key={`${node.id}@${version}`} node={node} index={index} editable={editing} onText={onText} onKey={onTextKey} />;
      case 'list':
        return (
          <ul>
            {node.items.map((t, i) => (
              <li key={`${i}@${version}`}>
                <Editable id={`${node.id}:${i}`} tag="span" text={t} editable={editing} label={`Punto ${i + 1}`} placeholder="Punto de la lista"
                  onText={(x) => setListItem(node.id, i, x)} onKeyDown={(e) => onListKey(e, node, i)} />
              </li>
            ))}
          </ul>
        );
      case 'quote':
        return (
          <blockquote key={version}>
            <Editable id={node.id} tag="p" text={node.text} editable={editing} label="Cita" placeholder="Una cita" onText={(x) => onText(node.id, x)} />
            {(node.cite || editing) && <footer className="editorial-cite">— {node.cite || 'Fuente'}</footer>}
          </blockquote>
        );
      case 'figure':
        return (
          <figure>
            <img src={FIGURE} alt="Círculos de tamaños irregulares avanzan hacia un único punto de servicio oscuro." />
            <figcaption>{node.caption}</figcaption>
          </figure>
        );
      case 'code':
        return (
          <>
            <NexCodeBlock code={node.source} language="python" copyable={false} />
            {node.ran && <p className="editorial-output"><span aria-hidden="true">→</span> 4.4 personas por minuto</p>}
            {node.failed && <p className="editorial-output editorial-output--error"><span aria-hidden="true">!</span> NameError: 'media' no está definida (línea 3)</p>}
          </>
        );
      case 'table':
        return <NexDataView title="Minutos de espera" sheet={node.sheet} view={node.view} onViewChange={(view) => update(node.id, { view } as Partial<Node>)}
          onChange={(sheet) => update(node.id, { sheet } as Partial<Node>)} />;
      case 'simulator':
        return <Simulator rate={node.rate} onRate={(rate) => setDoc((d) => d.map((n) => (n.id === node.id ? { ...n, rate } : n)))} />;
    }
  };

  const toolsFor = (node: Node): ReactNode => {
    if (node.kind === 'code') return <NexButton density="compact" appearance="filled" iconStart={<NexIcon name="play" size={12} />} onClick={() => run(node.id)}>Ejecutar</NexButton>;
    return undefined;
  };

  return (
    <div
      className="editorial-doc"
      onKeyDownCapture={(e) => {
        if (!editing || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' && e.key.toLowerCase() !== 'y') return;
        e.preventDefault();
        travel(e.key.toLowerCase() === 'y' || e.shiftKey ? 'redo' : 'undo');
      }}
    >
      <div className="editorial-doc__bar">
        <NexSegmented aria-label="Modo del documento" density="compact" value={mode} onValueChange={(v) => setMode(v as NexFlowMode)}
          options={[{ value: 'read', label: 'Lectura' }, { value: 'edit', label: 'Edición' }]} />
        {editing && (
          <span className="editorial-doc__history">
            <NexButton density="compact" appearance="ghost" onClick={() => travel('undo')} aria-keyshortcuts="Control+Z">Deshacer</NexButton>
            <NexButton density="compact" appearance="ghost" onClick={() => travel('redo')} aria-keyshortcuts="Control+Shift+Z">Rehacer</NexButton>
          </span>
        )}
        <span className="nx-visually-hidden" role="status">{notice}</span>
      </div>
      <NexFlow mode={mode} motion={motion as never} selectedId={selected} onSelect={setSelected} onReorder={move} insertItems={insertItems}
        insertLabel="Insertar en el documento" aria-label="Por qué esperamos">
        {doc.map((node, index) => (
          <NexEditorialBlock key={node.id} blockId={node.id} label={`${NAMES[node.kind]} ${index + 1} de ${doc.length}`} kind={node.kind}
            width={node.kind === 'figure' || node.kind === 'table' ? 'wide' : 'text'}
            presence={node.kind === 'code' || node.kind === 'table' || node.kind === 'simulator' ? 'subtle' : 'quiet'}
            onFocusRequest={node.kind === 'code' || node.kind === 'table' ? () => { setFocused((f) => (f === node.id ? null : node.id)); setNotice(focused === node.id ? 'Modo enfoque cerrado' : 'Nextudio abriría aquí su modo enfoque para este bloque'); } : undefined}
            expanded={focused === node.id}
            busy={running === node.id} error={node.kind === 'code' && Boolean(node.failed)}
            actions={actionsFor(node, index)} tools={toolsFor(node)}>
            {body(node, index)}
          </NexEditorialBlock>
        ))}
      </NexFlow>
    </div>
  );
}
