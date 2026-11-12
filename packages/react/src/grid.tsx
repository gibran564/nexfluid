'use client';

/**
 * NexGrid: composición editorial e interactiva en cuadrícula.
 *
 * `NexGrid` declara columnas y separación (tokens); cada `NexGridItem` ocupa
 * `span` columnas y `rowSpan` filas. El ancho REAL del contenedor decide la
 * adaptación (container query, o `space` forzado): en espacio estrecho cada
 * elemento pasa a `spanCompact` (por defecto, todo el ancho).
 *
 * Edición (opt-in): con `onReorder` aparece un asa por elemento para moverlo
 * con el puntero (2D) o con las flechas (←/→ en orden de lectura, ↑/↓ a la
 * fila vecina, Inicio/Fin); con `onResize`, Mayús+←/→ encoge o crece una
 * columna. Cada cambio se anuncia en una región viva. NexGrid no conoce el
 * modelo: anuncia y la aplicación decide y vuelve a pintar (como NexFlow).
 *
 * Con NexFlow: NexFlow sigue siendo el motor editorial. Una cuadrícula vive
 * DENTRO de un `NexEditorialBlock` y sus elementos los ordena NexGrid, no
 * NexFlow: cada nivel tiene un único dueño del orden, sin dos editores
 * compitiendo por el mismo estado. Anidar más de `NEX_GRID_LIMITS.maxDepth`
 * niveles apila la cuadrícula interior en una columna.
 */
import {
  Children, createContext, isValidElement, useCallback, useContext, useEffect, useRef, useState,
  type CSSProperties, type HTMLAttributes, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react';
import {
  NEX_GRID_LIMITS, clampColumns, clampSpan, cx, gridGapValue, gridKeyboardMove, gridReorderSlot, gridResizeStep,
  type NexGridGap, type NexMotion, type NexSpace,
} from '@nexfluid/components';
import { canAnimate, useMotionPreference, useNex } from './provider.tsx';

interface GridContext {
  columns: number;
  depth: number;
  editable: boolean;
  resizable: boolean;
  selectedId: string | null;
  select: (id: string) => void;
  onHandleKey: (id: string, event: KeyboardEvent<HTMLButtonElement>) => void;
  draggingId: string | null;
}

const Ctx = createContext<GridContext | null>(null);
const Depth = createContext(0);

export interface NexGridProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Columnas (1..12). Por defecto 12. */
  columns?: number;
  /** Separación por token. Por defecto `medium`. */
  gap?: NexGridGap;
  /** Fuerza el espacio; sin él, decide el ancho del contenedor (< 560 px = estrecho). */
  space?: NexSpace;
  /** Mover elementos: índice de origen y destino en orden de lectura. */
  onReorder?: (from: number, to: number) => void;
  /** Cambiar el ancho (en columnas) de un elemento. */
  onResize?: (id: string, span: number) => void;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Texto de la región viva al mover: «Gráfica: posición 2 de 4». */
  announceMove?: (label: string, position: number, total: number) => string;
  announceResize?: (label: string, span: number, columns: number) => string;
  motion?: NexMotion;
  children?: ReactNode;
}

interface ItemInfo { id: string; span: number; label: string }

function itemsOf(children: ReactNode, columns: number): ItemInfo[] {
  const items: ItemInfo[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<NexGridItemProps>(child) || typeof child.props.itemId !== 'string') return;
    items.push({ id: child.props.itemId, span: clampSpan(child.props.span ?? columns, columns), label: child.props.label ?? child.props.itemId });
  });
  return items;
}

const defaultMove = (label: string, position: number, total: number) => `${label}: posición ${position} de ${total}`;
const defaultResize = (label: string, span: number, columns: number) => `${label}: ${span} de ${columns} columnas`;

