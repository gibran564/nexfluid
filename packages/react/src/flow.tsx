'use client';

/**
 * NexFlow: una hoja editorial de bloques vivos.
 *
 * NexFlow es la superficie del documento: aplica la tipografía editorial de
 * NexFluidUI (la misma de NexMarkdown) y su ritmo. Cada `NexEditorialBlock`
 * es una membrana de contenido sin superficie en reposo: el documento se lee
 * de corrido, y un bloque revela su límite al acercarse, lo hace explícito al
 * seleccionarlo y conserva su identidad para mover, insertar o expandir.
 *
 * - `mode="read"`: no se pinta ni un control ni un contorno.
 * - `mode="edit"`: el contorno y las herramientas emergen al interactuar. Las
 *   herramientas ocupan siempre el mismo sitio: aparecer no mueve el texto.
 * - Inserción: un único punto de inserción aparece en el hueco más cercano al
 *   puntero (no un botón por elemento); con teclado o con el dedo, desde el
 *   margen del elemento seleccionado; y la aplicación puede abrir la paleta
 *   de comandos desde su propio editor («/» en una línea vacía) con
 *   `useNexFlow().openInsert`.
 * - Movimiento: cuando cambia la ESTRUCTURA (insertar, borrar, reordenar),
 *   los elementos se desplazan desde donde estaban hasta su sitio (FLIP) y lo
 *   nuevo emerge en su hueco. Escribir no cambia la estructura, así que nada
 *   se anima mientras se escribe.
 *
 * NexFlow no conoce el modelo de documento: anuncia `onSelect`, `onReorder` y
 * las opciones de `insertItems(at)`, y la aplicación decide y vuelve a pintar.
 */
import {
  Children, Component, createContext, Fragment, isValidElement, useCallback, useContext, useEffect, useRef, useState,
  type FocusEvent, type HTMLAttributes, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { cx, edgeScrollStep, keyboardMove, reorderSlot, type NexDensity, type NexMotion } from '@eclipsis/components';
import type { MotionPreference } from '@eclipsis/core';
import { canAnimate, useMotionPreference, useNex } from './provider.tsx';
import { NexIcon } from './icon.tsx';
import { NexCommandMenu, NexMenu, type NexMenuItem } from './menu.tsx';
import { NexSurface } from './surface.tsx';

export type NexFlowMode = 'read' | 'edit';

interface InsertRequest {
  at: number;
  anchor: HTMLElement;
  query?: string;
  /** A dónde vuelve el foco si se cierra sin elegir. */
  returnFocus?: HTMLElement | null;
}

export interface NexFlowController {
  mode: NexFlowMode;
  selectedId: string | null;
  /** Abre la paleta de inserción para el hueco `at`, junto a `anchor`. */
  openInsert: (request: InsertRequest) => void;
  closeInsert: () => void;
  /** Hay opciones de inserción y se está editando. */
  canInsert: boolean;
  /** Hay algo que insertar en el hueco `at` (p. ej. no entre dos piezas fijadas). */
  canInsertAt: (at: number) => boolean;
}

interface FlowContext extends NexFlowController {
  select: (id: string) => void;
  draggingId: string | null;
  reorderable: boolean;
  moveByKey: (id: string, key: string) => boolean;
  /** Índice del elemento en la hoja (en el DOM). */
  indexOf: (id: string) => number;
  /** Barra al pie de la hoja estrecha, donde el seleccionado pone sus controles. */
  dock: HTMLElement | null;
}

const Ctx = createContext<FlowContext | null>(null);

/** Controlador de la hoja más cercana: modo, selección y paleta de inserción. */
export function useNexFlow(): NexFlowController | null {
  return useContext(Ctx);
}

const ITEM = '[data-nx-flow-item]';
const itemsOf = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>(`:scope > ${ITEM}`)];
const defaultAnnounce = (label: string, position: number, total: number) => `${label}: posición ${position} de ${total}`;

/** Identidades de los elementos en orden, mirando dentro de fragmentos. */
function idsOf(children: ReactNode): string[] {
  const ids: string[] = [];
  const walk = (nodes: ReactNode) => Children.forEach(nodes, (child) => {
    if (!isValidElement<{ blockId?: string; children?: ReactNode }>(child)) return;
    if (child.type === Fragment) walk(child.props.children);
    else if (typeof child.props.blockId === 'string') ids.push(child.props.blockId);
  });
  walk(children);
  return ids;
}

