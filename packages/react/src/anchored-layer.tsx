'use client';

/**
 * NexAnchoredLayer: una superficie contextual junto a un ancla.
 *
 *   <NexButton ref={setAnchor} aria-expanded={open} onClick={() => setOpen(!open)}>Opciones</NexButton>
 *   <NexAnchoredLayer open={open} onOpenChange={setOpen} anchor={anchor} label="Opciones">…</NexAnchoredLayer>
 *
 * No es un alias de `createPortal`: el contenido NO se muda en el árbol. Se
 * pinta donde se declara —conserva el contexto de React, el orden de
 * tabulación junto a su disparador y la identidad de lo que contiene (un
 * editor no se desmonta)— y sube a la capa superior del navegador (Popover
 * API, o `<dialog>` modal), donde ningún `overflow: hidden` lo recorta.
 *
 * Responsabilidades: anclaje (elemento, ref o ancla virtual como un rango de
 * texto), colocación (`placeFloating`: flip, shift, RTL, viewport visual),
 * ciclo de apertura con salida interrumpible, pila de capas (Escape cierra la
 * de arriba; un clic dentro de una capa hija no cierra la madre), foco según
 * modalidad y continuidad: si cambia el ancla con la capa abierta, la
 * superficie SE DESLIZA con los resortes de @nexfluid/core en vez de saltar.
 *
 * No hace morphing. Cuando el contenido debe transformarse desde su origen
 * (una tarjeta que se vuelve panel) eso es NexMorph, que ya monta su destino.
 */
import {
  useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
  type CSSProperties, type HTMLAttributes, type ReactNode, type RefObject,
} from 'react';
import { cx, type FloatingPlacement, type NexAlign, type NexMotion, type NexSide } from '@nexfluid/components';
import { useAnchoredLayer, type NexAnchorTarget } from './anchored.ts';
import { LayerContext, pushLayer, useParentLayer, type NexLayer, type NexLayerDismissReason } from './layers.ts';
import { canAnimate, useMotionPreference, useNex } from './provider.tsx';
import { presetFor, useSprings } from './springs.ts';

export type NexLayerAnchor = NexAnchorTarget | RefObject<Element | null> | null;
export type { NexLayerDismissReason };
export type NexAnchoredLayerPresentation = 'anchored' | 'adaptive';

export interface NexAnchoredLayerProps extends Omit<HTMLAttributes<HTMLElement>, 'role' | 'children' | 'onToggle'> {
  open: boolean;
  /** Pide cerrar (Escape, clic fuera, foco fuera). La aplicación decide. */
  onOpenChange: (open: boolean, reason: NexLayerDismissReason) => void;
  /** Elemento, ref o ancla virtual (`getBoundingClientRect`): un rango de texto, un punto. */
  anchor: NexLayerAnchor;
  /** Lado preferido; se da la vuelta si no cabe. */
  side?: NexSide;
  align?: NexAlign;
  gap?: number;
  /** Límite de colisión además del viewport: un panel, un marco desplazable. */
  boundary?: RefObject<Element | null> | Element | null;
  /**
   * `anchored`: siempre junto al ancla. `adaptive`: en viewports estrechos
   * (menos de `adaptiveBelow` px) se reorganiza como hoja inferior a todo el
   * ancho, sobre el teclado en pantalla.
   */
  presentation?: NexAnchoredLayerPresentation;
  adaptiveBelow?: number;
  /**
   * Modal: `<dialog>` con `showModal()` —el resto queda inerte y el foco no
   * sale—. No modal (por defecto): sin trampa de foco ni `aria-modal`.
   */
  modal?: boolean;
  /** Rol de la superficie. Por defecto `dialog`; una barra de herramientas pasa `toolbar`. */
  role?: 'dialog' | 'toolbar' | 'group' | 'region' | 'menu' | 'listbox';
  /** Nombre accesible (o `aria-labelledby`). */
  label?: string;
  /** Al abrir: el primer control (`auto`), nada (`none`) o uno concreto. Por defecto `auto`. */
  initialFocus?: 'auto' | 'none' | RefObject<HTMLElement | null>;
  /** Al cerrar, el foco vuelve a donde estaba al abrir (si seguía dentro). Por defecto, sí. */
  restoreFocus?: boolean;
  /** Qué cierra. Por defecto Escape y clic fuera; `focusOut` cierra cuando el foco se va. */
  dismiss?: { escape?: boolean; outside?: boolean; focusOut?: boolean };
  /** Material: `raised` (hoja elevada), `ink` (cápsula de tinta), `plain` (lo dibuja el contenido). */
  surface?: 'raised' | 'ink' | 'plain';
  motion?: NexMotion;
  children: ReactNode;
}

