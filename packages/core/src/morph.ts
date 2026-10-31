/**
 * NexMorph: transformación continua de materia.
 *
 * Una transformación lleva una superficie de una geometría a otra (tarjeta →
 * panel, botón → superficie de acción, control del dock → panel) sin
 * fundidos ni capturas: la misma membrana cambia de posición, tamaño y
 * contorno, y el contenido se coreografía aparte.
 *
 * Se separa en canales con física propia, todos resortes analíticos de
 * `FluidValue` (exactos para cualquier dt):
 *
 * * `position`  el centro de la superficie: lidera.
 * * `size`      ancho y alto: siguen con viscosidad (la materia arrastra).
 * * `contour`   radio y familia del contorno: llegan los últimos.
 * * `content`   el contenido entrante: sólo empieza cuando la superficie ya
 *               ocupa más del 60 % del camino; al cerrar sale primero y la
 *               superficie no se mueve hasta que casi ha salido.
 *
 * El contenido saliente (el de la tarjeta) se deriva de `size`. No hay DOM
 * aquí: los extremos se piden con funciones en cada fotograma, así que si el
 * origen se mueve (scroll, otro layout) el regreso va a su posición actual.
 */
import { FluidValue, dampingRatio, type SpringParams } from './spring.ts';
import { sharedClock, type FluidClock, type Tick } from './clock.ts';
import { polygonArea, toSmoothPath, type Point } from './shape.ts';
import { membraneOutline } from './membrane.ts';

// ─── Física ──────────────────────────────────────────────────────────────

export interface MorphPhysics {
  mass: number;
  stiffness: number;
  damping: number;
  /** τ (s) del filtro viscoso de `size`; `contour` usa 1.6 τ. 0 = la superficie no arrastra. */
  viscosity: number;
  /** Tensión superficial 0–1: resiste la deformación por velocidad y redondea el contorno. */
  tension: number;
  /** Estiramiento máximo por velocidad, en fracción (0.1 = 10 %). Conserva el área. */
  deformation: number;
  /** Umbral de reposo, en unidades de progreso (0.002 = 0.2 % del recorrido). */
  settle: number;
}

/**
 * Familias medidas (las cifras de `morphTiming` están en las pruebas):
 * micro 150–300 ms (precision, flow), mayores 300–550 ms (viscous, morph, spatial).
 */
export const MORPH_PHYSICS = {
  precision: { mass: 1, stiffness: 900, damping: 54, viscosity: 0, tension: 0.9, deformation: 0.02, settle: 0.004 },
  flow: { mass: 1, stiffness: 520, damping: 38, viscosity: 0.018, tension: 0.6, deformation: 0.06, settle: 0.003 },
  viscous: { mass: 1, stiffness: 240, damping: 30, viscosity: 0.05, tension: 0.5, deformation: 0.08, settle: 0.003 },
  morph: { mass: 1, stiffness: 280, damping: 25, viscosity: 0.035, tension: 0.35, deformation: 0.12, settle: 0.003 },
  spatial: { mass: 1.2, stiffness: 260, damping: 37, viscosity: 0.03, tension: 0.7, deformation: 0.04, settle: 0.003 },
} as const satisfies Record<string, MorphPhysics>;

export type MorphPhysicsName = keyof typeof MORPH_PHYSICS;

export interface MorphPhysicsOverrides extends Partial<MorphPhysics> {
  /** Sobrepaso deseado (0–0.3) en un salto unitario. Si se da, sustituye a `damping`. */
  overshoot?: number;
}

/** Amortiguación que da el sobrepaso pedido: ζ = −ln(os) / √(π² + ln²(os)). */
export function dampingForOvershoot(overshoot: number, stiffness: number, mass: number): number {
  if (overshoot <= 0) return 2 * Math.sqrt(stiffness * mass);
  const l = Math.log(Math.min(0.95, overshoot));
  const zeta = -l / Math.sqrt(Math.PI * Math.PI + l * l);
  return 2 * zeta * Math.sqrt(stiffness * mass);
}

/** Sobrepaso analítico de un resorte subamortiguado (0 si ζ ≥ 1). */
export function overshootOf(p: Pick<MorphPhysics, 'mass' | 'stiffness' | 'damping'>): number {
  const z = dampingRatio(p);
  return z >= 1 ? 0 : Math.exp((-z * Math.PI) / Math.sqrt(1 - z * z));
}

