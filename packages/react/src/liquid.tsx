'use client';

/**
 * Gota líquida: el indicador compartido de NexTabs, NexNav y NexSegmented.
 *
 * No es una línea que se desplaza. Son dos bordes con física distinta: el que
 * avanza tira (magnético) y el otro le sigue con viscosidad; mientras la gota
 * está estirada se le forma un cuello (`liquidCapsule`), y al llegar se
 * recoge. Al pasar sobre otra opción, la gota se inclina hacia ella (attract).
 * Es una única superficie persistente: cualquier cambio de valor (ratón,
 * teclado o programático) la hace viajar desde su estado visual actual.
 * Movimiento reducido y `motion="none"`: salto inmediato.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { liquidCapsule } from '@eclipsis/core';
import type { NexMotion } from '@eclipsis/components';
import { canAnimate, useMotionPreference } from './provider.tsx';
import { presetFor, useSprings, type SpringPreset } from './springs.ts';

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

export function useLiquid(options: LiquidOptions) {
  // Las opciones llegan como funciones nuevas en cada render: se leen por
  // referencia para que medir, mover y observar sean estables. (Antes, cada
  // render volvía a suscribir el ResizeObserver, cuya primera notificación
  // colocaba la gota sin animar: el indicador «reaparecía» en su destino.)
  const opts = useRef(options);
  opts.current = options;
  const preference = useMotionPreference();
  const pref = useRef(preference);
  pref.current = preference;
  const { host } = options;
  const vertical = options.orientation === 'vertical';
  const svg = useRef<SVGSVGElement>(null);
  const path = useRef<SVGPathElement>(null);
  const target = useRef({ start: 0, end: 0, cross: 0, thick: 0 });
  const activeEl = useRef<HTMLElement | null>(null);
  const presets = useRef<SpringPreset[]>(['flow', 'flow']);
  const ready = useRef(false);

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

  /** Mide el elemento activo (coordenadas locales del anfitrión, sin escalar). */
  const measure = useCallback(() => {
    const h = host.current;
    const item = opts.current.active();
    if (!h || !item) return null;
    const thread = opts.current.form() === 'thread';
    const start = vertical ? item.offsetTop : item.offsetLeft;
    const len = vertical ? item.offsetHeight : item.offsetWidth;
    const crossSize = vertical ? h.clientWidth : h.clientHeight;
    const thick = thread ? 3 : vertical ? item.offsetWidth : item.offsetHeight;
    const cross = thread ? crossSize - 3 : vertical ? item.offsetLeft : item.offsetTop;
    target.current = { start, end: start + len, cross, thick };
    return item;
  }, [host, vertical]);

  const animates = () => ready.current && canAnimate(opts.current.motion, pref.current);

  /**
   * Lleva la gota al elemento activo desde donde está ahora (también a mitad
   * de un viaje): ratón, teclado o cambio programático. El borde que avanza
   * tira con un resorte magnético y el posterior le sigue con viscosidad.
   */
  const update = useCallback((_origin: LiquidOrigin = 'program') => {
    const item = measure();
    if (!item) return;
    activeEl.current = item;
    const { start, end } = target.current;
    if (animates()) {
      const [s0, e0] = springs.values();
      const forward = start + end >= s0! + e0!;
      const motion = opts.current.motion;
      const level = motion === 'subtle' ? 'fluid' : motion;
      const lead = presetFor(level, 'lead');
      const trail = motion === 'subtle' ? 'calm' : presetFor(level, 'trail');
      presets.current = forward ? [trail, lead] : [lead, trail];
      springs.to([start, end], presets.current);
    } else {
      springs.jump([start, end]);
    }
    if (!ready.current && host.current) {
      ready.current = true;
      host.current.dataset.nxReady = '';
    }
  }, [measure, springs, host]);

  /** El activo es el mismo pero cambió su caja (resize, etiqueta, fuente): se reajusta sin reiniciar el viaje. */
  const settle = useCallback(() => {
    if (!ready.current) return update('program');
    const item = measure();
    if (!item) return;
    if (item !== activeEl.current) return; // un cambio de valor lo resuelve update()
    const { start, end } = target.current;
    if (springs.moving) springs.to([start, end], presets.current);
    else springs.jump([start, end]);
  }, [measure, springs, update]);

  /** Attract: la gota se inclina hacia la opción bajo el puntero, sin moverse a ella. */
  const lean = useCallback((toward: HTMLElement | null) => {
    if (!animates() || opts.current.motion === 'subtle') return;
    const item = measure();
    if (!item || item !== activeEl.current) return;
    const { start, end } = target.current;
    presets.current = ['magnetic', 'magnetic'];
    if (!toward || toward === item) {
      springs.to([start, end], ['flow', 'flow']);
      return;
    }
    const center = vertical ? toward.offsetTop + toward.offsetHeight / 2 : toward.offsetLeft + toward.offsetWidth / 2;
    const k = 0.14;
    springs.to(center > end ? [start, end + (center - end) * k] : [start - (start - center) * k, end], presets.current);
  }, [measure, springs, vertical]);

  // Tras cada render del dueño: si la caja del activo cambió (etiquetas, densidad), se reajusta.
  useIsoLayoutEffect(() => {
    if (ready.current) settle();
  });

  useIsoLayoutEffect(() => {
    const h = host.current;
    if (!h || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => settle());
    observer.observe(h);
    for (const el of h.querySelectorAll<HTMLElement>(opts.current.items)) observer.observe(el);
    let live = true;
    void document.fonts?.ready.then(() => { if (live) settle(); });
    return () => { live = false; observer.disconnect(); };
  }, [settle, host]);

  return { svg, path, update, lean, settle };
}

/** El SVG de la gota. Va como primer hijo del contenedor posicionado. */
export function LiquidDrop({ svgRef, pathRef }: { svgRef: RefObject<SVGSVGElement | null>; pathRef: RefObject<SVGPathElement | null> }) {
  return (
    <svg ref={svgRef} className="nx-liquid" aria-hidden="true" focusable="false">
      <path ref={pathRef} className="nx-liquid__drop" />
    </svg>
  );
}
