'use client';

/**
 * NexConsole: la entrada y la salida de un programa, en una sola superficie.
 *
 * - Consola: stdout, stderr, errores y lo escrito en stdin en el orden real;
 *   la línea para escribir aparece SÓLO cuando el programa espera, justo detrás
 *   de su prompt («Nombre: █»). Lo que no es texto queda marcado en su sitio.
 * - NexView: la misma ejecución, compuesta: tablas, vectores y matrices,
 *   JSON plegable, imágenes, figuras (con el renderizador de la aplicación),
 *   diagnósticos con sugerencias y el diálogo con stdin en su lugar. Lo que
 *   declara el runtime (`confirmed`) y lo reconocido en la salida impresa
 *   (`parsed`) se distinguen siempre.
 *
 * Cambiar de vista no ejecuta nada ni toca los datos: es otra lectura de los
 * mismos `outputs`. La entrada pendiente, el estado y el historial se conservan.
 * NexConsole no ejecuta código: la aplicación entrega salidas y recibe
 * entrada (`onSubmitInput`) e interrupciones (`onInterrupt`).
 *
 * Origen del comportamiento: `ProgramTerminal`, `StdinField` y NexView de
 * Nextudio (scroll que respeta a quien lee, pegado multilínea, IME, Ctrl+C).
 */
import { memo, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  columnsFor, composeNexView, consoleStateLabel, consoleStatus, consoleTranscript, cx, layoutNexViewEvents, normalizeNexViewEvents, safeUrl,
  type NexConsoleCellValue, type NexConsoleFigureOutput, type NexConsoleCustomOutput, type NexConsoleImageOutput, type NexConsoleJsonValue,
  type NexConsoleOutput, type NexConsoleState, type NexConsoleStatus, type NexConsoleTableOutput, type NexMotion, type NexViewDiagnostic, type NexViewEvent, type NexViewItem,
  type NexSessionConnection, type NexSessionStore, type NexSessionTransport, type NexTerminalEmulator,
} from '@nexfluid/components';
import { canAnimate, useMotionPreference, useNex } from './provider.tsx';
import { NexButton } from './button.tsx';
import { NexIcon } from './icon.tsx';
import { NexSegmented } from './segmented.tsx';

export type NexConsoleView = 'console' | 'nexview';

export interface NexConsoleRenderers {
  /** Imágenes sin `src` (p. ej. un asset de la aplicación). */
  image?: (output: NexConsoleImageOutput) => ReactNode;
  /** Figuras por formato (`plotly`, `vega`…). */
  figure?: (output: NexConsoleFigureOutput) => ReactNode;
  /** Otros formatos por MIME. */
  custom?: (output: NexConsoleCustomOutput) => ReactNode;
}

