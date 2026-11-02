'use client';

/**
 * Pila de capas abiertas (NexPortal): quién cierra con Escape, quién con un
 * clic fuera, quién cuando el foco se va.
 *
 * - Escape cierra SÓLO la capa de arriba (la última abierta). Si alguien ya
 *   atendió la tecla (`defaultPrevented`: un menú, un campo de enlace), no.
 * - Un clic es «fuera» de una capa si no cae en ella, en su ancla ni en
 *   ninguna capa abierta DENTRO de ella (anidadas por contexto de React,
 *   aunque en el DOM vivan en la capa superior del navegador).
 * - Los oyentes del documento existen mientras haya alguna capa: con todo
 *   cerrado no se escucha nada.
 */
import { createContext, useContext } from 'react';

export type NexLayerDismissReason = 'escape' | 'outside' | 'focus-out';

export interface NexLayer {
  element: () => HTMLElement | null;
  /** Elementos que cuentan como «dentro» (el ancla: pulsarla no debe cerrar y reabrir). */
  inside: () => readonly (Element | null | undefined)[];
  parent: NexLayer | null;
  escape: boolean;
  outside: boolean;
  focusOut: boolean;
  dismiss: (reason: NexLayerDismissReason) => void;
}

export const LayerContext = createContext<NexLayer | null>(null);
export const useParentLayer = () => useContext(LayerContext);

const stack: NexLayer[] = [];

const within = (layer: NexLayer, ancestor: NexLayer) => {
  for (let l: NexLayer | null = layer; l; l = l.parent) if (l === ancestor) return true;
  return false;
};

/** ¿`target` está en `layer`, en su ancla o en una capa abierta dentro de ella? */
export function inLayerTree(layer: NexLayer, target: Node): boolean {
  return stack.some((l) => within(l, layer) && (l.element()?.contains(target) || l.inside().some((e) => e?.contains(target))));
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  const top = stack[stack.length - 1];
  if (!top?.escape) return;
  event.preventDefault();
  top.dismiss('escape');
};

const onPointerDown = (event: PointerEvent) => {
  const target = event.target;
  if (!(target instanceof Node)) return;
  // De arriba abajo: una capa contiene a sus hijas, así que si el clic cae dentro de una, las de debajo que la contienen tampoco cierran.
  for (const layer of [...stack].reverse()) {
    if (layer.outside && !inLayerTree(layer, target)) layer.dismiss('outside');
  }
};

const onFocusIn = (event: FocusEvent) => {
  const target = event.target;
  if (!(target instanceof Node)) return;
  for (const layer of [...stack].reverse()) {
    if (layer.focusOut && !inLayerTree(layer, target)) layer.dismiss('focus-out');
  }
};

export function pushLayer(layer: NexLayer): () => void {
  if (!stack.length) {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('focusin', onFocusIn);
  }
  stack.push(layer);
  return () => {
    const i = stack.indexOf(layer);
    if (i >= 0) stack.splice(i, 1);
    if (!stack.length) {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('focusin', onFocusIn);
    }
  };
}

/** Capas abiertas, de abajo arriba (pruebas y herramientas). */
export const openLayerCount = () => stack.length;
