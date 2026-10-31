/**
 * NexScroll: desplazamiento nativo con una capa física y editorial encima.
 *
 * El navegador sigue desplazando (rueda, touchpad, teclado, táctil, lectores
 * de pantalla): aquí no se intercepta ni se simula el scroll. Sólo se lee su
 * estado real y se dibuja: un riel, un pulgar que lo representa con exactitud
 * (las deformaciones sólo añaden material alrededor de su posición real),
 * progreso de lectura y marcadores de sección.
 *
 * Geometría pura (probada en Node) + `ScrollTracker`, el controlador DOM sin
 * framework que usan los adaptadores.
 */
import { sharedClock, type Tick } from './clock.ts';
import { liquidCapsule } from './membrane.ts';
import { FluidValue } from './spring.ts';
import { MOTION_PRESETS } from './presets.ts';

export type ScrollOrientation = 'vertical' | 'horizontal';

/** Medidas del eje de desplazamiento, en px CSS sin escalar. */
export interface ScrollMetrics {
  /** Desplazamiento actual (scrollTop / |scrollLeft|). */
  offset: number;
  /** Tamaño visible (clientHeight / clientWidth). */
  viewport: number;
  /** Tamaño total (scrollHeight / scrollWidth). */
  content: number;
  /** Longitud del riel. */
  track: number;
}

export interface ThumbGeometry {
  /** Inicio del pulgar en el riel. */
  start: number;
  length: number;
  /** Desplazamiento máximo del contenido. */
  max: number;
  /** 0..1: posición del desplazamiento. */
  progress: number;
  /** ¿Hay algo que desplazar? */
  overflow: boolean;
}

/** Pulgar exacto: su longitud es la fracción visible y su posición, la del scroll real. */
export function scrollThumb({ offset, viewport, content, track }: ScrollMetrics, minThumb = 28): ThumbGeometry {
  const max = Math.max(0, content - viewport);
  const overflow = max > 0.5;
  if (!overflow) return { start: 0, length: track, max, progress: 0, overflow: false };
  const length = Math.min(track, Math.max(Math.min(minThumb, track), (track * viewport) / content));
  const progress = Math.min(1, Math.max(0, offset / max));
  return { start: (track - length) * progress, length, max, progress, overflow };
}

/** Inversa de `scrollThumb`: desplazamiento que deja el pulgar en `thumbStart`. */
export function offsetForThumb(metrics: ScrollMetrics, thumbStart: number, minThumb = 28): number {
  const g = scrollThumb(metrics, minThumb);
  const room = metrics.track - g.length;
  if (!g.overflow || room <= 0) return 0;
  return Math.min(g.max, Math.max(0, (thumbStart / room) * g.max));
}

/** Centro del pulgar en el riel cuando una sección (a `sectionOffset` px del inicio) queda arriba. */
export function markerPosition(metrics: ScrollMetrics, sectionOffset: number, minThumb = 28): number {
  const g = scrollThumb({ ...metrics, offset: Math.min(sectionOffset, Math.max(0, metrics.content - metrics.viewport)) }, minThumb);
  return g.start + g.length / 2;
}

/**
 * Sección activa: la última cuyo inicio ha cruzado la línea de lectura
 * (`readingLine` = fracción del área visible). Al llegar al final, la última.
 */
export function activeSection(offsets: readonly number[], { offset, viewport, content }: Omit<ScrollMetrics, 'track'>, readingLine = 0.3): number {
  if (!offsets.length) return -1;
  if (content - viewport - offset < 2) return offsets.length - 1;
  const line = offset + viewport * readingLine;
  let index = 0;
  offsets.forEach((o, i) => { if (o <= line) index = i; });
  return index;
}

export interface ThumbPathOptions {
  /** Estiramiento en px a lo largo del eje (signo = dirección del movimiento). */
  stretch: number;
  /** Grosor del pulgar en reposo/expandido ya resuelto. */
  thickness: number;
  orientation: ScrollOrientation;
  /** Posición transversal (desde el borde del riel). */
  cross: number;
  /** 0..1: cuánto adelgaza y forma cuello al estirarse. */
  tension?: number;
}

/**
 * Contorno del pulgar fluido. El rectángulo real [start, start+length] queda
 * siempre cubierto: el borde que avanza se adelanta con el estiramiento y el
 * posterior se retrasa un 35 % (tensión direccional). Con volumen casi
 * constante, el pulgar adelgaza al estirarse y forma un cuello leve.
 */
