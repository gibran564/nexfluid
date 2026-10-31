'use client';

/**
 * NexSurface — la membrana: primitiva de todas las superficies de NexFluidUI.
 *
 * Estático primero: en el servidor y sin JS es un elemento con superelipse
 * CSS (`corner-shape`), relleno y borde del material. En el cliente, si es
 * `live`, mide su caja y pinta la membrana en SVG con @nexfluid/core; desde
 * ahí recorre los estados rest → attract → deform → activate → settle:
 * el borde más cercano al puntero se abomba, la presión aplasta conservando
 * el área, la activación inunda la zona cromática y todo se recupera con la
 * física de la familia «surface» o «control».
 *
 * Teclado y táctil son equivalentes: el foco visible pone la membrana en
 * tensión (attract) e Intro/Espacio la activan, sin deformación.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, type ElementType, type HTMLAttributes, type PointerEvent, type ReactNode, type Ref } from 'react';
import { membranePath } from '@nexfluid/core';
import type { Material, ShapeFamily } from '@nexfluid/foundation';
import { cx, type NexMotion } from '@nexfluid/components';
import { canAnimate, useMotionPreference, useNex } from './provider.tsx';
import { useSprings } from './springs.ts';

export type SurfaceKind = 'surface' | 'control' | 'content';

export interface NexSurfaceProps extends Omit<HTMLAttributes<HTMLElement>, 'role'> {
  /** Elemento raíz (div, button, a, article, section, aside, li…). */
  as?: ElementType;
  /** Papel en la gramática: decide la familia geométrica de la dirección activa. */
  kind?: SurfaceKind;
  /** Fuerza una familia: fluid · membrane · capsule · morph · editorial. */
  shape?: ShapeFamily;
  material?: Material;
  /** Responde al puntero y al foco (attract, deform, activate). */
  interactive?: boolean;
  /** Inunda la zona cromática al activarse (clic, Intro, Espacio). */
  activatable?: boolean;
  /** Pinta la membrana en SVG. Por defecto, sólo si es interactiva. */
  live?: boolean;
  selected?: boolean;
  /** Sin borde en reposo. */
  quiet?: boolean;
  motion?: NexMotion;
  /** Rol ARIA del elemento (la prop `role` está reservada a la gramática). */
  ariaRole?: string;
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
  /** Atributos del elemento elegido con `as` (href, type, disabled, aria-*, data-*…). */
  [key: string]: unknown;
}

type Geometry = { radius: number; smoothing: number; pull: number; push: number };

