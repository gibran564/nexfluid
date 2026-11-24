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
 *
 * Forma: `NexProvider liquid="symmetric"` cambia la deformación por una curva
 * simétrica (ver `NexLiquidShape`); sin él, la forma es la original.
 *
 * Ajustes por CSS (heredables), además de `--nx-pinch` (cuello):
 * - `--nx-liquid-thin`: cuánto puede adelgazar (0.72 por defecto: hasta un 28 %).
 *   Con `symmetric` es el ancho exacto a mitad del viaje.
 * - `--nx-liquid-stretch`: con `symmetric`, estiramiento por cada largo de
 *   elemento recorrido (0.35 por defecto).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { liquidCapsule } from '@nexfluid/core';
import type { NexMotion } from '@nexfluid/components';
import { canAnimate, useMotionPreference, useNex } from './provider.tsx';
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
  const liquidShape = useNex().liquid ?? 'spring';
  const shape = useRef(liquidShape);
  shape.current = liquidShape;
  const { host } = options;
  const vertical = options.orientation === 'vertical';
  const svg = useRef<SVGSVGElement>(null);
  const path = useRef<SVGPathElement>(null);
  const target = useRef({ start: 0, end: 0, cross: 0, thick: 0 });
  const activeEl = useRef<HTMLElement | null>(null);
  const presets = useRef<SpringPreset[]>(['flow', 'flow']);
  // «Lista» va por ELEMENTO, no por componente: el anfitrión puede desmontarse y
  // volver a crearse (la lista de NexSelect existe sólo mientras está abierta).
  // Con un booleano, la lista nueva nunca recibía `data-nx-ready` y la gota
  // quedaba oculta desde la segunda apertura.
  const readyHost = useRef<HTMLElement | null>(null);
  const isReady = () => host.current !== null && readyHost.current === host.current;

  /** Viaje en curso (centros de origen y destino) para la envolvente simétrica; `null` en reposo o al inclinarse. */
  const travel = useRef<{ from: number; to: number } | null>(null);

  const paint = useCallback((s: number, e: number) => {
    const t = target.current;
    const len = Math.max(1, t.end - t.start);
    const style = host.current ? getComputedStyle(host.current) : null;
    const read = (name: string, fallback: number) => {
      const v = style ? parseFloat(style.getPropertyValue(name)) : NaN;
      return Number.isFinite(v) ? v : fallback;
    };
    const pinchVar = read('--nx-pinch', 0.6);
    // Cuánto puede adelgazar la gota al estirarse (0.72: hasta un 28 %).
    const thinFloor = Math.min(1, Math.max(0.1, read('--nx-liquid-thin', 0.72)));
    let stretch = Math.max(0, (Math.abs(e - s) - len) / len);
    // Volumen aproximadamente constante: al estirarse, la gota adelgaza (hasta `thinFloor`) y se recupera al llegar.
    let thin = Math.max(thinFloor, Math.sqrt(1 / (1 + stretch)));
    const trip = travel.current;
    const level = opts.current.motion;
    // `elastic` conserva la forma original: su carácter es el rebote, que la envolvente aplanaría.
    const symmetric = shape.current === 'symmetric' && (level === 'fluid' || level === 'subtle');
    if (trip && symmetric && Math.abs(trip.to - trip.from) > 1) {
      // Envolvente simétrica: la deformación depende del avance del CENTRO entre origen y destino
      // (seno: nula al salir y al llegar, máxima a la mitad), no de la distancia entre los bordes,
      // cuyos resortes distintos (magnético delante, viscoso detrás) la hacen crecer despacio y
      // caer de golpe. La gota se redibuja centrada con el largo de esa envolvente.
      const center = (s + e) / 2;
      const progress = Math.min(1, Math.max(0, (center - trip.from) / (trip.to - trip.from)));
      const peak = read('--nx-liquid-stretch', 0.35) * Math.min(4, Math.abs(trip.to - trip.from) / len);
      // `subtle` sigue la misma curva, a un tercio: discreta, como el resto de ese nivel.
      const envelope = Math.sin(Math.PI * progress) * (level === 'subtle' ? 1 / 3 : 1);
      stretch = envelope * peak;
      // Aquí `--nx-liquid-thin` es el ancho exacto a mitad del viaje (p. ej. 0.5: la mitad).
      thin = 1 - (1 - thinFloor) * envelope;
      const half = (len * (1 + stretch)) / 2;
      s = center - half;
      e = center + half;
    }
    const pinch = Math.min(1, stretch * 1.4) * pinchVar;
    const thick = t.thick > 6 ? t.thick * thin : t.thick;
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

  const animates = () => isReady() && canAnimate(opts.current.motion, pref.current);

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
      // Desde donde está ahora (también a mitad de otro viaje) hasta el centro del nuevo activo.
      travel.current = { from: (s0! + e0!) / 2, to: (start + end) / 2 };
      springs.to([start, end], presets.current);
    } else {
      travel.current = null;
      springs.jump([start, end]);
    }
    if (!isReady() && host.current) {
      readyHost.current = host.current;
      host.current.dataset.nxReady = '';
    }
  }, [measure, springs, host]);

  /** El activo es el mismo pero cambió su caja (resize, etiqueta, fuente): se reajusta sin reiniciar el viaje. */
  const settle = useCallback(() => {
    if (!isReady()) return update('program');
    const item = measure();
    if (!item) return;
    if (item !== activeEl.current) return; // un cambio de valor lo resuelve update()
    const { start, end } = target.current;
    if (springs.moving) {
      if (travel.current) travel.current.to = (start + end) / 2;
      springs.to([start, end], presets.current);
    } else {
      travel.current = null;
      springs.jump([start, end]);
    }
  }, [measure, springs, update]);

  /** Attract: la gota se inclina hacia la opción bajo el puntero, sin moverse a ella. */
  const lean = useCallback((toward: HTMLElement | null) => {
    if (!animates() || opts.current.motion === 'subtle') return;
    const item = measure();
    if (!item || item !== activeEl.current) return;
    const { start, end } = target.current;
    travel.current = null; // la inclinación conserva su forma propia, sin envolvente
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
    if (isReady()) settle();
  });

  // El ResizeObserver sigue al elemento anfitrión actual: se comprueba tras cada
  // render (las dependencias de un efecto no ven cambiar `host.current`) y sólo
  // se vuelve a suscribir cuando el elemento es otro, así que no reaparece el
  // salto que causaba suscribirse en cada render.
  const observed = useRef<{ el: HTMLElement; dispose: () => void } | null>(null);
  useIsoLayoutEffect(() => {
    const h = host.current;
    if (observed.current?.el === h) return;
    observed.current?.dispose();
    observed.current = null;
    if (!h || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => settle());
    observer.observe(h);
    for (const el of h.querySelectorAll<HTMLElement>(opts.current.items)) observer.observe(el);
    let live = true;
    void document.fonts?.ready.then(() => { if (live) settle(); });
    observed.current = { el: h, dispose: () => { live = false; observer.disconnect(); } };
  });
  useIsoLayoutEffect(() => () => { observed.current?.dispose(); observed.current = null; }, []);

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