export function isMorphPhysicsName(v: unknown): v is MorphPhysicsName {
  return typeof v === 'string' && Object.hasOwn(MORPH_PHYSICS, v);
}

/** Familia o parámetros + ajustes → parámetros concretos. Nunca muta la familia. */
export function resolveMorphPhysics(base: MorphPhysicsName | MorphPhysics, overrides: MorphPhysicsOverrides = {}): MorphPhysics {
  const { overshoot, ...rest } = overrides;
  const p: MorphPhysics = { ...(typeof base === 'string' ? MORPH_PHYSICS[base] : base), ...rest };
  if (overshoot !== undefined) p.damping = dampingForOvershoot(overshoot, p.stiffness, p.mass);
  p.mass = Math.max(0.05, p.mass);
  p.stiffness = Math.max(1, p.stiffness);
  p.damping = Math.max(0, p.damping);
  p.tension = Math.min(1, Math.max(0, p.tension));
  p.settle = Math.max(1e-4, p.settle);
  return p;
}

// ─── Canales ─────────────────────────────────────────────────────────────

export type MorphTarget = 0 | 1;

interface Channels {
  position: FluidValue;
  size: FluidValue;
  contour: FluidValue;
  content: FluidValue;
}

/** Umbrales de la coreografía (fracción de `size` / `content`). */
const CONTENT_GATE = 0.6;
const SURFACE_GATE = 0.35;

function springOf(p: MorphPhysics): SpringParams {
  return { mass: p.mass, stiffness: p.stiffness, damping: p.damping };
}

function configure(ch: Channels, p: MorphPhysics): void {
  const s = springOf(p);
  ch.position.params = s;
  ch.position.viscosity = 0;
  ch.size.params = s;
  ch.size.viscosity = p.viscosity;
  ch.contour.params = s;
  ch.contour.viscosity = p.viscosity * 1.6;
  // El contenido es rápido y sin sobrepaso (es opacidad y desplazamiento corto).
  const k = p.stiffness * 2.2;
  ch.content.params = { mass: 1, stiffness: k, damping: 2 * Math.sqrt(k) };
  ch.content.viscosity = 0;
}

function makeChannels(p: MorphPhysics, at: number): Channels {
  const s = springOf(p);
  const ch = { position: new FluidValue(at, s), size: new FluidValue(at, s), contour: new FluidValue(at, s), content: new FluidValue(at, s) };
  configure(ch, p);
  return ch;
}

/** Fija los objetivos según las compuertas de la coreografía. */
function gate(ch: Channels, target: MorphTarget): void {
  if (target === 1) {
    ch.position.set(1);
    ch.size.set(1);
    ch.contour.set(1);
    ch.content.set(ch.size.value >= CONTENT_GATE ? 1 : 0);
  } else {
    ch.content.set(0);
    if (ch.content.value <= SURFACE_GATE) {
      ch.position.set(0);
      ch.size.set(0);
      ch.contour.set(0);
    }
  }
}

function stepChannels(ch: Channels, target: MorphTarget, dt: number): void {
  gate(ch, target);
  ch.position.step(dt);
  ch.size.step(dt);
  ch.contour.step(dt);
  ch.content.step(dt);
  gate(ch, target);
}

function atRest(ch: Channels, target: MorphTarget, eps: number): boolean {
  return [ch.position, ch.size, ch.contour, ch.content].every((v) => v.target === target && v.atRest(eps));
}

export interface MorphSample {
  t: number;
  position: number;
  size: number;
  contour: number;
  content: number;
}

export interface MorphTimeline {
  samples: MorphSample[];
  /** Hasta el reposo (umbral `settle`), en s. */
  duration: number;
  /** Hasta que la superficie (posición y tamaño) queda dentro del 2 % para siempre, en s. */
  surface: number;
  /** Duración percibida: hasta que todos los canales (también el contenido) quedan dentro del 2 %, en s. */
  visual: number;
  /** Mayor valor de `size` (1.04 = 4 % de sobrepaso). */
  peak: number;
}