function durationOf(el: HTMLElement): number {
  const raw = getComputedStyle(el).getPropertyValue('--nx-motion-content-duration').trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 240;
  return raw.endsWith('ms') ? value : raw.endsWith('s') ? value * 1000 : value;
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return (document.scrollingElement as HTMLElement | null) ?? null;
}

/**
 * Mide la hoja ANTES de que React aplique un cambio de estructura y anima
 * desde ahí después (FLIP). Es una clase porque sólo `getSnapshotBeforeUpdate`
 * ve el DOM viejo con las medidas reales del momento —con lo que se haya
 * escrito desde la última vez—, sin medir en cada pulsación.
 */
class FlowMotion extends Component<{ host: RefObject<HTMLDivElement | null>; signature: string; level: NexMotion; preference: MotionPreference | null; children: ReactNode }> {
  getSnapshotBeforeUpdate(prev: { signature: string }): Map<string, DOMRect> | null {
    const host = this.props.host.current;
    if (prev.signature === this.props.signature || !host) return null;
    return new Map(itemsOf(host).map((el) => [el.dataset.nxFlowItem!, el.getBoundingClientRect()]));
  }

  componentDidUpdate(_: unknown, __: unknown, before: Map<string, DOMRect> | null) {
    const host = this.props.host.current;
    if (!before || !host || typeof HTMLElement.prototype.animate !== 'function') return;
    if (!canAnimate(this.props.level, this.props.preference)) return;
    const duration = durationOf(host);
    const easing = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
    for (const el of itemsOf(host)) {
      const old = before.get(el.dataset.nxFlowItem!);
      if (!old) {
        // Lo nuevo emerge en su hueco; el resto ya se desplazó para dejárselo.
        el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration, easing, delay: duration * 0.25, fill: 'backwards' });
        continue;
      }
      const dy = old.top - el.getBoundingClientRect().top;
      if (Math.abs(dy) > 0.5) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration, easing });
    }
  }

  render() { return this.props.children; }
}

export interface NexFlowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** `read`: sólo contenido. `edit`: herramientas contextuales. Por defecto, `read`. */
  mode?: NexFlowMode;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Sin él no hay asas ni reordenamiento con teclado. */
  onReorder?: (from: number, to: number) => void;
  /** Opciones para insertar en el hueco `at` (0 = al principio). Sin él, no se ofrece insertar. */
  insertItems?: (at: number) => readonly NexMenuItem[];
  /** Nombre accesible de la paleta de inserción. */
  insertLabel?: string;
  announceMove?: (label: string, position: number, total: number) => string;
  density?: NexDensity;
  motion?: NexMotion;
  children?: ReactNode;
}

