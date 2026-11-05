'use client';

import { useLayoutEffect, type RefObject } from 'react';
import { anchorClipped, placeFloating, type AnchorRect, type FloatingPlacement, type NexAlign, type NexSide } from '@nexfluid/components';

/**
 * Un ancla que no es un elemento: un rango de texto seleccionado, un cursor,
 * un punto. `contextElement` es el elemento que la contiene (para saber qué
 * contenedores desplazables pueden ocultarla).
 */
export interface NexVirtualAnchor {
  getBoundingClientRect(): AnchorRect;
  contextElement?: Element | null;
}

export type NexAnchorTarget = Element | NexVirtualAnchor;

export interface AnchoredLayerOptions {
  side?: NexSide;
  /** Alias histórico de `side` (NexMenu): sólo arriba o abajo. */
  placement?: 'bottom' | 'top';
  align?: NexAlign;
  gap?: number;
  margin?: number;
  flip?: boolean;
  shift?: boolean;
  /** La superficie mide lo mismo que el ancla en el eje cruzado (listas de NexSelect). */
  matchWidth?: boolean;
  /**
   * Subir la superficie a la capa superior con la Popover API. `false` si ya
   * está en ella (un `<dialog>` abierto con `showModal`).
   */
  promote?: boolean;
  /**
   * Escribe la posición. Por defecto, `left`/`top` directos. NexAnchoredLayer la
   * sustituye para deslizar con resortes cuando cambia el ancla.
   */
  apply?: (el: HTMLElement, placement: FloatingPlacement) => void;
  /** Cualquier valor cuyo cambio obliga a recolocar (p. ej. otra presentación). */
  revision?: unknown;
  /**
   * Límite de colisión además del viewport (su intersección): la superficie
   * se da la vuelta y se desliza para quedar dentro de este elemento.
   */
  boundary?: () => Element | null;
}

const GAP = 6;
const MARGIN = 8;

const writePosition = (el: HTMLElement, p: FloatingPlacement) => {
  el.style.left = `${p.x}px`;
  el.style.top = `${p.y}px`;
};

const intersect = (a: AnchorRect, b: AnchorRect): AnchorRect => {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  return { left, top, width: Math.max(0, Math.min(a.left + a.width, b.left + b.width) - left), height: Math.max(0, Math.min(a.top + a.height, b.top + b.height) - top) };
};

/** Ancestros que recortan: si el ancla queda fuera de uno, la superficie se oculta. */
function clippingAncestors(start: Element | null | undefined): Element[] {
  const out: Element[] = [];
  for (let n = start?.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
    const s = getComputedStyle(n);
    if (/(auto|scroll|hidden|clip)/.test(`${s.overflow}${s.overflowX}${s.overflowY}`)) out.push(n);
  }
  return out;
}

/**
 * Coloca un popup junto a su ancla en la capa superior del navegador (Popover
 * API) y lo mantiene ahí mientras está abierto. La geometría es
 * `placeFloating` (@nexfluid/components): lado preferido, flip, alineación
 * lógica (RTL), shift dentro de un margen seguro y máximos que impiden salir
 * del viewport VISUAL —el teclado en pantalla de un teléfono no tapa nada—.
 *
 * El ancla puede moverse sin que haya scroll ni resize —un elemento que se
 * recoloca con una animación de transform, un panel que se pliega, un texto
 * que crece—, así que se la LEE cada fotograma y sólo se ESCRIBE si algo
 * cambió (el ancla, el viewport o el tamaño del propio popup): una lectura por
 * fotograma, ninguna escritura en reposo. Si un contenedor desplazable deja
 * el ancla fuera de la vista, la superficie se oculta (`data-anchor-hidden`)
 * en vez de flotar sobre otra cosa. Sin Popover API el popup queda como lo
 * deje su CSS.
 */
export function useAnchoredLayer(
  open: boolean,
  popup: RefObject<HTMLElement | null>,
  anchor: () => NexAnchorTarget | null,
  {
    align = 'start', placement, side = placement ?? 'bottom', gap = GAP, margin = MARGIN, flip = true, shift = true, matchWidth = false,
    promote = true, apply = writePosition, revision, boundary,
  }: AnchoredLayerOptions = {},
): void {
  useLayoutEffect(() => {
    const el = popup.current;
    if (!open || !el || !anchor()) return;
    if (promote) {
      if (typeof el.showPopover !== 'function') return;
      el.setAttribute('popover', 'manual');
      if (!el.matches(':popover-open')) el.showPopover();
    }
    el.dataset.layer = 'top';
    const first = anchor();
    const clips = clippingAncestors(first instanceof Element ? first : first?.contextElement);
    let frame = 0;
    let last = '';
    const place = (r: AnchorRect) => {
      const vv = window.visualViewport;
      const visual = { left: vv?.offsetLeft ?? 0, top: vv?.offsetTop ?? 0, width: vv?.width ?? window.innerWidth, height: vv?.height ?? window.innerHeight };
      const hidden = anchorClipped(r, [visual, ...clips.map((c) => c.getBoundingClientRect())]);
      const limit = boundary?.()?.getBoundingClientRect();
      const viewport = limit ? intersect(visual, limit) : visual;
      if (hidden) el.dataset.anchorHidden = ''; else delete el.dataset.anchorHidden;
      if (matchWidth) el.style.width = `${Math.round(r.width)}px`;
      // Medir el tamaño natural: sin los máximos del lugar anterior.
      el.style.maxWidth = `${Math.max(0, viewport.width - margin * 2)}px`;
      el.style.maxHeight = '';
      const dir = getComputedStyle(el).direction === 'rtl' ? 'rtl' : 'ltr';
      const p = placeFloating({ anchor: r, floating: { width: el.offsetWidth, height: el.offsetHeight }, viewport, side, align, gap, margin, flip, shift, dir });
      el.style.maxWidth = `${p.maxWidth}px`;
      el.style.maxHeight = `${Math.max(44, p.maxHeight)}px`;
      el.dataset.placement = p.side;
      el.style.setProperty('--nx-anchor-arrow', `${p.arrow}px`);
      apply(el, p);
    };
    const follow = () => {
      const a = anchor();
      if (a) {
        const r = a.getBoundingClientRect();
        const vv = window.visualViewport;
        // También el tamaño propio: una lista que se filtra encoge y debe volver junto al ancla.
        const key = `${r.left},${r.top},${r.width},${r.height},${el.offsetWidth},${el.offsetHeight},${vv?.width ?? innerWidth},${vv?.height ?? innerHeight},${vv?.offsetTop ?? 0},${vv?.offsetLeft ?? 0}`;
        if (key !== last) { last = key; place(r); }
      }
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => {
      cancelAnimationFrame(frame);
      if (promote && el.matches(':popover-open')) el.hidePopover();
    };
  }, [open, align, side, gap, margin, flip, shift, matchWidth, promote, revision]); // eslint-disable-line react-hooks/exhaustive-deps
}
