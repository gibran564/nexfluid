'use client';

/**
 * Transición de disposición: cuando un contenedor se recompone (un panel que se
 * abre, un lienzo que pasa de una columna a dos, una superficie que se amplía),
 * sus superficies viajan desde donde estaban hasta donde quedan, en vez de
 * aparecer de golpe.
 *
 *   const ref = useRef<HTMLDivElement>(null);
 *   useNexLayoutTransition(ref, layoutKey);
 *   <div ref={ref}>
 *     <section data-nx-layout-id="editor">…</section>
 *     <section data-nx-layout-id="results">…</section>
 *   </div>
 *
 * Técnica FLIP sin reescalar: la disposición final se calcula UNA vez (el
 * navegador hace un solo layout; un editor de código dentro mide su tamaño
 * final una sola vez) y sólo se animan `transform` y `clip-path` en el
 * compositor. Una superficie que crece se descubre con un recorte desde su
 * tamaño anterior; una que encoge se desplaza; una que llega emerge con
 * opacidad. Su contenido nunca se deforma ni cambia de tamaño durante el
 * movimiento.
 *
 * Interrumpible: un cambio nuevo cancela el anterior y parte de lo último que
 * se registró. Movimiento reducido, `motion="none"` o un cambio hecho con el
 * teclado (`data-nx-input="keyboard"` en un ancestro): inmediato. El estado
 * nunca depende de la animación: la disposición ya es la final desde el primer
 * fotograma.
 */
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { MOTION } from '@nexfluid/foundation';
import type { NexMotion } from '@nexfluid/components';
import { canAnimate, useMotionPreference, useNex } from './provider.tsx';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface NexLayoutTransitionOptions {
  /** Nivel de movimiento; por defecto el del `NexProvider`. */
  motion?: NexMotion;
  /** Qué se anima dentro del contenedor. Por defecto `[data-nx-layout-id]`. */
  selector?: string;
  /** Duración en ms; por defecto la de la familia `surface`. */
  duration?: number;
  easing?: string;
  /** Radio para el recorte (para que el borde redondeado no se corte en recto). */
  radius?: string;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ID = 'data-nx-layout-id';

/** Ajusta mínimos: menos de medio píxel no se anima (evita trabajo inútil). */
const moved = (a: number, b: number) => Math.abs(a - b) > 0.5;

export function layoutKeyframes(first: Box, last: Box, radius = '0px'): Keyframe[] | null {
  const dx = first.x - last.x;
  const dy = first.y - last.y;
  const growX = Math.max(0, last.width - first.width);
  const growY = Math.max(0, last.height - first.height);
  if (!moved(dx, 0) && !moved(dy, 0) && !moved(growX, 0) && !moved(growY, 0)) return null;
  const from: Keyframe = { transform: `translate(${round(dx)}px, ${round(dy)}px)` };
  const to: Keyframe = { transform: 'translate(0px, 0px)' };
  if (moved(growX, 0) || moved(growY, 0)) {
    from.clipPath = `inset(0px ${round(growX)}px ${round(growY)}px 0px round ${radius})`;
    to.clipPath = `inset(0px 0px 0px 0px round ${radius})`;
  }
  return [from, to];
}

export const ENTER_KEYFRAMES: Keyframe[] = [
  { opacity: 0, transform: 'translateY(4px)' },
  { opacity: 1, transform: 'translateY(0px)' },
];

const round = (value: number) => Math.round(value * 10) / 10;

export function useNexLayoutTransition(
  container: RefObject<HTMLElement | null>,
  layoutKey: unknown,
  { motion, selector = `[${ID}]`, duration = MOTION.surface.duration, easing = MOTION.surface.easing, radius = '0px' }: NexLayoutTransitionOptions = {},
): void {
  const nex = useNex();
  const preference = useMotionPreference();
  const level = motion ?? nex.motion;
  const boxes = useRef(new Map<string, Box>());
  const running = useRef(new Map<string, Animation>());
  const previousKey = useRef(layoutKey);

  /** Lo último que se vio de cada superficie, relativo al contenedor. */
  const record = () => {
    const root = container.current;
    if (!root) return;
    const origin = root.getBoundingClientRect();
    const next = new Map<string, Box>();
    for (const element of root.querySelectorAll<HTMLElement>(selector)) {
      const id = element.getAttribute(ID);
      if (!id) continue;
      const box = element.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      next.set(id, { x: box.left - origin.left, y: box.top - origin.top, width: box.width, height: box.height });
    }
    boxes.current = next;
  };

  // El contenedor cambia de tamaño (ventana, teclado virtual): lo registrado se pone al día.
  useEffect(() => {
    const root = container.current;
    record();
    if (!root || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (running.current.size === 0) record();
      });
    });
    observer.observe(root);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
    // `record` sólo lee refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, selector]);

  useIsoLayoutEffect(() => {
    if (Object.is(previousKey.current, layoutKey)) return;
    previousKey.current = layoutKey;
    const root = container.current;
    for (const animation of running.current.values()) animation.cancel();
    running.current.clear();
    if (!root) return;
    const keyboard = root.closest('[data-nx-input="keyboard"]') !== null;
    const first = boxes.current;
    if (!canAnimate(level, preference) || keyboard || typeof root.animate !== 'function') {
      record();
      return;
    }
    const origin = root.getBoundingClientRect();
    // La disposición final es la base del próximo cambio, aunque éste se interrumpa.
    const next = new Map<string, Box>();
    for (const element of root.querySelectorAll<HTMLElement>(selector)) {
      const id = element.getAttribute(ID);
      if (!id) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      const last = { x: rect.left - origin.left, y: rect.top - origin.top, width: rect.width, height: rect.height };
      next.set(id, last);
      const before = first.get(id);
      const frames = before ? layoutKeyframes(before, last, radius) : ENTER_KEYFRAMES;
      if (!frames) continue;
      const animation = element.animate(frames, { duration: before ? duration : MOTION.content.duration * 0.7, easing });
      running.current.set(id, animation);
      const settle = () => {
        if (running.current.get(id) === animation) running.current.delete(id);
      };
      animation.addEventListener('finish', settle);
      animation.addEventListener('cancel', settle);
    }
    boxes.current = next;
  }, [layoutKey]);

  useEffect(() => () => {
    for (const animation of running.current.values()) animation.cancel();
  }, []);
}