export interface NexConsoleProps {
  /** Lo que produjo el programa, en cualquier orden: se ordena por `seq`. */
  outputs: readonly NexConsoleOutput[];
  state: NexConsoleState;
  view?: NexConsoleView;
  defaultView?: NexConsoleView;
  onViewChange?: (view: NexConsoleView) => void;
  /** Entrega lo escrito (una línea o varias pegadas). `false` si el programa ya no espera. */
  onSubmitInput?: (text: string) => boolean;
  /** Detener (botón y Ctrl+C en la línea de entrada). */
  onInterrupt?: () => void;
  /** Entrada anticipada para runtimes que la aceptan antes de ejecutar. */
  stdin?: { value: string; onChange: (value: string) => void; label?: string };
  durationMs?: number;
  /** La salida se cortó al llegar al límite. */
  truncated?: boolean;
  /** Líneas pegadas que esperan la siguiente pregunta. */
  queued?: number;
  renderers?: NexConsoleRenderers;
  /** Límite de filas pintadas por tabla (el resto se resume). Por defecto 50. */
  maxRows?: number;
  /** Límite de caracteres de la línea de entrada. */
  maxInputChars?: number;
  /** Alto de la zona de salida (px o CSS). Por defecto crece hasta 420 px. */
  height?: number | string;
  /**
   * Ocupa el alto de su contenedor (un panel acoplado, un panel redimensionable):
   * la barra queda fija y la zona de salida crece y se desplaza dentro, sin el
   * tope de 420 px. El contenedor debe tener un alto definido. Ignora `height`.
   */
  fill?: boolean;
  /**
   * `false` cuando la aplicación ya tiene su propio botón «Detener»: no se pinta
   * otro en la barra. Ctrl+C en la línea de entrada sigue llamando a `onInterrupt`.
   */
  interruptButton?: boolean;
  /**
   * `false`: sin selector Consola | NexView (la aplicación muestra NexView en
   * otro sitio, p. ej. un panel lateral). La vista sigue la prop `view`.
   */
  viewToggle?: boolean;
  /**
   * `false`: sin barra (ejecutar, estado, selector). Para una NexView incrustada
   * en una superficie que ya tiene su propia cabecera. El estado sigue en
   * `data-state` para estilos.
   */
  chrome?: boolean;
  label?: string;
  emptyHint?: ReactNode;
  /** Sesión viva: estado de la conexión. Desconectada, no se puede escribir. */
  connection?: NexSessionConnection;
  /** Salidas antiguas descartadas por el límite de memoria de la sesión. */
  dropped?: number;
  /**
   * Superficie de terminal real (un emulador ANSI/VT montado por la
   * aplicación). Sustituye a la transcripción en la vista Consola; NexView
   * sigue mostrando sólo los eventos estructurados fiables.
   */
  terminal?: ReactNode;
  /** Acciones de la sesión en la barra (reconectar, cerrar…). */
  actions?: ReactNode;
  /** «Ampliar» un resultado de NexView: la aplicación lo lleva a su Focus (gráfica, tabla, imagen). */
  onFocusOutput?: (output: NexConsoleOutput) => void;
  /** Ejecutar desde la propia barra. La ejecución es de la aplicación; aquí sólo se pide. */
  onRun?: () => void;
  runLabel?: string;
  runDisabled?: boolean;
  motion?: NexMotion;
  className?: string;
}

const RUNNING: ReadonlySet<NexConsoleState> = new Set(['starting', 'running', 'waiting_for_input']);

function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
}
const cellText = (v: NexConsoleCellValue) => (v === null ? '—' : typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v));

