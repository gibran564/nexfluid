'use client';

/**
 * NexScroll: navegación espacial sobre el desplazamiento nativo.
 *
 * El área es un elemento desplazable normal (rueda, touchpad, teclado,
 * táctil y tecnologías de asistencia funcionan como siempre). Encima, un
 * riel editorial con un pulgar fluido que representa la posición real,
 * progreso de lectura, marcadores de sección y una etiqueta contextual.
 * La barra nativa sólo se oculta cuando el reemplazo ya está medido y
 * pintado (`data-nx-scroll-ready`); si el contenido desborda también en el
 * eje cruzado, se conserva la nativa.
 *
 * Accesibilidad: el riel y el pulgar son una ayuda de puntero (como una
 * barra nativa) y se ocultan a los lectores; los marcadores son una
 * navegación real por secciones (botones con `aria-current`).
 */
import {
  createContext, forwardRef, useCallback, useContext, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type HTMLAttributes, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref,
} from 'react';
import { ScrollTracker, type ScrollOrientation, type ScrollParts, type ScrollSection, type ScrollState } from '@eclipsis/core';
import { cx, type NexDensity, type NexMotion } from '@eclipsis/components';
import { canAnimate, useMotionPreference, useNex } from './provider.tsx';

export type NexScrollVariant = 'minimal' | 'fluid' | 'editorial' | 'spatial';
export type { ScrollSection as NexScrollSection } from '@eclipsis/core';

/** Deformación viscosa por variante (0 = pulgar rígido). */
const DEFORMATION: Record<NexScrollVariant, number> = { minimal: 0, fluid: 1, editorial: 0.6, spatial: 0.8 };

export interface NexScrollController {
  scrollToSection(id: string, options?: { smooth?: boolean; focus?: boolean }): void;
  scrollToProgress(progress: number, smooth?: boolean): void;
  /** Vuelve a medir (normalmente innecesario: ResizeObserver lo hace). */
  refresh(): void;
  readonly state: ScrollState;
  readonly viewport: HTMLElement | null;
}

interface ScrollContextValue {
  variant: NexScrollVariant;
  orientation: ScrollOrientation;
  sections: readonly ScrollSection[];
  active: number;
  /** Sección bajo el puntero o el foco en los marcadores (vista previa en la cabecera) o -1. */
  preview: number;
  setPreview: (i: number) => void;
  register: (part: keyof ScrollParts | 'viewport', el: Element | null) => void;
  tracker: () => ScrollTracker | null;
  ids: { viewport: string };
}

const ScrollContext = createContext<ScrollContextValue | null>(null);
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function useScroll(name: string): ScrollContextValue {
  const ctx = useContext(ScrollContext);
  if (!ctx) throw new Error(`${name} debe ir dentro de <NexScroll.Root> o <NexScroll.Area>.`);
  return ctx;
}

export interface NexScrollRootProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children?: ReactNode;
  variant?: NexScrollVariant;
  orientation?: ScrollOrientation;
  /** Secciones del contenido (ids dentro del área) para marcadores, progreso y etiqueta. */
  sections?: readonly ScrollSection[];
  /** Fracción del área visible que decide la sección activa (0.3). */
  readingLine?: number;
  motion?: NexMotion;
  density?: NexDensity;
  /** Altura máxima del área (px o CSS). Sin ella, el área ocupa la altura de su contenedor. */
  maxHeight?: number | string;
  onSectionChange?: (id: string | null) => void;
  onScrollStateChange?: (state: ScrollState) => void;
  controller?: Ref<NexScrollController>;
}

