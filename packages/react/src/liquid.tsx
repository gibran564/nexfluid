'use client';

/**
 * Gota líquida: el indicador compartido de NexTabs, NexNav y NexSegmented.
 *
 * No es una línea que se desplaza. Son dos bordes con física distinta: el que
 * avanza tira (magnético) y el otro le sigue con viscosidad; mientras la gota
 * está estirada se le forma un cuello (`liquidCapsule`), y al llegar se
 * recoge. Al pasar sobre otra opción, la gota se inclina hacia ella (attract).
 * Teclado, movimiento reducido y `motion="none"`: salto inmediato.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { liquidCapsule } from '@nexfluid/core';
import type { NexMotion } from '@nexfluid/components';
import { canAnimate, useMotionPreference } from './provider.tsx';
import { presetFor, useSprings } from './springs.ts';

export type LiquidOrigin = 'pointer' | 'keyboard' | 'program';

export interface LiquidOptions {
  host: RefObject<HTMLElement | null>;
  /** Selector de los elementos (hijos directos o descendientes) que pueden estar activos. */
  items: string;
  /** Elemento activo dentro de `host`. */
  active: () => HTMLElement | null;
  orientation: 'horizontal' | 'vertical';
  /** `drop`: gota del alto del elemento. `thread`: hilo de 3 px en el borde. */
  form: () => 'drop' | 'thread';
  motion: NexMotion;
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function useLiquid({ host, active, orientation, form, motion }: LiquidOptions) {
  const preference = useMotionPreference();
  const svg = useRef<SVGSVGElement>(null);
  const path = useRef<SVGPathElement>(null);
  const target = useRef({ start: 0, end: 0, cross: 0, thick: 0 });
  const ready = useRef(false);
  const vertical = orientation === 'vertical';

  const paint = useCallback((s: number, e: number) => {
    const t = target.current;
    const len = Math.max(1, t.end - t.start);
    const stretch = Math.max(0, (Math.abs(e - s) - len) / len);
    const pinchVar = host.current ? parseFloat(getComputedStyle(host.current).getPropertyValue('--nx-pinch')) || 0.6 : 0.6;
    const pinch = Math.min(1, stretch * 1.4) * pinchVar;
    // Volumen aproximadamente constante: al estirarse, la gota adelgaza (hasta un 28 %) y se recupera al llegar.
    const thin = t.thick > 6 ? Math.max(0.72, Math.sqrt(1 / (1 + stretch))) : 1;
    const thick = t.thick * thin;
    path.current?.setAttribute('d', liquidCapsule(s, e, thick, pinch, { vertical, offset: t.cross + (t.thick - thick) / 2 }));
  }, [host, vertical]);

  const springs = useSprings([0, 0], ([s, e]) => paint(s!, e!), 0.05);

  const measure = useCallback(() => {
    const h = host.current;
    const item = active();
    if (!h || !item) return false;
    const thread = form() === 'thread';
    const start = vertical ? item.offsetTop : item.offsetLeft;
    const len = vertical ? item.offsetHeight : item.offsetWidth;
    const crossSize = vertical ? h.clientWidth : h.clientHeight;
    const thick = thread ? 3 : vertical ? item.offsetWidth : item.offsetHeight;
    const cross = thread ? crossSize - 3 : vertical ? item.offsetLeft : item.offsetTop;
    target.current = { start, end: start + len, cross, thick };
    if (svg.current) {
      svg.current.setAttribute('width', String(h.scrollWidth));
      svg.current.setAttribute('height', String(h.scrollHeight));
    }
    return true;
  }, [host, active, form, vertical]);

  /** Lleva la gota al elemento activo. */
  const update = useCallback((origin: LiquidOrigin) => {
    if (!measure()) return;
    const { start, end } = target.current;
    const animate = origin === 'pointer' && ready.current && canAnimate(motion, preference);
    if (animate) {
      const [s0] = springs.values();
      const forward = start > s0!;
      const level = motion === 'subtle' ? 'fluid' : motion;
      const lead = presetFor(level, 'lead');
      const trail = motion === 'subtle' ? 'calm' : presetFor(level, 'trail');
      springs.to([start, end], forward ? [trail, lead] : [lead, trail]);
    } else {
      springs.jump([start, end]);
    }
    if (!ready.current && host.current) {
      ready.current = true;
      host.current.dataset.nxReady = '';
    }
  }, [measure, motion, preference, springs, host]);

  /** Attract: la gota se inclina hacia la opción bajo el puntero, sin moverse a ella. */
  const lean = useCallback((toward: HTMLElement | null) => {
    if (!ready.current || !canAnimate(motion, preference) || motion === 'subtle') return;
    measure();
    const { start, end } = target.current;
    if (!toward || toward === active()) {
      springs.to([start, end], ['flow', 'flow']);
      return;
    }
    const center = vertical ? toward.offsetTop + toward.offsetHeight / 2 : toward.offsetLeft + toward.offsetWidth / 2;
    const k = 0.14;
    springs.to(center > end ? [start, end + (center - end) * k] : [start - (start - center) * k, end], ['magnetic', 'magnetic']);
  }, [measure, motion, preference, springs, active, vertical]);

  useIsoLayoutEffect(() => {
    const h = host.current;
    if (!h || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => update('program'));
    observer.observe(h);
    let live = true;
    void document.fonts?.ready.then(() => { if (live) update('program'); });
    return () => { live = false; observer.disconnect(); };
  }, [update, host]);

  return { svg, path, update, lean };
}

/** El SVG de la gota. Va como primer hijo del contenedor posicionado. */
export function LiquidDrop({ svgRef, pathRef }: { svgRef: RefObject<SVGSVGElement | null>; pathRef: RefObject<SVGPathElement | null> }) {
  return (
    <svg ref={svgRef} className="nx-liquid" aria-hidden="true" focusable="false">
      <path ref={pathRef} className="nx-liquid__drop" />
    </svg>
  );
}