export function scrollThumbPath(g: ThumbGeometry, { stretch, thickness, orientation, cross, tension = 0.5 }: ThumbPathOptions): string {
  const lead = Math.abs(stretch);
  const trail = lead * 0.35;
  const forward = stretch >= 0;
  const s = g.start - (forward ? trail : lead);
  const e = g.start + g.length + (forward ? lead : trail);
  const grow = (e - s) / Math.max(1, g.length);
  const thin = Math.max(0.72, 1 / Math.sqrt(1 + (grow - 1) * tension * 1.6));
  const thick = thickness * thin;
  const pinch = Math.min(0.6, (grow - 1) * 1.2) * tension;
  return liquidCapsule(s, e, thick, pinch, { vertical: orientation === 'vertical', offset: cross + (thickness - thick) / 2 });
}

/* ---- Controlador DOM ---------------------------------------------------- */

export interface ScrollSection {
  /** id del elemento dentro del área desplazable. */
  id: string;
  label: string;
}

export interface ScrollParts {
  /** Contenedor de toda la anatomía: recibe `data-nx-*` de estado. */
  root?: HTMLElement | null;
  /** Riel: define la longitud y el sistema de coordenadas del pulgar. */
  track?: HTMLElement | null;
  thumb?: SVGPathElement | null;
  /** Recibe `--nx-scroll-fill` (px) hasta el centro del pulgar. */
  progress?: HTMLElement | null;
  /** Recibe `--nx-scroll-at` (px) y el texto de la sección activa. */
  label?: HTMLElement | null;
  /** Recibe el porcentaje de progreso como texto (sólo cuando cambia el entero). */
  percent?: HTMLElement | null;
  /** Un elemento por sección con `data-section="id"`: recibe `--nx-scroll-marker` (px) y `--nx-near` (0..1). */
  markers?: readonly HTMLElement[];
}

export interface ScrollState {
  overflow: boolean;
  progress: number;
  /** Índice de la sección activa o -1. */
  active: number;
  atStart: boolean;
  atEnd: boolean;
}

export interface ScrollTrackerOptions {
  orientation?: ScrollOrientation;
  minThumb?: number;
  sections?: readonly ScrollSection[];
  /** Fracción del área visible que marca la sección activa. */
  readingLine?: number;
  /** ¿Se anima ahora? (movimiento reducido o `motion="none"` → false). */
  animate?: () => boolean;
  /** 0..1: intensidad de la deformación viscosa (0 = pulgar rígido). */
  deformation?: number;
  parts?: ScrollParts;
  /**
   * Si el contenido desborda también en el eje cruzado, conservar la barra
   * nativa (`data-nx-native`). Un área de dos ejes con un tracker por eje
   * (rejillas) lo desactiva: cada eje ya tiene su riel.
   */
  crossAxisFallback?: boolean;
  /** Cambios discretos de estado (sección activa, desbordamiento, extremos). No por fotograma. */
  onChange?: (state: ScrollState) => void;
}

const STRETCH = MOTION_PRESETS.viscous;
const EXPAND = MOTION_PRESETS.calm;
const SETTLE_AFTER = 90;
const ACTIVE_FOR = 900;

/**
 * Observa un elemento desplazable nativo y pinta su anatomía NexScroll.
 * Escucha `scroll` de forma pasiva, mide con ResizeObserver (área y
 * contenido) y sólo anima mientras hay movimiento: en reposo no hay bucle.
 */
export class ScrollTracker {
  readonly viewport: HTMLElement;
  private opts: Required<Omit<ScrollTrackerOptions, 'parts' | 'onChange'>> & Pick<ScrollTrackerOptions, 'onChange'>;
  private parts: ScrollParts = {};
  private metrics: ScrollMetrics = { offset: 0, viewport: 0, content: 0, track: 0 };
  private offsets: number[] = [];
  private markerAt: number[] = [];
  private rtl = false;
  private thickness = { rest: 4, active: 8 };
  private stretch = new FluidValue(0, STRETCH.spring, STRETCH.viscosity);
  private expand = new FluidValue(0, EXPAND.spring, 0);
  private tick: Tick | null = null;
  private lastOffset = 0;
  private lastTime = 0;
  private lastEvent = -Infinity;
  private interacting = false;
  private drag: { client: number; offset: number; scale: number } | null = null;
  private state: ScrollState = { overflow: false, progress: 0, active: -1, atStart: true, atEnd: true };
  private labelText = '';
  private percentText = '';
  private observer: ResizeObserver | null = null;
  private disposed = false;