/** Simula la transformación de reposo a reposo. Determinista; base del scrubber y de las mediciones. */
export function morphTimeline(physics: MorphPhysics, target: MorphTarget = 1, { dt = 1 / 240, horizon = 3 } = {}): MorphTimeline {
  const ch = makeChannels(physics, target === 1 ? 0 : 1);
  const samples: MorphSample[] = [{ t: 0, position: ch.position.value, size: ch.size.value, contour: ch.contour.value, content: ch.content.value }];
  let peak = target === 1 ? 0 : 1;
  let surface = 0;
  let visual = 0;
  let t = 0;
  while (t < horizon) {
    t += dt;
    stepChannels(ch, target, dt);
    samples.push({ t, position: ch.position.value, size: ch.size.value, contour: ch.contour.value, content: ch.content.value });
    peak = target === 1 ? Math.max(peak, ch.size.value) : Math.min(peak, ch.size.value);
    if (Math.abs(ch.position.value - target) > 0.02 || Math.abs(ch.size.value - target) > 0.02) surface = t;
    if (surface === t || Math.abs(ch.contour.value - target) > 0.02 || Math.abs(ch.content.value - target) > 0.02) visual = t;
    if (atRest(ch, target, physics.settle)) break;
  }
  return { samples, duration: t, surface, visual, peak };
}

/** Duraciones medidas de una física (s): superficie, total y sobrepaso. */
export function morphTiming(physics: MorphPhysics): { surface: number; visual: number; total: number; overshoot: number } {
  const tl = morphTimeline(physics, 1);
  return { surface: tl.surface, visual: tl.visual, total: tl.duration, overshoot: Math.max(0, tl.peak - 1) };
}

// ─── Geometría de un fotograma ───────────────────────────────────────────

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MorphEndpoint {
  rect: Rect;
  /** Radio de esquina en px. */
  radius: number;
}

export type MorphState = 'closed' | 'opening' | 'open' | 'closing';

export interface MorphFrame {
  state: MorphState;
  /** Canales (pueden pasar ligeramente de 0–1 con sobrepaso). */
  position: number;
  size: number;
  contour: number;
  /** Contenido entrante y saliente, 0–1. */
  incoming: number;
  outgoing: number;
  rect: Rect;
  radius: number;
  /** Velocidad del centro, px/s. */
  velocity: Point;
  from: MorphEndpoint;
  to: MorphEndpoint;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Caja intermedia: el centro sigue a `position` y el tamaño a `size`, así la
 * superficie se expande desde donde estaba (no desde su esquina).
 */
export function morphRect(from: Rect, to: Rect, position: number, size: number): Rect {
  const cx = lerp(from.x + from.width / 2, to.x + to.width / 2, position);
  const cy = lerp(from.y + from.height / 2, to.y + to.height / 2, position);
  const width = Math.max(1, lerp(from.width, to.width, size));
  const height = Math.max(1, lerp(from.height, to.height, size));
  return { x: cx - width / 2, y: cy - height / 2, width, height };
}

/**
 * Contorno deformado por la velocidad: se estira en la dirección del
 * movimiento y se estrecha en la perpendicular (determinante 1), el borde que
 * avanza se adelanta y el que queda atrás resiste; después se reescala para
 * conservar el área exacta del contorno en reposo. La tensión superficial
 * reduce la deformación.
 */
export function deformContour(points: readonly Point[], velocity: Point, { deformation = 0.08, tension = 0.5, reference = 1800 } = {}): Point[] {
  const speed = Math.hypot(velocity[0], velocity[1]);
  const amount = deformation * Math.tanh(speed / reference) * (1 - 0.7 * tension);
  if (amount < 1e-4) return points.map(([x, y]) => [x, y]);
  const ux = velocity[0] / speed;
  const uy = velocity[1] / speed;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of points) { cx += x; cy += y; }
  cx /= points.length;
  cy /= points.length;
  let half = 1;
  for (const [x, y] of points) half = Math.max(half, Math.abs((x - cx) * ux + (y - cy) * uy));
  const s = 1 + amount;
  const out: Point[] = points.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const along = dx * ux + dy * uy;
    const px = dx - along * ux;
    const py = dy - along * uy;
    const n = along / half;
    // Asimetría: el borde delantero se adelanta (n > 0) y el trasero se recoge (n < 0).
    const a = along * s + amount * 0.3 * half * n * n;
    return [cx + ux * a + px / s, cy + uy * a + py / s];
  });
  const k = Math.sqrt(polygonArea(points) / Math.max(1e-9, polygonArea(out)));
  return out.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
}