export function NexConsole({
  outputs, state, view: controlled, defaultView = 'console', onViewChange, onSubmitInput, onInterrupt, stdin, durationMs, truncated, queued = 0,
  renderers, maxRows = 50, maxInputChars = 10_000, height, label = 'Consola del programa', emptyHint = 'Ejecuta el programa para ver su salida.',
  connection, dropped = 0, terminal, actions, onRun, runLabel, runDisabled, onFocusOutput, motion, className, fill = false, interruptButton = true, viewToggle = true, chrome = true,
}: NexConsoleProps) {
  const defaults = useNex();
  const [inner, setInner] = useState<NexConsoleView>(defaultView);
  const view = controlled ?? inner;
  const setView = (next: NexConsoleView) => { if (controlled === undefined) setInner(next); onViewChange?.(next); };
  // Sin conexión no se escribe: la entrada no llegaría a ningún sitio.
  const waiting = state === 'waiting_for_input' && connection !== 'disconnected' && connection !== 'reconnecting';
  // La entrada pendiente vive aquí: cambiar de vista no la pierde.
  const [value, setValue] = useState('');
  const field = useRef<HTMLInputElement | null>(null);
  const log = useRef<HTMLDivElement | null>(null);
  const stuck = useRef(true);
  const id = useId();
  const ordered = useMemo(() => [...outputs].sort((a, b) => a.seq - b.seq), [outputs]);
  const preference = useMotionPreference();
  const level = motion ?? defaults.motion;
  const shown = useRef({ view, height: 0 });

  // Al cambiar de vista, el área de resultados pasa de su alto anterior al nuevo sin saltar.
  // Sólo entonces: la salida que llega en directo no se anima.
  useLayoutEffect(() => {
    const node = log.current;
    if (!node) return;
    const height = node.offsetHeight;
    const before = shown.current;
    if (before.view !== view && before.height && Math.abs(before.height - height) > 1 && canAnimate(level, preference) && typeof node.animate === 'function') {
      node.animate([{ height: `${before.height}px` }, { height: `${height}px` }], { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    }
    shown.current = { view, height };
  });

  // Cada pregunta empieza vacía y con el foco en su línea, sin desplazar la página.
  useEffect(() => {
    if (!waiting) return;
    field.current?.focus({ preventScroll: true });
  }, [waiting, ordered.length, view]);

  // Seguir el final sólo si quien lee está abajo.
  useLayoutEffect(() => {
    const node = log.current;
    if (node && stuck.current) node.scrollTop = node.scrollHeight;
  }, [ordered, waiting, view]);

  // Si la caja encoge (teclado virtual, giro, panel), volver al final cuando se escribe o se estaba abajo.
  useEffect(() => {
    const node = log.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (stuck.current || (field.current && document.activeElement === field.current)) { node.scrollTop = node.scrollHeight; stuck.current = true; }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const submit = (text: string) => {
    if (!waiting || !onSubmitInput) return;
    if (onSubmitInput(text)) setValue('');
  };

  const input = waiting && onSubmitInput && (
    <input
      ref={field}
      type="text"
      className="nx-console__input"
      aria-label="Entrada para el programa"
      value={value}
      maxLength={maxInputChars}
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="send"
      onChange={(e) => setValue(e.target.value)}
      onPaste={(e) => {
        const pasted = e.clipboardData.getData('text');
        if (!/[\r\n]/.test(pasted)) return;
        // Varias líneas: la primera contesta ya; el resto espera a las siguientes preguntas.
        e.preventDefault();
        const t = e.currentTarget;
        submit(`${value.slice(0, t.selectionStart ?? value.length)}${pasted}${value.slice(t.selectionEnd ?? value.length)}`);
      }}
      onKeyDown={(e) => {
        // Mientras se compone un carácter (IME), Intro lo confirma.
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submit(e.currentTarget.value); return; }
        const t = e.currentTarget;
        if (onInterrupt && e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'c' && t.selectionStart === t.selectionEnd) { e.preventDefault(); onInterrupt(); }
      }}
    />
  );

  const empty = ordered.length === 0 && !waiting && !(terminal && view === 'console');
  const running = RUNNING.has(state);
  // Una sola barra, arriba: ejecutar, estado y presentación; los resultados, justo debajo.
  const bar = (
    <header className="nx-console__bar">
      {onRun && (
        <NexButton density="compact" appearance="filled" className="nx-console__run" onClick={onRun} disabled={running || runDisabled}
          loading={state === 'starting'} loadingLabel="Preparando" iconStart={<NexIcon name="play" size={12} />}>
          {runLabel ?? <>Ejecutar{(ordered.length > 0 || state !== 'idle') && <span className="nx-console__again"> otra vez</span>}</>}
        </NexButton>
      )}
      <p className="nx-console__status" role="status">
        <span className="nx-console__dot" aria-hidden="true" />
        <span>{consoleStateLabel(state)}</span>
        {connection && connection !== 'connected' && <span className="nx-console__connection">{CONNECTION_LABEL[connection]}</span>}
        {waiting && <span className="nx-console__hint">escribe y pulsa Intro</span>}
        {queued > 0 && <span className="nx-console__hint">{queued === 1 ? '1 línea en espera' : `${queued} líneas en espera`}</span>}
        {durationMs !== undefined && !running && <span className="nx-console__hint">{formatDuration(durationMs)}</span>}
      </p>
      {actions}
      {onInterrupt && interruptButton && running && (
        <button type="button" className="nx-console__stop" onClick={onInterrupt} aria-keyshortcuts="Control+C">Detener</button>
      )}
      {viewToggle && <NexSegmented className="nx-console__views" aria-label="Presentación de la salida" density="compact" motion={motion} value={view} onValueChange={(v) => setView(v as NexConsoleView)}
        options={[{ value: 'console', label: 'Consola' }, { value: 'nexview', label: 'NexView' }]} />}
    </header>
  );
  return (
    <section className={cx('nx-console', className)} aria-label={label} data-view={view} data-state={state} data-connection={connection} data-nx-empty={empty ? '' : undefined} data-nx-fill={fill ? '' : undefined} data-nx-motion={level}>
      {chrome && bar}
      {stdin && !RUNNING.has(state) && (
        <details className="nx-console__stdin" open={stdin.value !== '' || undefined}>
          <summary>{stdin.label ?? 'Entrada anticipada'}{stdin.value && <span> · {stdin.value.split('\n').length} líneas</span>}</summary>
          <textarea aria-label={stdin.label ?? 'Entrada anticipada para el programa'} value={stdin.value} rows={3} spellCheck={false}
            placeholder="Una respuesta por línea" onChange={(e) => stdin.onChange(e.target.value)} />
        </details>
      )}
      <div
        ref={log}
        className="nx-console__log"
        role="log"
        aria-live="polite"
        aria-label={view === 'console' ? 'Salida del programa' : 'Resultados (NexView)'}
        style={height !== undefined && !fill ? { height: typeof height === 'number' ? `${height}px` : height } : undefined}
        onScroll={(e) => { const n = e.currentTarget; stuck.current = n.scrollHeight - n.scrollTop - n.clientHeight < 24; }}
        onMouseUp={() => { if (waiting && !getSelection()?.toString()) field.current?.focus({ preventScroll: true }); }}
      >
        {empty ? <p className="nx-console__empty">{emptyHint}</p> : (
          <div className="nx-console__body" key={view}>
            {dropped > 0 && <p className="nx-console__note">Se descartaron {dropped} salidas antiguas (límite de memoria de la sesión).</p>}
            {view === 'console'
              ? terminal ?? <ConsoleTranscript outputs={ordered} input={input} />
              : <NexViewEvents outputs={ordered} state={state} input={input} renderers={renderers} maxRows={maxRows} id={id} onFocusOutput={onFocusOutput} motion={level} />}
          </div>
        )}
        {truncated && <p className="nx-console__note">La salida se truncó al llegar al límite.</p>}
      </div>
    </section>
  );
}

function ConsoleTranscript({ outputs, input }: { outputs: readonly NexConsoleOutput[]; input: ReactNode }) {
  const segments = consoleTranscript(outputs);
  return (
    <div className="nx-console__text">
      {/* Clave por el primer seq del tramo: un fragmento nuevo sólo vuelve a pintar el último. */}
      {segments.map((s) => <Segment key={s.seq} stream={s.stream} text={s.stream === 'rich' ? `⟨${richName(s.output)} · en NexView⟩\n` : s.text} />)}
      {input}
    </div>
  );
}

const Segment = memo(function Segment({ stream, text }: { stream: string; text: string }) {
  if (stream === 'rich') return <span className="nx-console__marker" data-stream="rich">{text}</span>;
  if (stream === 'input') return <span><span className="nx-console__answer" data-stream="input">{text}</span>{'\n'}</span>;
  return <span data-stream={stream} className={stream === 'stdout' ? undefined : 'nx-console__err'}>{text}</span>;
});

function richName(o: NexConsoleOutput): string {
  switch (o.stream) {
    case 'table': return `tabla ${o.totalRows}×${o.columns.length}`;
    case 'image': return 'imagen';
    case 'json': return 'JSON';
    case 'figure': return o.title ? `figura «${o.title}»` : 'figura';
    case 'custom': return o.mime;
    default: return 'salida';
  }
}

/** Cada salida se normaliza una vez (por identidad y estado): en una sesión viva sólo cambia la región activa. */
const EVENTS = new WeakMap<NexConsoleOutput, { status: NexConsoleStatus; events: NexViewEvent[] }>();
function eventsOf(output: NexConsoleOutput, status: NexConsoleStatus): NexViewEvent[] {
  const hit = EVENTS.get(output);
  if (hit && hit.status === status) return hit.events;
  const events = normalizeNexViewEvents([output], status);
  EVENTS.set(output, { status, events });
  return events;
}

const CONNECTION_LABEL: Record<NexSessionConnection, string> = { connecting: 'Conectando…', connected: 'Conectada', reconnecting: 'Reconectando…', disconnected: 'Desconectada' };

/**
 * Columnas según el ancho REAL del contenedor (no del viewport), con
 * histéresis. Al cambiar la composición, cada resultado se desplaza desde
 * donde estaba (FLIP); un redimensionado que no cambia columnas no anima nada.
 */
function useComposition(host: React.RefObject<HTMLDivElement | null>, level: NexMotion) {
  const preference = useMotionPreference();
  const [columns, setColumns] = useState(1);
  const before = useRef<Map<string, DOMRect> | null>(null);
  useLayoutEffect(() => {
    const el = host.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setColumns((prev) => {
      const next = columnsFor(el.clientWidth, prev);
      if (next !== prev) before.current = new Map([...el.querySelectorAll<HTMLElement>('[data-nx-view-item]')].map((n) => [n.dataset.nxViewItem!, n.getBoundingClientRect()]));
      return next;
    });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [host]);
  useLayoutEffect(() => {
    const rects = before.current;
    const el = host.current;
    before.current = null;
    if (!rects || !el || !canAnimate(level, preference)) return;
    for (const n of el.querySelectorAll<HTMLElement>('[data-nx-view-item]')) {
      const old = rects.get(n.dataset.nxViewItem!);
      if (!old || typeof n.animate !== 'function') continue;
      const now = n.getBoundingClientRect();
      const dx = old.left - now.left;
      const dy = old.top - now.top;
      if (Math.abs(dx) + Math.abs(dy) > 1) n.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    }
  }, [columns, host, level, preference]);
  return columns;
}

function NexViewEvents({ outputs, state, input, renderers, maxRows, id, onFocusOutput, motion }: {
  outputs: readonly NexConsoleOutput[]; state: NexConsoleState; input: ReactNode; renderers?: NexConsoleRenderers; maxRows: number; id: string;
  onFocusOutput?: (output: NexConsoleOutput) => void; motion: NexMotion;
}) {
  const status = consoleStatus(state);
  const host = useRef<HTMLDivElement>(null);
  const columns = useComposition(host, motion);
  const events = useMemo(() => layoutNexViewEvents(outputs.flatMap((o) => eventsOf(o, status))), [outputs, status]);
  const sections = useMemo(() => composeNexView(events, { columns }), [events, columns]);
  const cell = (item: NexViewItem) => (
    <div key={item.key} className="nx-view__item" data-nx-view-item={item.key} data-role={item.role}
      style={{ flexGrow: item.weight, ...(item.aspect ? { '--nx-aspect': String(item.aspect) } : {}) } as React.CSSProperties}>
      <NexViewEventView event={item.event} renderers={renderers} maxRows={maxRows} id={`${id}-${item.key}`} />
      {onFocusOutput && item.event.kind === 'structured' && (
        <button type="button" className="nx-view__expand" aria-label={`Ampliar ${richName(item.event.output)}`} title="Ampliar"
          onClick={() => onFocusOutput((item.event as Extract<NexViewEvent, { kind: 'structured' }>).output)}>
          <NexIcon name="external" size={13} />
        </button>
      )}
    </div>
  );
  return (
    <div ref={host} className="nx-view" data-columns={columns}>
      {sections.map((section) => {
        if (section.kind === 'anchor') return cell(section.item);
        const keyOf = section.items[0]!.key;
        return (
          <div key={`${section.kind}:${keyOf}`} className={section.kind === 'gallery' ? 'nx-view__gallery' : 'nx-view__row'} data-count={section.items.length}
            role={section.group ? 'group' : undefined} aria-label={section.group}>
            {section.items.map(cell)}
          </div>
        );
      })}
      {input && <div className="nx-view__exchange" data-pending=""><span className="nx-view__exchange-label">Entrada</span>{input}</div>}
    </div>
  );
}

function NexViewEventView({ event, renderers, maxRows, id }: { event: NexViewEvent; renderers?: NexConsoleRenderers; maxRows: number; id: string }) {
  switch (event.kind) {
    case 'text':
      return <pre className="nx-view__text" data-stream={event.output.stream}>{event.output.text}</pre>;
    case 'input':
      return <p className="nx-view__exchange"><span className="nx-view__exchange-label">Entrada</span><span className="nx-view__answer">{event.output.text}</span></p>;
    case 'diagnostic':
      return <Diagnostic d={event.diagnostic} id={id} />;
    case 'printed':
      return <TableView table={event.structure.table} label={event.label} kind={event.structure.kind} confidence="parsed" maxRows={maxRows} />;
    case 'structured': {
      const o = event.output;
      if (o.stream === 'table') return <TableView table={o} label={o.title} confidence="confirmed" maxRows={maxRows} />;
      if (o.stream === 'json') return <JsonView value={o.value} truncated={o.truncated} />;
      if (o.stream === 'image') {
        const src = o.src ? safeImage(o.src) : null;
        return (
          <figure className="nx-view__figure">
            {src ? <img src={src} alt={o.alt ?? 'Imagen generada por el programa'} width={o.width} height={o.height} /> : renderers?.image?.(o) ?? <p className="nx-view__missing">Imagen no disponible</p>}
            {o.title && <figcaption>{o.title}</figcaption>}
          </figure>
        );
      }
      if (o.stream === 'figure') {
        return (
          <figure className="nx-view__figure">
            {renderers?.figure?.(o) ?? <p className="nx-view__missing">Figura {o.format}{o.title ? ` «${o.title}»` : ''}: la aplicación no aportó un renderizador.</p>}
            {o.title && <figcaption>{o.title}</figcaption>}
          </figure>
        );
      }
      if (o.stream === 'custom') return renderers?.custom?.(o) ?? <p className="nx-view__missing">Formato {o.mime} sin renderizador.</p>;
      return null;
    }
  }
}

/** Sólo imágenes de datos, blob o http(s): nada de `javascript:`. */
function safeImage(src: string): string | null {
  return /^(data:image\/(png|jpeg|webp|gif|svg\+xml)[;,]|blob:)/i.test(src) ? src : safeUrl(src, { allowMailto: false });
}

function TableView({ table, label, kind = 'table', confidence, maxRows }: {
  table: NexConsoleTableOutput; label?: string; kind?: 'table' | 'matrix' | 'vector'; confidence: 'confirmed' | 'parsed'; maxRows: number;
}) {
  const rows = table.rows.slice(0, maxRows);
  const hidden = table.totalRows - rows.length;
  const meta = table.display;
  const name = kind === 'matrix' ? 'Matriz' : kind === 'vector' ? 'Vector' : meta?.pythonType ?? 'Tabla';
  return (
    <figure className="nx-view__table" data-confidence={confidence}>
      <figcaption className="nx-view__caption">
        {label && <strong>{label}</strong>}
        <span>{name}</span>
        <span>{meta?.shape ? meta.shape.join(' × ') : `${table.totalRows} × ${table.columns.length}`}</span>
        {/* Lo inferido de la salida nunca se presenta como tipo del runtime. */}
        <span className="nx-view__evidence" title={confidence === 'confirmed' ? 'Declarado por el runtime' : 'Reconocido en el texto impreso; no es un tipo confirmado'}>
          {confidence === 'confirmed' ? 'runtime' : 'reconocido'}
        </span>
      </figcaption>
      <div className="nx-view__scroll">
        <table>
          {table.columns.some((c) => c !== '') && <thead><tr>{table.columns.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr></thead>}
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} data-numeric={typeof v === 'number' ? '' : undefined}>{cellText(v)}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {(hidden > 0 || table.truncated) && <p className="nx-view__note">{hidden > 0 ? `y ${hidden} filas más` : 'Contenido recortado'}</p>}
    </figure>
  );
}

function JsonView({ value, truncated }: { value: NexConsoleJsonValue; truncated?: boolean }) {
  return (
    <div className="nx-view__json">
      <JsonNode value={value} depth={0} />
      {truncated && <p className="nx-view__note">Contenido recortado</p>}
    </div>
  );
}

function JsonNode({ value, name, depth }: { value: NexConsoleJsonValue; name?: string; depth: number }) {
  const key = name !== undefined ? <span className="nx-view__key">{name}: </span> : null;
  if (value === null || typeof value !== 'object') {
    return <div className="nx-view__leaf">{key}<span data-type={value === null ? 'null' : typeof value}>{typeof value === 'string' ? `"${value}"` : String(value)}</span></div>;
  }
  const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value);
  return (
    <details className="nx-view__branch" open={depth < 1}>
      <summary>{key}<span className="nx-view__kind">{Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`}</span></summary>
      {entries.map(([k, v]) => <JsonNode key={k} name={k} value={v} depth={depth + 1} />)}
    </details>
  );
}

function Diagnostic({ d, id }: { d: NexViewDiagnostic; id: string }) {
  return (
    <div className="nx-view__diagnostic" data-severity={d.severity} role={d.severity === 'error' ? 'alert' : undefined} aria-labelledby={`${id}-t`}>
      <p className="nx-view__diag-title" id={`${id}-t`}>
        <span className="nx-view__diag-mark" aria-hidden="true">{d.severity === 'warning' ? '!' : d.severity === 'interrupted' ? '■' : d.severity === 'info' ? 'i' : '×'}</span>
        {d.title}
      </p>
      {d.explanation && <p className="nx-view__diag-text">{d.explanation}</p>}
      {d.action && <p className="nx-view__diag-text">{d.action}</p>}
      {(d.location || d.suggestions.length > 0) && (
        <p className="nx-view__diag-meta">
          {d.location && <span>{d.location.file}, línea {d.location.line}</span>}
          {d.suggestions.length > 0 && <span>¿Quisiste decir {d.suggestions.map((s, i) => <code key={s}>{i ? ', ' : ''}{s}</code>)}?</span>}
        </p>
      )}
      <details className="nx-view__original"><summary>Mensaje original{d.type ? ` · ${d.type}` : ''}</summary><pre>{d.original}</pre></details>
    </div>
  );
}

/** La instantánea de una sesión viva, para React. */
export function useNexSession(session: NexSessionStore) {
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
}

export interface NexLiveConsoleProps extends Omit<NexConsoleProps, 'outputs' | 'state' | 'onSubmitInput' | 'onInterrupt' | 'connection' | 'dropped' | 'terminal' | 'actions'> {
  session: NexSessionStore;
  transport: NexSessionTransport;
  /** Sólo para sesiones `pty`: un emulador ANSI/VT auténtico que pinta la pantalla. */
  emulator?: NexTerminalEmulator;
}

/**
 * NexConsole conectado a una sesión viva: lee el almacén, envía por el
 * transporte y ofrece SÓLO lo que la clase de sesión admite (escribir,
 * detener, cerrar, reconectar).
 */
export function NexLiveConsole({ session, transport, emulator, ...rest }: NexLiveConsoleProps) {
  const snap = useNexSession(session);
  const caps = snap.capabilities;
  const live = RUNNING.has(snap.state);
  const actions = (
    <>
      {caps.reconnect && transport.reconnect && snap.connection === 'disconnected' && (
        <button type="button" className="nx-console__action" onClick={transport.reconnect}>Reconectar</button>
      )}
      {caps.close && transport.close && live && (
        <button type="button" className="nx-console__action" onClick={transport.close}>Cerrar sesión</button>
      )}
    </>
  );
  return (
    <NexConsole
      {...rest}
      outputs={snap.outputs}
      state={snap.state}
      connection={snap.connection}
      dropped={snap.dropped}
      onSubmitInput={caps.input ? (text) => transport.send(text) : undefined}
      onInterrupt={caps.interrupt ? transport.interrupt : undefined}
      terminal={caps.screen ? <NexTerminalSurface session={session} transport={transport} emulator={emulator} /> : undefined}
      actions={actions}
    />
  );
}

/**
 * La superficie donde un emulador real pinta una sesión PTY. Le entrega los
 * bytes tal cual (sin interpretar ANSI), le pasa lo tecleado al transporte y
 * le comunica el tamaño. Sin emulador, lo dice; los bytes se conservan.
 */
export function NexTerminalSurface({ session, transport, emulator }: { session: NexSessionStore; transport: NexSessionTransport; emulator?: NexTerminalEmulator }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el || !emulator) return;
    emulator.mount(el);
    let cursor = 0;
    const pump = () => { const { data, next } = session.takeBytes(cursor); if (data) emulator.write(data); cursor = next; };
    pump();
    const unsubscribe = session.subscribe(pump);
    const offData = emulator.onData((data) => { transport.send(data); });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      const size = emulator.fit?.();
      if (size) transport.resize?.(size);
    });
    observer?.observe(el);
    return () => { unsubscribe(); offData(); observer?.disconnect(); emulator.dispose(); };
  }, [session, transport, emulator]);
  if (!emulator) return <p className="nx-console__empty">Esta sesión es una terminal de pantalla. Conecta un emulador ANSI/VT para verla; su salida se conserva.</p>;
  return <div ref={host} className="nx-console__terminal" />;
}