  constructor(viewport: HTMLElement, options: ScrollTrackerOptions = {}) {
    this.viewport = viewport;
    this.opts = {
      orientation: options.orientation ?? 'vertical',
      minThumb: options.minThumb ?? 28,
      sections: options.sections ?? [],
      readingLine: options.readingLine ?? 0.3,
      animate: options.animate ?? (() => true),
      deformation: options.deformation ?? 1,
      crossAxisFallback: options.crossAxisFallback ?? true,
      onChange: options.onChange,
    };
    this.parts = options.parts ?? {};
    viewport.addEventListener('scroll', this.onScroll, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.refresh());
      this.observeAll();
    }
    this.refresh();
  }

  get vertical(): boolean {
    return this.opts.orientation === 'vertical';
  }

  /** Estado discreto actual. */
  get current(): ScrollState {
    return this.state;
  }

  /** Geometría del pulgar con el desplazamiento real de este instante. */
  geometry(): ThumbGeometry {
    return scrollThumb(this.metrics, this.opts.minThumb);
  }

  configure(options: Partial<Omit<ScrollTrackerOptions, 'parts'>>): void {
    Object.assign(this.opts, Object.fromEntries(Object.entries(options).filter(([, v]) => v !== undefined)));
    this.refresh();
  }

  setParts(parts: ScrollParts): void {
    this.parts = parts;
    this.observeAll();
    this.refresh();
  }

  private observeAll(): void {
    const o = this.observer;
    if (!o) return;
    o.disconnect();
    o.observe(this.viewport);
    for (const child of Array.from(this.viewport.children)) o.observe(child);
    if (this.parts.track) o.observe(this.parts.track);
  }

  private readOffset(): number {
    const raw = this.vertical ? this.viewport.scrollTop : this.viewport.scrollLeft;
    return Math.abs(raw);
  }

  /** Vuelve a medir área, contenido, riel y secciones (ResizeObserver lo llama solo). */
  refresh(): void {
    if (this.disposed) return;
    const v = this.viewport;
    const track = this.parts.track;
    const style = typeof getComputedStyle === 'function' ? getComputedStyle(v) : null;
    this.rtl = !this.vertical && style?.direction === 'rtl';
    this.metrics = {
      offset: this.readOffset(),
      viewport: this.vertical ? v.clientHeight : v.clientWidth,
      content: this.vertical ? v.scrollHeight : v.scrollWidth,
      track: track ? (this.vertical ? track.clientHeight : track.clientWidth) : this.vertical ? v.clientHeight : v.clientWidth,
    };
    const root = this.parts.root;
    // Si el contenido desborda también en el eje cruzado, la barra nativa se conserva
    // (el riel sólo representa un eje y no debe esconder el otro).
    const cross = this.opts.crossAxisFallback && (this.vertical ? v.scrollWidth - v.clientWidth > 1 : v.scrollHeight - v.clientHeight > 1);
    root?.toggleAttribute('data-nx-native', cross);
    if (root && style) {
      const rs = getComputedStyle(root);
      const rest = parseFloat(rs.getPropertyValue('--nx-scroll-thumb')) || 4;
      const active = parseFloat(rs.getPropertyValue('--nx-scroll-thumb-active')) || rest * 2;
      this.thickness = { rest, active };
    }
    // Secciones: inicio de cada una en coordenadas del contenido (sin escalar).
    const vr = v.getBoundingClientRect();
    const scale = (this.vertical ? vr.height / (v.offsetHeight || 1) : vr.width / (v.offsetWidth || 1)) || 1;
    this.offsets = this.opts.sections.map((s) => {
      const el = v.ownerDocument.getElementById(s.id);
      if (!el || !v.contains(el)) return Number.NaN;
      const r = el.getBoundingClientRect();
      const rel = this.vertical ? r.top - vr.top : this.rtl ? vr.right - r.right : r.left - vr.left;
      return rel / scale + this.metrics.offset;
    });
    this.markerAt = this.offsets.map((o) => (Number.isFinite(o) ? markerPosition(this.metrics, o, this.opts.minThumb) : Number.NaN));
    for (const m of this.parts.markers ?? []) {
      const i = this.opts.sections.findIndex((s) => s.id === m.dataset.section);
      const at = this.markerAt[i];
      m.hidden = at === undefined || !Number.isFinite(at);
      if (at !== undefined && Number.isFinite(at)) m.style.setProperty('--nx-scroll-marker', `${at.toFixed(1)}px`);
    }
    this.paint();
    this.sync();
    if (root) root.dataset.nxScrollReady = '';
  }

  private onScroll = (): void => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const offset = this.readOffset();
    this.metrics = { ...this.metrics, offset };
    if (this.opts.animate() && !this.drag) {
      const dt = Math.max(8, now - this.lastTime);
      const g = this.geometry();
      const room = this.metrics.track - g.length;
      const velocity = g.max > 0 ? (((offset - this.lastOffset) / dt) * 1000 * room) / g.max : 0; // px de riel por segundo
      const limit = Math.min(g.length * 0.45, 26) * this.opts.deformation;
      const target = Math.max(-limit, Math.min(limit, velocity * 0.035 * this.opts.deformation));
      // Rachas en la misma dirección mantienen la tensión; un cambio de sentido la invierte.
      this.stretch.set(Math.abs(target) > Math.abs(this.stretch.target) || Math.sign(target) !== Math.sign(this.stretch.target) ? target : this.stretch.target * 0.6 + target * 0.4);
    }
    this.lastOffset = offset;
    this.lastTime = now;
    this.lastEvent = now;
    this.wake();
    this.paint();
    this.sync();
  };

  /** Hover/foco sobre el riel: la superficie se expande. */
  setInteracting(on: boolean): void {
    this.interacting = on;
    this.wake();
  }

  private wake(): void {
    const root = this.parts.root;
    if (root) root.toggleAttribute('data-nx-scrolling', this.isActive(this.now()));
    if (!this.opts.animate()) {
      this.stretch.jump(0);
      this.expand.jump(this.isActive(this.now()) ? 1 : 0);
      this.paint();
      return;
    }
    if (this.tick) return;
    this.tick = (dt) => this.step(dt);
    sharedClock().add(this.tick);
  }

  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  private isActive(now: number): boolean {
    return this.interacting || this.drag !== null || now - this.lastEvent < ACTIVE_FOR;
  }

  private step(dt: number): void {
    const now = this.now();
    if (now - this.lastEvent > SETTLE_AFTER || this.drag) this.stretch.set(0); // asentamiento elástico
    const active = this.isActive(now);
    this.expand.set(active ? 1 : 0);
    this.stretch.step(dt);
    this.expand.step(dt);
    this.paint();
    const root = this.parts.root;
    if (root) root.toggleAttribute('data-nx-scrolling', active);
    if (!active && this.stretch.atRest(0.05) && this.expand.atRest(0.005)) {
      this.stretch.jump(0);
      this.expand.jump(0);
      this.paint();
      if (this.tick) sharedClock().remove(this.tick);
      this.tick = null;
    }
  }

  /** Pinta el fotograma: sólo escribe (todas las lecturas ya están hechas). */
  private paint(): void {
    const { thumb, progress, label, markers, track } = this.parts;
    const g = this.geometry();
    const vertical = this.vertical;
    const cross = track ? (vertical ? track.clientWidth : track.clientHeight) : 0;
    const thickness = this.thickness.rest + (this.thickness.active - this.thickness.rest) * Math.min(1, Math.max(0, this.expand.value));
    const start = this.rtl ? this.metrics.track - g.start - g.length : g.start;
    const geo = { ...g, start };
    const stretch = this.stretch.value * (this.rtl ? -1 : 1);
    if (thumb) {
      thumb.setAttribute('d', g.overflow ? scrollThumbPath(geo, { stretch, thickness, orientation: this.opts.orientation, cross: (cross - thickness) / 2 }) : '');
    }
    const center = start + g.length / 2;
    progress?.style.setProperty('--nx-scroll-fill', `${(g.overflow ? center : 0).toFixed(1)}px`);
    label?.style.setProperty('--nx-scroll-at', `${center.toFixed(1)}px`);
    if (markers) {
      for (const m of markers) {
        const i = this.opts.sections.findIndex((s) => s.id === m.dataset.section);
        const at = this.markerAt[i];
        const near = at === undefined || !Number.isFinite(at) ? 0 : Math.max(0, 1 - Math.abs(at - center) / Math.max(24, g.length));
        m.style.setProperty('--nx-near', near.toFixed(3));
      }
    }
  }

  /** Estado discreto: atributos y `onChange` sólo cuando algo cambia. */
  private sync(): void {
    const g = this.geometry();
    const m = this.metrics;
    const next: ScrollState = {
      overflow: g.overflow,
      progress: g.progress,
      active: activeSection(this.offsets.map((o) => (Number.isFinite(o) ? o : Infinity)), m, this.opts.readingLine),
      atStart: m.offset < 1,
      atEnd: m.content - m.viewport - m.offset < 1,
    };
    const prev = this.state;
    this.state = next;
    const root = this.parts.root;
    if (root) {
      root.toggleAttribute('data-nx-overflow', next.overflow);
      root.toggleAttribute('data-nx-at-start', next.atStart);
      root.toggleAttribute('data-nx-at-end', next.atEnd);
    }
    const section = this.opts.sections[next.active];
    const text = section?.label ?? '';
    if (this.parts.label && text !== this.labelText) {
      this.labelText = text;
      this.parts.label.textContent = text;
    }
    const pct = next.overflow ? `${Math.round(next.progress * 100)} %` : '';
    if (this.parts.percent && pct !== this.percentText) {
      this.percentText = pct;
      this.parts.percent.textContent = pct;
    }
    for (const marker of this.parts.markers ?? []) marker.toggleAttribute('data-active', marker.dataset.section === section?.id);
    if (prev.active !== next.active || prev.overflow !== next.overflow || prev.atStart !== next.atStart || prev.atEnd !== next.atEnd) {
      this.opts.onChange?.(next);
    }
  }

  private trackScale(): number {
    const t = this.parts.track;
    if (!t) return 1;
    const r = t.getBoundingClientRect();
    return (this.vertical ? r.height / (t.offsetHeight || 1) : r.width / (t.offsetWidth || 1)) || 1;
  }

  private setOffset(offset: number, smooth = false): void {
    const value = this.rtl ? -offset : offset;
    const behavior: ScrollBehavior = smooth && this.opts.animate() ? 'smooth' : 'auto';
    if (typeof this.viewport.scrollTo === 'function') {
      this.viewport.scrollTo(this.vertical ? { top: value, behavior } : { left: value, behavior });
    } else if (this.vertical) this.viewport.scrollTop = value;
    else this.viewport.scrollLeft = value;
  }

  /** Arrastre del pulgar (coordenada de puntero en px de pantalla). La posición es exacta, sin inercia. */
  beginDrag(client: number): void {
    this.drag = { client, offset: this.readOffset(), scale: this.trackScale() };
    this.parts.root?.setAttribute('data-nx-dragging', '');
    this.wake();
  }

  dragTo(client: number): void {
    const d = this.drag;
    if (!d) return;
    const g = this.geometry();
    const room = this.metrics.track - g.length;
    if (room <= 0) return;
    const delta = ((client - d.client) / d.scale) * (this.rtl ? -1 : 1);
    this.setOffset(Math.min(g.max, Math.max(0, d.offset + (delta * g.max) / room)));
  }

  endDrag(): void {
    this.drag = null;
    this.parts.root?.removeAttribute('data-nx-dragging');
    this.lastEvent = this.now();
    this.wake();
  }

  /** Clic en el riel: centra el pulgar en ese punto (desplazamiento suave si hay movimiento). */
  jumpToTrack(client: number): void {
    const t = this.parts.track;
    if (!t) return;
    const r = t.getBoundingClientRect();
    let local = (this.vertical ? client - r.top : client - r.left) / this.trackScale();
    if (this.rtl) local = this.metrics.track - local;
    const g = this.geometry();
    this.setOffset(offsetForThumb(this.metrics, local - g.length / 2, this.opts.minThumb), true);
  }

  /** Rueda sobre el riel (que está fuera del área): se reenvía al área. */
  wheel(dx: number, dy: number): void {
    this.viewport.scrollBy?.({ left: dx, top: dy });
  }

  /** Lleva una sección al inicio del área. */
  scrollToSection(id: string, { smooth = true, focus = false }: { smooth?: boolean; focus?: boolean } = {}): void {
    const i = this.opts.sections.findIndex((s) => s.id === id);
    const offset = this.offsets[i];
    if (offset === undefined || !Number.isFinite(offset)) return;
    this.setOffset(Math.max(0, offset - 4), smooth);
    if (focus) {
      const el = this.viewport.ownerDocument.getElementById(id);
      if (el) {
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
      }
    }
  }

  /** 0..1 del recorrido total. */
  scrollToProgress(progress: number, smooth = true): void {
    this.setOffset(Math.min(1, Math.max(0, progress)) * this.geometry().max, smooth);
  }

  dispose(): void {
    this.disposed = true;
    this.viewport.removeEventListener('scroll', this.onScroll);
    this.observer?.disconnect();
    if (this.tick) sharedClock().remove(this.tick);
    this.tick = null;
  }
}