export interface MorphPathOptions {
  smoothing?: number;
  deformation?: number;
  tension?: number;
}

/** Trazado SVG del fotograma en las coordenadas de su caja (o desplazado con `origin`). */
export function morphPath(frame: Pick<MorphFrame, 'rect' | 'radius' | 'velocity'>, { smoothing = 0.9, deformation = 0.08, tension = 0.5 }: MorphPathOptions = {}, origin: Point = [0, 0]): string {
  const { rect } = frame;
  const base = membraneOutline(rect.width, rect.height, { radius: frame.radius, smoothing });
  const shaped = deformContour(base, frame.velocity, { deformation, tension });
  const ox = rect.x - origin[0];
  const oy = rect.y - origin[1];
  return toSmoothPath(shaped.map(([x, y]) => [x + ox, y + oy]), { tension: 0.85 });
}

// ─── Correspondencia de contornos ────────────────────────────────────────

/** Remuestrea un contorno cerrado a `n` puntos equidistantes por longitud de arco. */
export function resampleContour(points: readonly Point[], n: number): Point[] {
  if (points.length < 2 || n < 3) throw new RangeError('Se necesitan al menos 2 puntos de entrada y 3 de salida');
  const lengths = [0];
  for (let i = 1; i <= points.length; i++) {
    const [x0, y0] = points[i - 1]!;
    const [x1, y1] = points[i % points.length]!;
    lengths.push(lengths[i - 1]! + Math.hypot(x1 - x0, y1 - y0));
  }
  const total = lengths[points.length]!;
  const out: Point[] = [];
  let seg = 0;
  for (let k = 0; k < n; k++) {
    const d = (k / n) * total;
    while (seg < points.length - 1 && lengths[seg + 1]! < d) seg++;
    const span = lengths[seg + 1]! - lengths[seg]! || 1;
    const t = (d - lengths[seg]!) / span;
    const [x0, y0] = points[seg]!;
    const [x1, y1] = points[(seg + 1) % points.length]!;
    out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
  }
  return out;
}

/**
 * Correspondencia de puntos: rota (y si conviene invierte) `b` para que cada
 * punto quede frente a su pareja en `a` con la menor distancia total. Evita
 * que la interpolación «retuerza» la forma.
 */
export function alignContours(a: readonly Point[], b: readonly Point[]): Point[] {
  if (a.length !== b.length) throw new RangeError(`Contornos incompatibles: ${a.length} y ${b.length} puntos`);
  const n = a.length;
  let best: Point[] = [...b];
  let bestCost = Infinity;
  for (const candidate of [b, [...b].reverse()]) {
    for (let shift = 0; shift < n; shift++) {
      let cost = 0;
      for (let i = 0; i < n && cost < bestCost; i++) {
        const [ax, ay] = a[i]!;
        const [bx, by] = candidate[(i + shift) % n]!;
        cost += (ax - bx) ** 2 + (ay - by) ** 2;
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = candidate.map((_, i) => candidate[(i + shift) % n]!);
      }
    }
  }
  return best.map(([x, y]) => [x, y]);
}

export interface Circle {
  x: number;
  y: number;
  r: number;
}

/**
 * Puente metaball entre dos círculos: el cuello de materia que une un control
 * con la superficie que sale de él. `null` si están demasiado lejos o uno
 * contiene al otro. `spread` (0–1) abre los puntos de unión; `handle` alarga
 * las tangentes.
 */