export function NexFlow({
  mode = 'read', selectedId = null, onSelect, onReorder, insertItems, insertLabel = 'Insertar', announceMove = defaultAnnounce,
  density, motion, className, children, ...rest
}: NexFlowProps) {
  const defaults = useNex();
  const level = motion ?? defaults.motion;
  const preference = useMotionPreference();
  const host = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<number | null>(null);
  const [gap, setGap] = useState<{ at: number; y: number } | null>(null);
  const [insert, setInsert] = useState<InsertRequest | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [dock, setDock] = useState<HTMLElement | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const dragCleanup = useRef<(() => void) | null>(null);
  const pointerItem = useRef<string | null>(null);
  const plus = useRef<HTMLButtonElement>(null);
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const editing = mode === 'edit';
  const reorderable = editing && Boolean(onReorder);
  const canInsert = editing && Boolean(insertItems);

  useEffect(() => () => dragCleanup.current?.(), []);
  useEffect(() => { if (!editing) { setInsert(null); setGap(null); } }, [editing]);

  // Tras un movimiento con teclado: el foco sigue en el asa del que se movió y se anuncia.
  useEffect(() => {
    const id = pendingFocus.current;
    const el = host.current;
    if (!id || !el) return;
    pendingFocus.current = null;
    const items = itemsOf(el);
    const moved = items.find((b) => b.dataset.nxFlowItem === id);
    const handle = moved?.querySelector<HTMLElement>('[data-nx-drag-handle]');
    if (handle && document.activeElement !== handle) handle.focus({ preventScroll: true });
    if (moved) setAnnouncement(announceMove(moved.dataset.nxLabel ?? '', items.indexOf(moved) + 1, items.length));
  });

  // El orden sale de los hijos de ESTE render, no del DOM: es válido mientras se pinta.
  const ids = idsOf(children);
  const indexOf = (id: string) => ids.indexOf(id);
  const canInsertAt = (at: number) => canInsert && insertItems!(at).length > 0;

  const moveByKey = useCallback((id: string, key: string) => {
    const el = host.current;
    if (!el || !onReorderRef.current) return false;
    const items = itemsOf(el);
    const from = items.findIndex((b) => b.dataset.nxFlowItem === id);
    const to = from < 0 ? null : keyboardMove(key, from, items.length);
    if (to === null) return false;
    pendingFocus.current = id;
    onReorderRef.current(from, to);
    return true;
  }, []);

  const select = useCallback((id: string) => { if (id !== selectedId) onSelect?.(id); }, [onSelect, selectedId]);

  useEffect(() => {
    const reset = () => queueMicrotask(() => { pointerItem.current = null; });
    addEventListener('pointerup', reset, true);
    addEventListener('pointercancel', reset, true);
    return () => { removeEventListener('pointerup', reset, true); removeEventListener('pointercancel', reset, true); };
  }, []);

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = host.current;
    const handle = (event.target as Element).closest<HTMLElement>('[data-nx-drag-handle]');
    if (!el || !handle || !onReorderRef.current || event.button !== 0) return;
    const element = handle.closest<HTMLElement>(ITEM);
    const id = element?.dataset.nxFlowItem;
    if (!element || !id || element.parentElement !== el) return;
    event.preventDefault();
    handle.setPointerCapture?.(event.pointerId);
    const startY = event.clientY;
    let pointerY = event.clientY;
    let scrolled = 0;
    let slot: number | null = null;
    const scroller = scrollParent(el);
    const from = itemsOf(el).indexOf(element);
    let frame = 0;
    setDraggingId(id);
    setGap(null);
    const place = () => {
      const rects = itemsOf(el).filter((b) => b !== element).map((b) => b.getBoundingClientRect());
      slot = reorderSlot(rects.map((r) => r.top + r.height / 2), pointerY);
      const box = el.getBoundingClientRect();
      const before = rects[slot - 1];
      const after = rects[slot];
      const y = before && after ? (before.bottom + after.top) / 2 : before ? before.bottom + 4 : after ? after.top - 4 : box.top;
      setIndicator(slot === from ? null : y - box.top);
      element.style.transform = `translateY(${pointerY - startY + scrolled}px)`;
    };
    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!scroller) return;
      const r = scroller === document.scrollingElement ? new DOMRect(0, 0, innerWidth, innerHeight) : scroller.getBoundingClientRect();
      const step = edgeScrollStep(pointerY, r.top, r.bottom);
      if (!step) return;
      const top = scroller.scrollTop;
      scroller.scrollTop += step;
      const moved = scroller.scrollTop - top;
      if (moved) { scrolled += moved; place(); }
    };
    const finish = (apply: boolean) => {
      const go = apply && slot !== null && slot !== from && from >= 0;
      dragCleanup.current?.();
      if (go) onReorderRef.current?.(from, slot!);
    };
    const move = (next: PointerEvent) => { pointerY = next.clientY; place(); };
    const up = () => finish(true);
    const cancel = () => finish(false);
    const key = (next: globalThis.KeyboardEvent) => { if (next.key === 'Escape') { next.preventDefault(); next.stopPropagation(); finish(false); } };
    dragCleanup.current = () => {
      cancelAnimationFrame(frame);
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', cancel);
      removeEventListener('keydown', key, true);
      // Sin desplazamiento residual: el FLIP del cambio parte de donde se soltó,
      // porque la medida previa se toma con el bloque aún desplazado.
      requestAnimationFrame(() => { element.style.transform = ''; });
      setDraggingId(null);
      setIndicator(null);
      dragCleanup.current = null;
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', cancel);
    addEventListener('keydown', key, true);
    frame = requestAnimationFrame(tick);
    place();
  };

  /** Punto de inserción: el hueco más cercano al puntero, si está a menos de 14 px. */
  const trackGap = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = host.current;
    if (!canInsert || !el || event.pointerType === 'touch' || draggingId || insert) return;
    if ((event.target as Element).closest('.nx-flow-item__gutter, .nx-flow-item__tools, .nx-flow__insert')) return;
    const rects = itemsOf(el).map((b) => b.getBoundingClientRect());
    const box = el.getBoundingClientRect();
    const edges = rects.length === 0 ? [box.top + 12]
      : [rects[0]!.top, ...rects.slice(1).map((r, i) => (rects[i]!.bottom + r.top) / 2), rects[rects.length - 1]!.bottom];
    let best = -1;
    let distance = Infinity;
    edges.forEach((y, i) => { const d = Math.abs(event.clientY - y); if (d < distance) { distance = d; best = i; } });
    const next = distance <= 14 && canInsertAt(best) ? { at: best, y: edges[best]! - box.top } : null;
    setGap((current) => (current?.at === next?.at && current?.y === next?.y ? current : next));
  };

  const openInsert = useCallback((request: InsertRequest) => setInsert(request), []);
  const closeInsert = useCallback(() => setInsert(null), []);
  const onCommandClose = useCallback(() => { setInsert(null); setGap(null); }, []);
  const controller: FlowContext = {
    mode, selectedId, openInsert, closeInsert, canInsert, canInsertAt, select, draggingId, reorderable, moveByKey, indexOf, dock,
  };

  return (
    <Ctx.Provider value={controller}>
      <div
        {...rest}
        className={cx('nx-flow', 'nx-markdown', className)}
        data-nx-mode={mode}
        data-nx-density={density}
        data-nx-motion={level}
        data-nx-dragging={draggingId ? '' : undefined}
      >
        <div
          ref={host}
          className="nx-flow__page"
          onPointerDown={(event) => { if (reorderable) startDrag(event); }}
          onPointerDownCapture={(event) => {
            if (!editing) return;
            const id = (event.target as Element).closest<HTMLElement>(ITEM)?.dataset.nxFlowItem;
            if (id && event.isPrimary && event.button === 0) { pointerItem.current = id; select(id); }
          }}
          onFocusCapture={(event) => {
            if (!editing) return;
            const id = (event.target as Element).closest<HTMLElement>(ITEM)?.dataset.nxFlowItem;
            if (id && pointerItem.current !== id) select(id);
          }}
          onPointerMove={trackGap}
          onPointerLeave={() => { if (!insert) setGap(null); }}
        >
          <FlowMotion host={host} signature={ids.join(' ')} level={level} preference={preference}>{children}</FlowMotion>
          {indicator !== null && <div className="nx-flow__drop" style={{ top: indicator }} aria-hidden="true" />}
          {canInsert && gap && (
            <div className="nx-flow__insert" style={{ top: gap.y }} data-open={insert ? '' : undefined}>
              <button
                ref={plus}
                type="button"
                tabIndex={-1}
                className="nx-flow__plus"
                aria-label={`${insertLabel}: posición ${gap.at + 1}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => plus.current && openInsert({ at: gap.at, anchor: plus.current })}
              >
                <NexIcon name="plus" size={14} />
              </button>
              <span className="nx-flow__insert-line" aria-hidden="true" />
            </div>
          )}
          <span className="nx-visually-hidden" role="status" aria-live="polite">{announcement}</span>
          {/* Hoja estrecha: sin márgenes, los controles del seleccionado van al pie (sticky, alto 0). */}
          {editing && <div ref={setDock} className="nx-flow__dock" />}
        </div>
        {canInsert && (
          <NexCommandMenu
            open={Boolean(insert)}
            anchor={insert?.anchor ?? null}
            initialQuery={insert?.query}
            returnFocus={insert?.returnFocus}
            items={insert ? insertItems!(insert.at) : []}
            label={insertLabel}
            motion={level}
            onClose={onCommandClose}
          />
        )}
      </div>
    </Ctx.Provider>
  );
}

export type NexEditorialBlockState = 'rest' | 'selected' | 'editing' | 'running' | 'error' | 'readonly';

export interface NexEditorialBlockProps extends Omit<HTMLAttributes<HTMLElement>, 'id'> {
  /** Identidad estable (la misma que la clave de React). */
  blockId: string;
  /** Nombre accesible en edición: «Bloque 3 de 12: Código». */
  label: string;
  /** Categoría semántica libre (`heading`, `code`, `sheet`…): ritmo y estilos de la aplicación. */
  kind?: string;
  /**
   * Presencia en reposo. `quiet`: sin límite visible (texto que se lee de
   * corrido). `subtle`: un límite apenas insinuado, para lo que se ejecuta o
   * se manipula (código, datos, conectores) y conviene reconocer de un vistazo.
   */
  presence?: 'quiet' | 'subtle';
  /** `text` la medida de lectura; `wide` sale a los márgenes; `full` todo el ancho. */
  width?: 'text' | 'wide' | 'full';
  /** Fuerza la selección; por defecto la decide NexFlow. */
  selected?: boolean;
  /** Trabajo en curso (ejecución, generación): pulso en el contorno y `aria-busy`. */
  busy?: boolean;
  /** Error de la última operación: contorno y marca «!» (no sólo color). El texto lo pone la aplicación. */
  error?: boolean;
  readOnly?: boolean;
  /** `false`: sin asa (contenido fijado por otra persona). */
  movable?: boolean;
  /** Acciones del bloque (menú «⋯»). */
  actions?: readonly NexMenuItem[];
  /** Herramientas propias del seleccionado (ejecutar, cambiar de vista…). */
  tools?: ReactNode;
  /** Abrir el entorno especializado (Focus). Añade «Expandir» a las herramientas. */
  onFocusRequest?: () => void;
  focusLabel?: string;
  /** La aplicación tiene abierto el modo enfoque de este bloque (lo pinta ella; aquí sólo se refleja). */
  expanded?: boolean;
  motion?: NexMotion;
  children?: ReactNode;
}

/**
 * NexEditorialBlock: un bloque que se lee como documento y se revela al tocarlo.
 *
 * Es una NexSurface de contenido (familia editorial, material transparente,
 * sin borde en reposo) con la membrana viva SÓLO mientras se interactúa:
 *
 * - reposo: sin superficie; el contenido es parte de la hoja.
 * - puntero o foco: el contorno emerge con la física de la membrana (el borde
 *   más cercano al puntero se tensa) y aparecen las herramientas.
 * - seleccionado: el límite queda explícito con el acento de interacción.
 * - editando (foco dentro): el límite se mantiene y la geometría se calma;
 *   nada se mueve junto al cursor.
 * - ocupado / error / sólo lectura: estados del contorno y marcas que no
 *   dependen sólo del color.
 *
 * No sabe nada del documento: identidad, etiqueta y callbacks. Funciona dentro
 * de NexFlow (selección, orden, inserción) o suelto, con `selected` propio.
 */
export function NexEditorialBlock({
  blockId, label, kind, presence = 'quiet', width = 'text', selected: forced, busy, error, readOnly, movable = true,
  actions, tools, onFocusRequest, focusLabel = 'Expandir', expanded, motion, className, children, ...rest
}: NexEditorialBlockProps) {
  const flow = useContext(Ctx);
  const editing = flow ? flow.mode === 'edit' : true;
  const selected = forced ?? (editing && flow?.selectedId === blockId);
  const [focusInside, setFocusInside] = useState(false);
  const insertBelow = useRef<HTMLButtonElement>(null);
  const insertDocked = useRef<HTMLButtonElement>(null);
  const reorderable = Boolean(flow?.reorderable && movable && !readOnly);
  const insertable = Boolean(flow?.canInsertAt(flow.indexOf(blockId) + 1));
  const insertAfter = (anchor: HTMLElement | null) => {
    if (flow && anchor) flow.openInsert({ at: flow.indexOf(blockId) + 1, anchor });
  };
  const onHandleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (flow?.moveByKey(blockId, event.key)) event.preventDefault();
  };
  const state: NexEditorialBlockState = busy ? 'running' : error ? 'error' : readOnly ? 'readonly'
    : selected && focusInside ? 'editing' : selected ? 'selected' : 'rest';
  const ownTools = (tools || onFocusRequest) && (
    <>
      {tools}
      {onFocusRequest && (
        <button type="button" className="nx-editorial-block__tool" onClick={onFocusRequest} aria-label={`${focusLabel} ${label}`} title={focusLabel}
          aria-haspopup="dialog" aria-expanded={expanded ?? false} data-nx-focus-trigger="">
          <NexIcon name="external" size={14} />
        </button>
      )}
    </>
  );
  const menu = actions && actions.length > 0 && (
    <NexMenu label={`Acciones de ${label}`} items={actions} density="compact" align="end" className="nx-editorial-block__menu" />
  );
  // Margen izquierdo: lo que actúa sobre el LUGAR del bloque (mover, insertar después).
  const gutter = editing && (reorderable || insertable) && (
    <div className="nx-editorial-block__gutter">
      {reorderable && (
        <button type="button" className="nx-editorial-block__tool" data-nx-drag-handle="" onKeyDown={onHandleKey}
          aria-label={`Mover ${label}: arrastra o usa las flechas arriba y abajo`} title="Arrastra para mover">
          <NexIcon name="grip" size={14} />
        </button>
      )}
      {insertable && (
        <button ref={insertBelow} type="button" className="nx-editorial-block__tool nx-editorial-block__add" aria-label={`Insertar después de ${label}`}
          onClick={() => insertAfter(insertBelow.current)}>
          <NexIcon name="plus" size={14} />
        </button>
      )}
    </div>
  );
  // Sobre el borde superior derecho: lo que actúa sobre el CONTENIDO (herramientas, Focus, acciones).
  const toolbar = editing && (menu || ownTools) && (
    <div className="nx-editorial-block__tools" role="group" aria-label={`Herramientas de ${label}`}>
      {ownTools}
      {menu}
    </div>
  );
  // Hoja estrecha: los mismos controles del seleccionado, en la barra del pie (sin asa: subir y bajar).
  const docked = editing && selected && flow?.dock && createPortal(
    <div className="nx-flow__dockbar" role="group" aria-label={`Herramientas de ${label}`}>
      {reorderable && (
        <>
          <button type="button" className="nx-editorial-block__tool" aria-label={`Subir ${label}`} onClick={() => flow.moveByKey(blockId, 'ArrowUp')}>
            <NexIcon name="arrow-left" size={14} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <button type="button" className="nx-editorial-block__tool" aria-label={`Bajar ${label}`} onClick={() => flow.moveByKey(blockId, 'ArrowDown')}>
            <NexIcon name="arrow-left" size={14} style={{ transform: 'rotate(-90deg)' }} />
          </button>
        </>
      )}
      {actions && actions.length > 0 && <NexMenu label={`Acciones de ${label}`} items={actions} density="compact" placement="top" />}
      {insertable && (
        <button ref={insertDocked} type="button" className="nx-editorial-block__tool" aria-label={`Insertar después de ${label}`} onClick={() => insertAfter(insertDocked.current)}>
          <NexIcon name="plus" size={14} />
        </button>
      )}
      {ownTools && <span className="nx-flow__dock-tools">{ownTools}</span>}
    </div>,
    flow.dock,
  );
  return (
    <>
      <NexSurface
        {...rest}
        kind="content"
        shape="editorial"
        material="clear"
        quiet
        interactive={editing}
        live={busy ? true : editing ? 'engaged' : false}
        calm={state === 'editing'}
        focusWithin
        selected={selected}
        motion={motion}
        className={cx('nx-editorial-block', className)}
        ariaRole={editing ? 'group' : undefined}
        aria-label={editing ? label : undefined}
        aria-busy={busy || undefined}
        aria-invalid={error || undefined}
        data-nx-flow-item={blockId}
        data-nx-label={label}
        data-nx-kind={kind}
        data-nx-block-state={state}
        data-nx-presence={editing && presence === 'subtle' ? 'subtle' : undefined}
        data-nx-width={width === 'text' ? undefined : width}
        data-nx-dragging={flow?.draggingId === blockId ? '' : undefined}
        data-nx-expanded={expanded ? '' : undefined}
        onFocus={(e: FocusEvent<HTMLElement>) => { if (e.target !== e.currentTarget) setFocusInside(true); }}
        onBlur={(e: FocusEvent<HTMLElement>) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusInside(false); }}
      >
        {gutter}
        {toolbar}
        {error && <span className="nx-editorial-block__mark" aria-hidden="true">!</span>}
        <div className="nx-editorial-block__content">{children}</div>
      </NexSurface>
      {docked}
    </>
  );
}
