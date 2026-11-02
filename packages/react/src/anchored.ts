'use client';

import { useLayoutEffect, type RefObject } from 'react';

const GAP = 6;
const MARGIN = 8;

/**
 * Coloca un popup junto a su ancla en la capa superior del navegador (Popover
 * API) y lo mantiene ahí mientras está abierto.
 *
 * El ancla puede moverse sin que haya scroll ni resize —un elemento que se
 * recoloca con una animación de transform, un panel que se pliega—, así que se
 * la sigue cada fotograma y sólo se recoloca si algo cambió (el ancla, el
 * viewport o el tamaño del propio popup). Se ajusta al
 * viewport VISUAL: el teclado en pantalla de un teléfono no tapa el menú. Sin
 * Popover API el popup queda como lo deje su CSS (absoluto).
 */
export function useAnchoredLayer(
  open: boolean,
  popup: RefObject<HTMLElement | null>,
  anchor: () => HTMLElement | null,
  { align = 'start', placement = 'bottom' }: { align?: 'start' | 'end'; placement?: 'bottom' | 'top' } = {},
): void {
  useLayoutEffect(() => {
    const el = popup.current;
    const a = anchor();
    if (!open || !el || !a || typeof el.showPopover !== 'function') return;
    el.setAttribute('popover', 'manual');
    el.showPopover();
    el.dataset.layer = 'top';
    let frame = 0;
    const place = () => {
      const vv = window.visualViewport;
      const left = vv?.offsetLeft ?? 0;
      const top = vv?.offsetTop ?? 0;
      const width = vv?.width ?? window.innerWidth;
      const height = vv?.height ?? window.innerHeight;
      el.style.maxWidth = `${Math.max(0, width - MARGIN * 2)}px`;
      el.style.maxHeight = `${Math.max(44, height - MARGIN * 2)}px`;
      const r = a.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      const x = align === 'end' ? r.right - box.width : r.left;
      el.style.left = `${Math.round(Math.max(left + MARGIN, Math.min(x, left + width - box.width - MARGIN)))}px`;
      const below = r.bottom + GAP;
      const above = r.top - box.height - GAP;
      const fitsBelow = below + box.height <= top + height - MARGIN;
      const fitsAbove = above >= top + MARGIN;
      const up = placement === 'top' ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;
      el.style.top = `${Math.round(Math.max(top + MARGIN, Math.min(up ? above : below, top + height - box.height - MARGIN)))}px`;
      el.dataset.placement = up ? 'top' : 'bottom';
    };
    let last = '';
    const follow = () => {
      const r = a.getBoundingClientRect();
      const vv = window.visualViewport;
      // También el tamaño propio: una lista que se filtra encoge y debe volver junto al ancla.
      const key = `${r.left},${r.top},${r.width},${r.height},${el.offsetWidth},${el.offsetHeight},${vv?.width ?? innerWidth},${vv?.height ?? innerHeight},${vv?.offsetTop ?? 0}`;
      if (key !== last) { last = key; place(); }
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => {
      cancelAnimationFrame(frame);
      if (el.matches(':popover-open')) el.hidePopover();
    };
  }, [open, align, placement]); // eslint-disable-line react-hooks/exhaustive-deps
}