export function metaballPath(c1: Circle, c2: Circle, { spread = 0.5, handle = 2.4, maxDistance = Infinity } = {}): string | null {
  const d = Math.hypot(c2.x - c1.x, c2.y - c1.y);
  if (d > maxDistance || d <= Math.abs(c1.r - c2.r) || c1.r <= 0 || c2.r <= 0) return null;
  let u1 = 0;
  let u2 = 0;
  if (d < c1.r + c2.r) {
    u1 = Math.acos((c1.r * c1.r + d * d - c2.r * c2.r) / (2 * c1.r * d));
    u2 = Math.acos((c2.r * c2.r + d * d - c1.r * c1.r) / (2 * c2.r * d));
  }
  const angle = Math.atan2(c2.y - c1.y, c2.x - c1.x);
  const max = Math.acos((c1.r - c2.r) / d);
  const a1 = angle + u1 + (max - u1) * spread;
  const a2 = angle - u1 - (max - u1) * spread;
  const a3 = angle + Math.PI - u2 - (Math.PI - u2 - max) * spread;
  const a4 = angle - Math.PI + u2 + (Math.PI - u2 - max) * spread;
  const P = (c: Circle, a: number): Point => [c.x + c.r * Math.cos(a), c.y + c.r * Math.sin(a)];
  const p1 = P(c1, a1);
  const p2 = P(c1, a2);
  const p3 = P(c2, a3);
  const p4 = P(c2, a4);
  const total = c1.r + c2.r;
  const k = Math.min(spread * handle, Math.hypot(p1[0] - p3[0], p1[1] - p3[1]) / total) * Math.min(1, (d * 2) / total);
  const h1 = c1.r * k;
  const h2 = c2.r * k;
  const T = (p: Point, a: number, len: number): Point => [p[0] + len * Math.cos(a), p[1] + len * Math.sin(a)];
  const q1 = T(p1, a1 - Math.PI / 2, h1);
  const q2 = T(p2, a2 + Math.PI / 2, h1);
  const q3 = T(p3, a3 + Math.PI / 2, h2);
  const q4 = T(p4, a4 - Math.PI / 2, h2);
  const f = (p: Point) => `${Math.round(p[0] * 100) / 100} ${Math.round(p[1] * 100) / 100}`;
  const large = (d > c1.r ? 1 : 0);
  return `M${f(p1)}C${f(q1)} ${f(q3)} ${f(p3)}A${c2.r} ${c2.r} 0 ${large} 0 ${f(p4)}C${f(q4)} ${f(q2)} ${f(p2)}Z`;
}

// ─── Controlador ─────────────────────────────────────────────────────────

export interface MorphTransitionOptions {
  physics?: MorphPhysicsName | MorphPhysics;
  /** Extremos medidos en cada fotograma (así se sigue al origen si se mueve). */
  from: () => MorphEndpoint;
  to: () => MorphEndpoint;
  onFrame: (frame: MorphFrame) => void;
  /** Reposo alcanzado en un extremo. */
  onRest?: (state: 'open' | 'closed') => void;
  /** Movimiento reducido: los cambios son inmediatos. */
  reduced?: () => boolean;
  clock?: FluidClock;
  /** Estado inicial. */
  open?: boolean;
}

/**
 * Transformación interrumpible y reversible: `open()` y `close()` reorientan
 * los canales desde su valor y velocidad actuales (nunca saltan); `pause()`,
 * `seek()` y `resume()` sirven a herramientas como NexMorph Studio.
 */
export class MorphTransition {
  private readonly options: MorphTransitionOptions;
  private physicsValue: MorphPhysics;
  private readonly channels: Channels;
  private target: MorphTarget;
  private readonly clock: FluidClock;
  private tick: Tick | null = null;
  private pausedValue = false;
  private timelines: Partial<Record<MorphTarget, MorphTimeline>> = {};

  constructor(options: MorphTransitionOptions) {
    this.options = options;
    this.physicsValue = resolveMorphPhysics(options.physics ?? 'morph');
    this.target = options.open ? 1 : 0;
    this.channels = makeChannels(this.physicsValue, this.target);
    this.clock = options.clock ?? sharedClock();
  }

  get physics(): MorphPhysics {
    return this.physicsValue;
  }

  set physics(p: MorphPhysics) {
    this.physicsValue = resolveMorphPhysics(p);
    configure(this.channels, this.physicsValue);
    this.timelines = {};
  }

  get state(): MorphState {
    const v = this.channels.size.value;
    if (this.target === 1) return this.resting ? 'open' : 'opening';
    return this.resting && v === 0 ? 'closed' : 'closing';
  }

  get isOpen(): boolean {
    return this.target === 1;
  }

  get paused(): boolean {
    return this.pausedValue;
  }