const resolve = (a: NexLayerAnchor): NexAnchorTarget | null =>
  a && typeof a === 'object' && 'current' in a ? (a.current as Element | null) : (a as NexAnchorTarget | null);

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

function useNarrow(limit: number, enabled: boolean) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (!enabled || typeof window.matchMedia !== 'function') { setNarrow(false); return; }
    const mq = window.matchMedia(`(max-width: ${limit - 0.02}px)`);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, [limit, enabled]);
  return narrow;
}

export function NexAnchoredLayer({
  open, onOpenChange, anchor, side = 'bottom', align = 'center', gap, boundary, presentation = 'anchored', adaptiveBelow = 560, modal = false,
  role = 'dialog', label, initialFocus = 'auto', restoreFocus = true, dismiss, surface = 'raised', motion, className, style, children, ...rest
}: NexAnchoredLayerProps) {
  const defaults = useNex();
  const level = motion ?? defaults.motion;
  const preference = useMotionPreference();
  const parent = useParentLayer();
  const id = useId();
  const el = useRef<HTMLElement | null>(null);
  const boundaryRef = useRef(boundary);
  boundaryRef.current = boundary;
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;
  const notify = useRef(onOpenChange);
  notify.current = onOpenChange;
  const sheet = useNarrow(adaptiveBelow, presentation === 'adaptive' && open);

  // Montado mientras está abierto o saliendo. Reabrir a media salida invierte sin desmontar.
  const [present, setPresent] = useState(open);
  const [closing, setClosing] = useState(false);
  useLayoutEffect(() => {
    if (open) { setPresent(true); setClosing(false); return; }
    if (!present) return;
    const node = el.current;
    const animated = canAnimate(level, preference) && node && typeof node.getAnimations === 'function';
    if (!animated) { setPresent(false); return; }
    setClosing(true);
    let done = false;
    const finish = () => { if (!done) { done = true; setPresent(false); setClosing(false); } };
    node.addEventListener('animationend', finish, { once: true });
    const fallback = window.setTimeout(finish, 320);
    return () => { done = true; window.clearTimeout(fallback); node.removeEventListener('animationend', finish); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deslizar cuando cambia el ancla; seguirla sin animar (scroll, resize).
  const lastAnchor = useRef<NexAnchorTarget | null>(null);
  const placed = useRef(false);
  const springs = useSprings([0, 0], ([x, y]) => {
    const node = el.current;
    if (node) { node.style.left = `${x}px`; node.style.top = `${y}px`; }
  }, 0.25);
  const apply = useCallback((node: HTMLElement, p: FloatingPlacement) => {
    const vv = window.visualViewport;
    let x = p.x;
    let y = p.y;
    if (node.dataset.presentation === 'sheet') {
      const left = vv?.offsetLeft ?? 0;
      const width = vv?.width ?? innerWidth;
      node.style.width = `${width - 16}px`;
      node.style.maxHeight = `${Math.round((vv?.height ?? innerHeight) * 0.6)}px`;
      x = left + 8;
      y = (vv?.offsetTop ?? 0) + (vv?.height ?? innerHeight) - node.offsetHeight - 8;
    } else node.style.width = '';
    const current = resolve(anchorRef.current);
    const reanchored = placed.current && current !== lastAnchor.current;
    lastAnchor.current = current;
    placed.current = true;
    if (reanchored && !closing && canAnimate(level, preference)) springs.to([x, y], [presetFor(level), presetFor(level)]);
    else if (springs.moving) springs.to([x, y], [presetFor(level), presetFor(level)]);
    else springs.jump([x, y]);
  }, [level, preference, closing, springs]);
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => { if (!present) { placed.current = false; lastAnchor.current = null; } }, [present]);

  useAnchoredLayer(present, el, () => resolve(anchorRef.current), {
    side, align, gap, promote: !modal, revision: sheet,
    boundary: () => { const b = boundaryRef.current; return b && 'current' in b ? b.current : b ?? null; }, apply: (node, p) => applyRef.current(node, p),
  });

  // Modal: `<dialog>` en la capa superior. Escape lo gestiona la pila (no el cierre nativo, que desincronizaría `open`).
  useLayoutEffect(() => {
    const node = el.current;
    if (!modal || !present || !(node instanceof HTMLDialogElement)) return;
    if (!node.open) { if (typeof node.showModal === 'function') node.showModal(); else node.setAttribute('open', ''); }
    const cancel = (event: Event) => event.preventDefault();
    node.addEventListener('cancel', cancel);
    return () => { node.removeEventListener('cancel', cancel); if (node.open) node.close?.(); };
  }, [modal, present]);

  // Capa en la pila mientras está abierta (no mientras sale).
  const options = { escape: dismiss?.escape ?? true, outside: dismiss?.outside ?? true, focusOut: dismiss?.focusOut ?? false };
  const layer = useRef<NexLayer | null>(null);
  if (!layer.current) {
    layer.current = {
      element: () => el.current,
      inside: () => { const a = resolve(anchorRef.current); return a instanceof Element ? [a] : [a?.contextElement]; },
      parent,
      escape: options.escape, outside: options.outside, focusOut: options.focusOut,
      dismiss: (reason) => notify.current(false, reason),
    };
  }
  Object.assign(layer.current, options, { parent });
  useEffect(() => (open ? pushLayer(layer.current!) : undefined), [open]);

  // Foco: entra al abrir (según initialFocus) y vuelve al cerrar si seguía dentro.
  const returnTo = useRef<HTMLElement | null>(null);
  const shown = open && present;
  useEffect(() => {
    if (!shown) return;
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = el.current;
    if (node && initialFocus !== 'none') {
      const target = typeof initialFocus === 'object' ? initialFocus.current : node.querySelector<HTMLElement>(FOCUSABLE) ?? (modal ? node : null);
      target?.focus({ preventScroll: true });
    }
    return () => {
      const back = returnTo.current;
      const active = document.activeElement;
      const lost = !active || active === document.body || el.current?.contains(active);
      if (restoreFocus && back?.isConnected && lost) back.focus({ preventScroll: true });
    };
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!present) return null;
  const Tag = modal ? 'dialog' : 'div';
  return (
    <LayerContext.Provider value={layer.current}>
      <Tag
        {...rest}
        ref={(node: HTMLElement | null) => { el.current = node; }}
        id={rest.id ?? `nx-layer-${id.replace(/:/g, '')}`}
        className={cx('nx-anchored-layer', className)}
        role={role === 'dialog' && modal ? undefined : role}
        aria-label={label ?? rest['aria-label']}
        tabIndex={modal ? -1 : rest.tabIndex}
        data-state={closing ? 'closing' : 'open'}
        data-nx-surface={surface}
        data-nx-motion={level}
        data-modal={modal ? '' : undefined}
        data-presentation={sheet ? 'sheet' : 'anchored'}
        style={style as CSSProperties}
      >
        {children}
      </Tag>
    </LayerContext.Provider>
  );
}