function readGeometry(el: HTMLElement): Geometry {
  const cs = getComputedStyle(el);
  const n = (name: string, fallback: number) => {
    const v = parseFloat(cs.getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };
  return { radius: n('--nx-r', 16), smoothing: n('--nx-smooth', 0.8), pull: n('--nx-pull', 0), push: n('--nx-push', 0) };
}

export function NexSurface({
  as: Tag = 'div', kind = 'surface', shape, material = 'base', interactive = false, activatable = false, live, selected, quiet,
  motion, ariaRole, ref, className, children, onPointerEnter, onPointerMove, onPointerLeave, onPointerDown, onPointerUp, onFocus, onBlur, onKeyDown, ...rest
}: NexSurfaceProps) {
  const defaults = useNex();
  const level = motion ?? defaults.motion;
  const preference = useMotionPreference();
  const el = useRef<HTMLElement | null>(null);
  const fill = useRef<SVGPathElement>(null);
  const edge = useRef<SVGPathElement>(null);
  const meniscus = useRef<SVGPathElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const size = useRef({ w: 0, h: 0 });
  const focus = useRef({ x: 0, y: 0 });
  const geometry = useRef<Geometry>({ radius: 16, smoothing: 0.8, pull: 0, push: 0 });
  const gradient = `nx-m-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const drawLive = live ?? interactive;

  const setState = (state: string) => {
    if (el.current) el.current.dataset.nxState = state;
  };

  const draw = useCallback((amount: number, press: number) => {
    const { w, h } = size.current;
    if (!w || !h || !fill.current) return;
    const g = geometry.current;
    const d = membranePath(w, h, {
      radius: g.radius,
      smoothing: g.smoothing,
      attract: amount ? { x: focus.current.x, y: focus.current.y, amount } : undefined,
      press,
    });
    fill.current.setAttribute('d', d);
    edge.current?.setAttribute('d', d);
    meniscus.current?.setAttribute('d', d);
  }, []);

  const springs = useSprings([0, 0], ([amount, press]) => {
    draw(amount!, press!);
    if (amount! < 0.05 && press! < 0.0005 && el.current?.dataset.nxState === 'settle') setState('rest');
  }, 0.01);

  // Medida y dibujo inicial (antes de pintar en el cliente).
  const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
  useIsoLayoutEffect(() => {
    const node = el.current;
    if (!node || !drawLive || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      size.current = { w: node.offsetWidth, h: node.offsetHeight };
      geometry.current = readGeometry(node);
      svg.current?.setAttribute('viewBox', `0 0 ${size.current.w} ${size.current.h}`);
      const [a, p] = springs.values();
      draw(a!, p!);
      node.dataset.nxDrawn = '';
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [drawLive, draw, springs, shape, kind, defaults.look]);

  const physical = () => drawLive && canAnimate(level, preference) && (level === 'fluid' || level === 'elastic' || level === 'subtle');
  const amplitude = () => (level === 'subtle' ? 0.5 : level === 'elastic' ? 1.3 : 1);

  const locate = (e: PointerEvent<HTMLElement>) => {
    const node = el.current!;
    const r = node.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    node.style.setProperty('--nx-zone-x', `${x}px`);
    node.style.setProperty('--nx-zone-y', `${y}px`);
    // El foco del campo se proyecta al borde más cercano: tira de la membrana hacia fuera.
    const { w, h } = size.current;
    const dl = x, dr = w - x, dt = y, db = h - y;
    const m = Math.min(dl, dr, dt, db);
    focus.current = m === dl ? { x: -8, y } : m === dr ? { x: w + 8, y } : m === dt ? { x, y: -8 } : { x, y: h + 8 };
  };

  const handlers = interactive
    ? {
        onPointerEnter: (e: PointerEvent<HTMLElement>) => {
          if (el.current) geometry.current = readGeometry(el.current);
          locate(e);
          setState('attract');
          if (physical()) springs.to([geometry.current.pull * amplitude(), 0], ['magnetic', 'flow']);
          onPointerEnter?.(e as never);
        },
        onPointerMove: (e: PointerEvent<HTMLElement>) => {
          locate(e);
          if (physical() && el.current?.dataset.nxState === 'attract') springs.to([geometry.current.pull * amplitude(), 0], ['magnetic', 'flow']);
          onPointerMove?.(e as never);
        },
        onPointerLeave: (e: PointerEvent<HTMLElement>) => {
          setState('settle');
          if (physical()) springs.to([0, 0], [kind === 'control' ? 'elastic' : 'viscous', kind === 'control' ? 'elastic' : 'viscous']);
          else setState('rest');
          onPointerLeave?.(e as never);
        },
        onPointerDown: (e: PointerEvent<HTMLElement>) => {
          if (e.button === 0) {
            locate(e);
            setState('deform');
            if (physical()) springs.to([geometry.current.pull * 0.5, geometry.current.push * amplitude()], ['flow', 'flow']);
          }
          onPointerDown?.(e as never);
        },
        onPointerUp: (e: PointerEvent<HTMLElement>) => {
          setState(activatable ? 'activate' : 'attract');
          if (physical()) springs.to([geometry.current.pull * amplitude(), 0], [kind === 'control' ? 'elastic' : 'spring', kind === 'control' ? 'elastic' : 'spring']);
          if (activatable) setTimeout(() => { if (el.current?.dataset.nxState === 'activate') setState('attract'); }, 420);
          onPointerUp?.(e as never);
        },
        onFocus: (e: React.FocusEvent<HTMLElement>) => {
          if (e.target === e.currentTarget && e.currentTarget.matches(':focus-visible')) setState('attract');
          onFocus?.(e as never);
        },
        onBlur: (e: React.FocusEvent<HTMLElement>) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setState('rest');
          onBlur?.(e as never);
        },
        onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
          if (activatable && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
            el.current?.style.setProperty('--nx-zone-x', '50%');
            el.current?.style.setProperty('--nx-zone-y', '50%');
            setState('activate');
            setTimeout(() => { if (el.current?.dataset.nxState === 'activate') setState('attract'); }, 420);
          }
          onKeyDown?.(e as never);
        },
      }
    : { onPointerEnter, onPointerMove, onPointerLeave, onPointerDown, onPointerUp, onFocus, onBlur, onKeyDown };

  useEffect(() => () => {
    const node = el.current;
    if (node) delete node.dataset.nxDrawn;
  }, []);

  return (
    <Tag
      {...rest}
      {...handlers}
      role={ariaRole}
      ref={(node: HTMLElement | null) => {
        el.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as { current: HTMLElement | null }).current = node;
      }}
      className={cx('nx-surface', className)}
      data-nx-role={kind}
      data-nx-shape={shape}
      data-nx-material={material}
      data-nx-state={(rest["data-nx-state"] as string | undefined) ?? "rest"}
      data-nx-selected={selected ? '' : undefined}
      data-nx-quiet={quiet ? '' : undefined}
      data-nx-motion={level}
    >
      {drawLive && (
        <svg ref={svg} className="nx-surface__shape" aria-hidden="true" focusable="false" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="nx-surface__meniscus-top" />
              <stop offset="0.45" className="nx-surface__meniscus-bottom" />
            </linearGradient>
          </defs>
          <path ref={fill} className="nx-surface__fill" />
          <path ref={meniscus} className="nx-surface__meniscus" stroke={`url(#${gradient})`} />
          <path ref={edge} className="nx-surface__edge" />
        </svg>
      )}
      {interactive && <span className="nx-surface__zone" aria-hidden="true" />}
      {children}
    </Tag>
  );
}