  get running(): boolean {
    return this.tick !== null;
  }

  private get resting(): boolean {
    return atRest(this.channels, this.target, this.physicsValue.settle);
  }

  /** Progreso global 0–1 (el canal de tamaño, que es el que se percibe). */
  get progress(): number {
    return this.channels.size.value;
  }

  open(): void {
    this.go(1);
  }

  close(): void {
    this.go(0);
  }

  toggle(): void {
    this.go(this.target === 1 ? 0 : 1);
  }

  /** Va hacia el objetivo desde el estado visual actual. */
  go(target: MorphTarget): void {
    this.target = target;
    if (this.options.reduced?.()) {
      this.jump(target);
      return;
    }
    gate(this.channels, target);
    if (!this.pausedValue) this.start();
    else this.emit();
  }

  /** Coloca en un extremo sin animar. */
  jump(target: MorphTarget): void {
    this.target = target;
    this.stop();
    for (const v of Object.values(this.channels) as FluidValue[]) v.jump(target);
    this.emit();
    this.options.onRest?.(target === 1 ? 'open' : 'closed');
  }

  pause(): void {
    this.pausedValue = true;
    this.stop();
  }

  resume(): void {
    if (!this.pausedValue) return;
    this.pausedValue = false;
    if (!this.resting) this.start();
  }

  /**
   * Coloca la transformación en la fracción `p` (0–1) de su recorrido percibido
   * hacia el objetivo actual, según la línea de tiempo simulada. Pausa.
   */
  seek(p: number): void {
    this.pause();
    const tl = (this.timelines[this.target] ??= morphTimeline(this.physicsValue, this.target));
    // El recorrido es la duración percibida (+10 %): la cola de asentamiento subpíxel no ocupa el scrubber.
    const span = Math.min(tl.duration, tl.visual * 1.1);
    const i = Math.round((clamp01(p) * span * (tl.samples.length - 1)) / tl.duration);
    const s = tl.samples[i]!;
    this.channels.position.jump(s.position);
    this.channels.size.jump(s.size);
    this.channels.contour.jump(s.contour);
    this.channels.content.jump(s.content);
    // `jump` fija el objetivo al valor: se restaura el destino real.
    gate(this.channels, this.target);
    this.emit();
  }

  /** Línea de tiempo hacia el objetivo actual (scrubber, mediciones). */
  timeline(target: MorphTarget = this.target): MorphTimeline {
    return (this.timelines[target] ??= morphTimeline(this.physicsValue, target));
  }

  /** Fotograma actual (también sirve para volver a pintar tras un cambio de tamaño). */
  frame(): MorphFrame {
    const from = this.options.from();
    const to = this.options.to();
    const { position, size, contour, content } = this.channels;
    const rect = morphRect(from.rect, to.rect, position.value, size.value);
    // Velocidad del centro: canal de posición × distancia (estable aunque el origen se mueva).
    const dx = to.rect.x + to.rect.width / 2 - (from.rect.x + from.rect.width / 2);
    const dy = to.rect.y + to.rect.height / 2 - (from.rect.y + from.rect.height / 2);
    const velocity: Point = [position.velocity * dx, position.velocity * dy];
    return {
      state: this.state,
      position: position.value,
      size: size.value,
      contour: contour.value,
      incoming: clamp01(content.value),
      outgoing: 1 - smooth(0, SURFACE_GATE, size.value),
      rect,
      radius: Math.max(0, lerp(from.radius, to.radius, clamp01(contour.value))),
      velocity,
      from,
      to,
    };
  }

  dispose(): void {
    this.stop();
  }

  private emit(): void {
    this.options.onFrame(this.frame());
  }

  private start(): void {
    if (this.tick) return;
    this.tick = (dt) => {
      stepChannels(this.channels, this.target, dt);
      if (this.resting) {
        for (const v of Object.values(this.channels) as FluidValue[]) v.jump(this.target);
        this.stop();
        this.emit();
        this.options.onRest?.(this.target === 1 ? 'open' : 'closed');
        return;
      }
      this.emit();
    };
    this.clock.add(this.tick);
  }

  private stop(): void {
    if (this.tick) this.clock.remove(this.tick);
    this.tick = null;
  }
}