/** Raíz componible: crea el controlador y reúne viewport, riel, pulgar y marcadores. */
export function NexScrollRoot({
  children, variant = 'fluid', orientation = 'vertical', sections = [], readingLine, motion, density, maxHeight,
  onSectionChange, onScrollStateChange, controller, className, style, ...rest
}: NexScrollRootProps) {
  const defaults = useNex();
  const level = motion ?? defaults.motion;
  const preference = useMotionPreference();
  const animate = useRef<() => boolean>(() => true);
  animate.current = () => canAnimate(level, preference);
  const root = useRef<HTMLDivElement>(null);
  const parts = useRef<ScrollParts & { viewport?: HTMLElement | null; markerEls: Set<HTMLElement> }>({ markerEls: new Set() });
  const tracker = useRef<ScrollTracker | null>(null);
  const [active, setActive] = useState(-1);
  const [preview, setPreview] = useState(-1);
  const callbacks = useRef({ onSectionChange, onScrollStateChange, sections });
  callbacks.current = { onSectionChange, onScrollStateChange, sections };
  const id = useId();

  const push = useCallback(() => {
    const p = parts.current;
    for (const m of p.markerEls) if (!m.isConnected) p.markerEls.delete(m);
    tracker.current?.setParts({ root: root.current, track: p.track, thumb: p.thumb, progress: p.progress, label: p.label, percent: p.percent, markers: [...p.markerEls] });
  }, []);

  const register = useCallback((part: keyof ScrollParts | 'viewport', el: Element | null) => {
    const p = parts.current;
    if (part === 'markers') {
      if (el) p.markerEls.add(el as HTMLElement);
      return;
    }
    (p as unknown as Record<string, unknown>)[part] = el;
    if (part !== 'viewport') push();
  }, [push]);

  // Un controlador por viewport (montado en el primer layout).
  useIsoLayoutEffect(() => {
    const viewport = parts.current.viewport;
    if (!viewport) return;
    const t = new ScrollTracker(viewport, {
      orientation,
      sections: callbacks.current.sections,
      readingLine,
      deformation: DEFORMATION[variant],
      animate: () => animate.current(),
      onChange: (state) => {
        setActive(state.active);
        callbacks.current.onScrollStateChange?.(state);
        callbacks.current.onSectionChange?.(callbacks.current.sections[state.active]?.id ?? null);
      },
    });
    tracker.current = t;
    push();
    return () => {
      t.dispose();
      tracker.current = null;
    };
  }, [orientation]); // eslint-disable-line react-hooks/exhaustive-deps

  const sectionKey = sections.map((s) => `${s.id}\u0000${s.label}`).join('\u0001');
  useIsoLayoutEffect(() => {
    // Los marcadores se vuelven a registrar en cada render de la lista.
    tracker.current?.configure({ sections, readingLine, deformation: DEFORMATION[variant] });
    push();
  }, [sectionKey, readingLine, variant]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(controller, () => ({
    scrollToSection: (sid, o) => tracker.current?.scrollToSection(sid, o),
    scrollToProgress: (p, smooth) => tracker.current?.scrollToProgress(p, smooth),
    refresh: () => tracker.current?.refresh(),
    get state() {
      return tracker.current?.current ?? { overflow: false, progress: 0, active: -1, atStart: true, atEnd: true };
    },
    get viewport() {
      return parts.current.viewport ?? null;
    },
  }), []);

  const value = useMemo<ScrollContextValue>(() => ({
    variant, orientation, sections, active, preview, setPreview, register, tracker: () => tracker.current, ids: { viewport: `${id}-viewport` },
  }), [variant, orientation, sections, active, preview, register, id]);

  return (
    <ScrollContext.Provider value={value}>
      <div
        {...rest}
        ref={root}
        className={cx('nx-scroll', className)}
        style={{ ...style, ...(maxHeight !== undefined ? { '--nx-scroll-max': typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : null) } as CSSProperties}
        data-nx-variant={variant}
        data-nx-orientation={orientation}
        data-nx-density={density ?? defaults.density}
        data-nx-motion={level}
      >
        {children}
      </div>
    </ScrollContext.Provider>
  );
}

export interface NexScrollViewportProps extends HTMLAttributes<HTMLDivElement> {
  /** Nombre accesible de la región desplazable (obligatorio si no hay aria-labelledby). */
  label?: string;
}

/** El elemento que desplaza el navegador. Enfocable con teclado para desplazarse sin ratón. */
export const NexScrollViewport = forwardRef<HTMLDivElement, NexScrollViewportProps>(function NexScrollViewport({ label, className, children, ...rest }, ref) {
  const ctx = useScroll('NexScroll.Viewport');
  const setRef = useCallback((el: HTMLDivElement | null) => {
    ctx.register('viewport', el);
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  }, [ctx.register, ref]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      role={label || rest['aria-labelledby'] ? 'region' : undefined}
      aria-label={label}
      tabIndex={0}
      {...rest}
      id={rest.id ?? ctx.ids.viewport}
      ref={setRef}
      className={cx('nx-scroll__viewport', className)}
    >
      {/* Un único hijo medible: ResizeObserver detecta el contenido dinámico. */}
      <div className="nx-scroll__content">{children}</div>
    </div>
  );
});

/** Riel: superficie de puntero (arrastre, clic, rueda). Oculto a los lectores: el área ya se desplaza con teclado. */
export function NexScrollRail({ children, className }: { children?: ReactNode; className?: string }) {
  const ctx = useScroll('NexScroll.Rail');
  const rail = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const axis = (e: { clientX: number; clientY: number }) => (ctx.orientation === 'vertical' ? e.clientY : e.clientX);

  useIsoLayoutEffect(() => {
    ctx.register('track', rail.current);
    return () => ctx.register('track', null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // La rueda sobre el riel (fuera del área) desplaza el área, no la página.
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const t = ctx.tracker();
      if (!t) return;
      e.preventDefault();
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? t.viewport.clientHeight : 1;
      t.wheel(e.deltaX * k, e.deltaY * k);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const t = ctx.tracker();
    if (!t || e.button !== 0) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    const scale = (ctx.orientation === 'vertical' ? r.height / (e.currentTarget.offsetHeight || 1) : r.width / (e.currentTarget.offsetWidth || 1)) || 1;
    const local = (ctx.orientation === 'vertical' ? e.clientY - r.top : e.clientX - r.left) / scale;
    const g = t.geometry();
    const rtl = ctx.orientation === 'horizontal' && getComputedStyle(e.currentTarget).direction === 'rtl';
    const start = rtl ? e.currentTarget.offsetWidth - g.start - g.length : g.start;
    if (local < start - 4 || local > start + g.length + 4) t.jumpToTrack(axis(e));
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragging.current = true;
    t.beginDrag(axis(e));
  };
  const end = () => {
    if (!dragging.current) return;
    dragging.current = false;
    ctx.tracker()?.endDrag();
  };
  return (
    <div
      ref={rail}
      className={cx('nx-scroll__rail', className)}
      aria-hidden="true"
      onPointerDown={onPointerDown}
      onPointerMove={(e) => { if (dragging.current) ctx.tracker()?.dragTo(axis(e)); }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onPointerEnter={() => ctx.tracker()?.setInteracting(true)}
      onPointerLeave={() => ctx.tracker()?.setInteracting(false)}
    >
      {children}
    </div>
  );
}

/** Pulgar fluido (SVG). Su forma se escribe por fotograma, fuera de React. */
export function NexScrollThumb() {
  const ctx = useScroll('NexScroll.Thumb');
  return (
    <svg className="nx-scroll__thumb" aria-hidden="true" focusable="false">
      <path ref={(el) => ctx.register('thumb', el)} className="nx-scroll__thumb-shape" />
    </svg>
  );
}

/** Progreso de lectura: la línea se llena hasta el centro del pulgar. */
export function NexScrollProgress() {
  const ctx = useScroll('NexScroll.Progress');
  return <span ref={(el) => ctx.register('progress', el)} className="nx-scroll__progress" aria-hidden="true" />;
}

/** Texto de la sección activa (lo escribe el controlador sólo cuando cambia). */
export function NexScrollLabel({ className }: { className?: string }) {
  const ctx = useScroll('NexScroll.Label');
  return <span ref={(el) => ctx.register('label', el)} className={cx('nx-scroll__label', className)} />;
}

/** Porcentaje de progreso real (texto; sólo cambia con el entero). */
export function NexScrollPercent({ className }: { className?: string }) {
  const ctx = useScroll('NexScroll.Percent');
  return <span ref={(el) => ctx.register('percent', el)} className={cx('nx-scroll__chapter-percent', className)} />;
}

/**
 * Cabecera de capítulo: índice, sección activa y progreso, fuera del área de
 * lectura. Al señalar un marcador, anticipa a qué sección lleva. Es una ayuda
 * visual (los marcadores ya anuncian la sección actual con aria-current).
 */
export function NexScrollChapter({ children }: { children?: ReactNode }) {
  const ctx = useScroll('NexScroll.Chapter');
  const total = ctx.sections.length;
  const shown = ctx.preview >= 0 ? ctx.preview : ctx.active;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="nx-scroll__chapter" aria-hidden="true">
      {children}
      {total > 0 && <span className="nx-scroll__chapter-index">{pad(Math.max(1, shown + 1))} / {pad(total)}</span>}
      <span className="nx-scroll__chapter-title" hidden={ctx.preview >= 0}><NexScrollLabel /></span>
      {ctx.preview >= 0 && <span className="nx-scroll__chapter-title" data-preview="">{ctx.sections[ctx.preview]?.label}</span>}
      <NexScrollPercent />
    </div>
  );
}

/** Carril: columna propia (fila en horizontal) para riel y marcadores; nunca encima del contenido. */
export function NexScrollLane({ children }: { children?: ReactNode }) {
  return <div className="nx-scroll__lane">{children}</div>;
}

/** Marcadores de sección: navegación real por el contenido. */
export function NexScrollMarkers({ label = 'Secciones' }: { label?: string }) {
  const ctx = useScroll('NexScroll.Markers');
  if (!ctx.sections.length) return null;
  return (
    <nav className="nx-scroll__markers" aria-label={label}>
      <ol>
        {ctx.sections.map((s, i) => (
          <li key={s.id} ref={(el) => ctx.register('markers', el)} data-section={s.id} className="nx-scroll__marker">
            <button
              type="button"
              aria-current={i === ctx.active ? 'location' : undefined}
              aria-controls={ctx.ids.viewport}
              onClick={() => ctx.tracker()?.scrollToSection(s.id, { focus: true })}
              onPointerEnter={() => { ctx.tracker()?.setInteracting(true); ctx.setPreview(i); }}
              onPointerLeave={() => { ctx.tracker()?.setInteracting(false); ctx.setPreview(-1); }}
              onFocus={() => ctx.setPreview(i)}
              onBlur={() => ctx.setPreview(-1)}
            >
              <span className="nx-scroll__marker-label">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export interface NexScrollAreaProps extends Omit<NexScrollRootProps, 'children'> {
  children?: ReactNode;
  /** Nombre accesible del área desplazable. */
  label?: string;
  /** Nombre de la navegación por secciones (editorial). Por defecto «Secciones: {label}», único por área. */
  markersLabel?: string;
  viewportProps?: HTMLAttributes<HTMLDivElement>;
  /** Editorial: cabecera de capítulo (índice, sección y progreso). `false` la omite; un nodo se pinta delante (p. ej. el título del documento). */
  chapter?: boolean | ReactNode;
}

/**
 * Anatomía completa según la variante:
 * `minimal` (pulgar sutil) · `fluid` (pulgar viscoso) ·
 * `editorial` (cabecera de capítulo, progreso y marcadores) · `spatial` (bordes de región y desvanecido).
 */
export function NexScrollArea({ children, label, markersLabel, viewportProps, chapter = true, variant = 'fluid', ...rest }: NexScrollAreaProps) {
  const editorial = variant === 'editorial';
  return (
    <NexScrollRoot variant={variant} {...rest}>
      {editorial && chapter !== false && <NexScrollChapter>{chapter === true ? null : chapter}</NexScrollChapter>}
      <NexScrollViewport label={label} {...viewportProps}>{children}</NexScrollViewport>
      <NexScrollLane>
        <NexScrollRail>
          {editorial && <NexScrollProgress />}
          <NexScrollThumb />
        </NexScrollRail>
        {editorial && <NexScrollMarkers label={markersLabel ?? (label ? `Secciones: ${label}` : undefined)} />}
      </NexScrollLane>
    </NexScrollRoot>
  );
}

/** `NexScroll.Area` para el caso común; el resto de piezas para componer otra anatomía. */
export const NexScroll = Object.assign(NexScrollArea, {
  Area: NexScrollArea,
  Root: NexScrollRoot,
  Viewport: NexScrollViewport,
  Rail: NexScrollRail,
  Thumb: NexScrollThumb,
  Progress: NexScrollProgress,
  Label: NexScrollLabel,
  Percent: NexScrollPercent,
  Chapter: NexScrollChapter,
  Lane: NexScrollLane,
  Markers: NexScrollMarkers,
});