export function NexGrid({
  columns: rawColumns = 12, gap = 'medium', space, onReorder, onResize, selectedId: controlledSelected, onSelect,
  announceMove = defaultMove, announceResize = defaultResize, motion, className, style, children, ...rest
}: NexGridProps) {
  const depth = useContext(Depth) + 1;
  const capped = depth > NEX_GRID_LIMITS.maxDepth;
  const columns = capped ? 1 : clampColumns(rawColumns);
  const defaults = useNex();
  const level = motion ?? defaults.motion;
  const preference = useMotionPreference();
  const track = useRef<HTMLDivElement>(null);
  const [ownSelected, setOwnSelected] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ left: number; top: number; height: number } | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const before = useRef<Map<string, DOMRect> | null>(null);
  const items = itemsOf(children, columns);
  const editable = Boolean(onReorder) && !capped;
  const resizable = Boolean(onResize) && !capped;
  const selectedId = controlledSelected !== undefined ? controlledSelected : ownSelected;
  const latest = useRef({ items, onReorder, onResize, columns });
  latest.current = { items, onReorder, onResize, columns };

  const select = useCallback((id: string) => {
    if (controlledSelected === undefined) setOwnSelected(id);
    onSelect?.(id);
  }, [controlledSelected, onSelect]);

  const measure = () => {
    const host = track.current;
    if (!host) return null;
    return new Map([...host.querySelectorAll<HTMLElement>(':scope > [data-nx-grid-item]')].map((el) => [el.dataset.nxGridItem!, el.getBoundingClientRect()]));
  };

  // FLIP tras un cambio de orden o tamaño (sólo si el movimiento está permitido).
  const signature = items.map((item) => `${item.id}:${item.span}`).join(' ');
  useEffect(() => {
    const host = track.current;
    const old = before.current;
    before.current = null;
    if (host && old && typeof HTMLElement.prototype.animate === 'function' && canAnimate(level, preference)) {
      for (const el of host.querySelectorAll<HTMLElement>(':scope > [data-nx-grid-item]')) {
        const prev = old.get(el.dataset.nxGridItem!);
        if (!prev) continue;
        const now = el.getBoundingClientRect();
        const dx = prev.left - now.left;
        const dy = prev.top - now.top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
        }
      }
    }
    const id = pendingFocus.current;
    pendingFocus.current = null;
    if (id && host) {
      const item = [...host.querySelectorAll<HTMLElement>(':scope > [data-nx-grid-item]')].find((el) => el.dataset.nxGridItem === id);
      const handle = item?.querySelector<HTMLElement>(':scope > [data-nx-grid-handle]');
      if (handle && document.activeElement !== handle) handle.focus({ preventScroll: true });
    }
  }, [signature, level, preference]);

  const onHandleKey = useCallback((id: string, event: KeyboardEvent<HTMLButtonElement>) => {
    const { items: current, onReorder: reorder, onResize: resize, columns: cols } = latest.current;
    const index = current.findIndex((item) => item.id === id);
    if (index < 0) return;
    const item = current[index]!;
    if (event.shiftKey && resize) {
      const next = gridResizeStep(event.key, item.span, cols);
      if (next === null) return;
      event.preventDefault();
      before.current = measure();
      pendingFocus.current = id;
      resize(id, next);
      setAnnouncement(announceResize(item.label, next, cols));
      return;
    }
    if (!reorder || event.altKey || event.metaKey || event.ctrlKey) return;
    const target = gridKeyboardMove(event.key, index, current.map((entry) => entry.span), cols);
    if (target === null) return;
    event.preventDefault();
    before.current = measure();
    pendingFocus.current = id;
    reorder(index, target);
    setAnnouncement(announceMove(item.label, target + 1, current.length));
  }, [announceMove, announceResize]);

  /** Arrastre con puntero desde el asa: el destino se calcula en 2D. */
  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const handle = (event.target as Element).closest<HTMLElement>('[data-nx-grid-handle]');
    const host = track.current;
    if (!handle || !host || !editable || event.button !== 0) return;
    const element = handle.closest<HTMLElement>('[data-nx-grid-item]');
    if (!element || element.parentElement !== host) return;
    const id = element.dataset.nxGridItem!;
    event.preventDefault();
    handle.setPointerCapture?.(event.pointerId);
    const all = [...host.querySelectorAll<HTMLElement>(':scope > [data-nx-grid-item]')];
    const from = all.indexOf(element);
    const start = { x: event.clientX, y: event.clientY };
    let slot: number | null = null;
    setDraggingId(id);
    select(id);
    const place = (x: number, y: number) => {
      const others = all.filter((el) => el !== element);
      const rects = others.map((el) => el.getBoundingClientRect());
      slot = gridReorderSlot(rects, { x, y });
      const box = host.getBoundingClientRect();
      const anchor = rects[slot] ?? rects[slot - 1];
      if (anchor) {
        const atEnd = slot >= rects.length;
        setDrop(slot === from ? null : { left: (atEnd ? anchor.right + 2 : anchor.left - 4) - box.left, top: anchor.top - box.top, height: anchor.height });
      }
      element.style.transform = `translate(${x - start.x}px, ${y - start.y}px)`;
    };
    const move = (next: PointerEvent) => place(next.clientX, next.clientY);
    const finish = (apply: boolean) => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', cancel);
      removeEventListener('keydown', key, true);
      element.style.transform = '';
      setDraggingId(null);
      setDrop(null);
      if (apply && slot !== null && slot !== from && from >= 0) {
        before.current = measure();
        latest.current.onReorder?.(from, slot);
        setAnnouncement(announceMove(latest.current.items[from]?.label ?? id, slot + 1, all.length));
      }
    };
    const up = () => finish(true);
    const cancel = () => finish(false);
    const key = (next: globalThis.KeyboardEvent) => { if (next.key === 'Escape') { next.preventDefault(); next.stopPropagation(); finish(false); } };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', cancel);
    addEventListener('keydown', key, true);
  };

  const context: GridContext = { columns, depth, editable, resizable, selectedId, select, onHandleKey, draggingId };
  return (
    <Depth.Provider value={depth}>
      <Ctx.Provider value={context}>
        <div
          {...rest}
          className={cx('nx-grid', className)}
          data-nx-space={space}
          data-nx-depth={depth}
          data-nx-depth-capped={capped ? '' : undefined}
          data-nx-editable={editable ? '' : undefined}
          data-nx-dragging={draggingId ? '' : undefined}
          data-nx-motion={level}
          style={{ ...style, '--nx-grid-columns': columns, '--nx-grid-gap': gridGapValue(gap) } as CSSProperties}
        >
          <div ref={track} className="nx-grid__track" onPointerDown={startDrag}>
            {children}
          </div>
          {drop && <div className="nx-grid__drop" style={{ left: drop.left, top: drop.top, height: drop.height }} aria-hidden="true" />}
          {(editable || resizable) && <span className="nx-visually-hidden" role="status" aria-live="polite">{announcement}</span>}
        </div>
      </Ctx.Provider>
    </Depth.Provider>
  );
}

export interface NexGridItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Identidad estable (la misma que la clave). */
  itemId: string;
  /** Columnas que ocupa en el espacio amplio. Por defecto, todas. */
  span?: number;
  /** Filas que ocupa (1..6). */
  rowSpan?: number;
  /** Columnas en espacio estrecho. Por defecto, todas. */
  spanCompact?: number;
  /** Nombre accesible para el asa y los anuncios. */
  label?: string;
  /** `false`: sin asa aunque la cuadrícula sea editable. */
  movable?: boolean;
  children?: ReactNode;
}

export function NexGridItem({ itemId, span, rowSpan = 1, spanCompact, label, movable = true, className, style, children, ...rest }: NexGridItemProps) {
  const grid = useContext(Ctx);
  const columns = grid?.columns ?? 12;
  const resolved = clampSpan(span ?? columns, columns);
  const rows = Math.min(NEX_GRID_LIMITS.maxRowSpan, Math.max(1, Math.round(rowSpan)));
  const name = label ?? itemId;
  const editing = Boolean(grid && (grid.editable || grid.resizable) && movable);
  const selected = grid?.selectedId === itemId;
  const hints = [grid?.editable ? 'flechas para mover' : null, grid?.resizable ? 'Mayús y flechas izquierda/derecha para cambiar el ancho' : null].filter(Boolean).join('; ');
  return (
    <div
      {...rest}
      className={cx('nx-grid__item', className)}
      data-nx-grid-item={itemId}
      data-nx-selected={selected ? '' : undefined}
      data-nx-dragging={grid?.draggingId === itemId ? '' : undefined}
      onFocus={(event) => { rest.onFocus?.(event); if (editing) grid?.select(itemId); }}
      style={{
        ...style,
        '--nx-grid-span': resolved,
        '--nx-grid-row-span': rows,
        ...(spanCompact !== undefined ? { '--nx-grid-span-compact': clampSpan(spanCompact, columns) } : {}),
      } as CSSProperties}
    >
      {editing && (
        <button
          type="button"
          className="nx-grid__handle"
          data-nx-grid-handle=""
          aria-label={`${name}: ${resolved} de ${columns} columnas. ${hints}`}
          aria-pressed={selected}
          onKeyDown={(event) => grid?.onHandleKey(itemId, event)}
          onClick={() => grid?.select(itemId)}
        >
          <span aria-hidden="true">⠿</span>
          <span aria-hidden="true">{resolved}/{columns}</span>
        </button>
      )}
      {children}
    </div>
  );
}
