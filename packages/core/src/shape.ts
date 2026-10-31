/**
 * Geometría orgánica.
 *
 * Un contorno es una lista de N puntos muestreados por ángulo alrededor de un
 * centro. Mantener N fijo hace que dos contornos cualesquiera sean
 * interpolables punto a punto (la base de FluidMorph) y que el coste de
 * dibujar sea constante.
 *
 * Pipeline: base (círculo, elipse, superelipse) → armónicos ambientales →
 * deformaciones de interacción (abultamiento, aplastamiento) → conservación
 * del área → trazado Bézier suave.
 */

export type Point = [number, number];

export type BaseGeometry =
  | { kind: 'circle' }
  | { kind: 'ellipse'; aspect: number }
  /** |x|^n + |y|^n = 1. n = 2 círculo; n ≈ 4 «squircle»; n → ∞ rectángulo. */
  | { kind: 'superellipse'; exponent: number; aspect?: number };

/** Radio de la geometría base en el ángulo θ, para radio nominal 1. */
export function baseRadius(base: BaseGeometry, theta: number): number {
  if (base.kind === 'circle') return 1;
  const aspect = base.aspect ?? 1;
  const n = base.kind === 'ellipse' ? 2 : Math.max(0.5, base.exponent);
  const c = Math.abs(Math.cos(theta));
  const s = Math.abs(Math.sin(theta));
  // Semiejes a = aspect, b = 1 (aspect > 1 ensancha).
  return Math.pow(Math.pow(c / aspect, n) + Math.pow(s, n), -1 / n);
}

/** Generador pseudoaleatorio determinista (mulberry32). Misma semilla, misma forma. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Harmonic {
  order: number;
  weight: number;
  phase: number;
  /** Velocidad angular relativa; valores inconmensurables evitan bucles visibles. */
  rate: number;
}

/**
 * Armónicos de baja frecuencia (órdenes 2–5) con pesos decrecientes. Es lo que
 * da el aspecto de lámpara de lava: lóbulos amplios y lentos, nunca ruido fino.
 */
export function makeHarmonics(seed: number, count = 4): Harmonic[] {
  const rand = seededRandom(seed);
  const out: Harmonic[] = [];
  for (let i = 0; i < count; i++) {
    const order = i + 2;
    out.push({
      order,
      weight: (0.6 + 0.4 * rand()) / order,
      phase: rand() * Math.PI * 2,
      rate: (0.55 + 0.9 * rand()) * (rand() < 0.5 ? -1 : 1),
    });
  }
  const total = out.reduce((sum, h) => sum + h.weight, 0);
  for (const h of out) h.weight /= total;
  return out;
}

/** Desplazamiento radial normalizado en [-1, 1] para θ y tiempo de fase t (ciclos). */
export function harmonicOffset(harmonics: readonly Harmonic[], theta: number, t: number): number {
  let sum = 0;
  for (const h of harmonics) sum += h.weight * Math.sin(h.order * theta + h.phase + Math.PI * 2 * h.rate * t);
  return sum;
}

export interface Deformation {
  /** Abultamiento hacia un ángulo: tensión superficial atraída por el puntero. */
  bulge?: { angle: number; amount: number; width?: number };
  /** Aplastamiento a lo largo de un eje, conservando el área (presión). */
  squash?: { angle: number; amount: number };
}

export interface ContourOptions {
  points: number;
  base: BaseGeometry;
  harmonics?: readonly Harmonic[];
  /** Amplitud ambiental como fracción del radio. */
  ambient?: number;
  /** Tiempo de fase en ciclos (tiempo × velocidad). */
  phase?: number;
  deformation?: Deformation;
  /** Si es true, se reescala para conservar el área de la base. */
  preserveArea?: boolean;
}

/** Diferencia angular con signo en (-π, π]. */
function angleDelta(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

export function sampleContour(opts: ContourOptions): Point[] {
  const { points: n, base, harmonics = [], ambient = 0, phase = 0, deformation = {} } = opts;
  const pts: Point[] = [];
  const baseline: Point[] = [];
  for (let i = 0; i < n; i++) {
    const theta = (i / n) * Math.PI * 2;
    const r0 = baseRadius(base, theta);
    let r = r0 * (1 + ambient * harmonicOffset(harmonics, theta, phase));
    const bulge = deformation.bulge;
    if (bulge && bulge.amount !== 0) {
      const w = bulge.width ?? 0.9;
      const d = angleDelta(theta, bulge.angle);
      r *= 1 + bulge.amount * Math.exp(-(d * d) / (2 * w * w));
    }
    pts.push([Math.cos(theta) * r, Math.sin(theta) * r]);
    if (opts.preserveArea) baseline.push([Math.cos(theta) * r0, Math.sin(theta) * r0]);
  }
  const squash = deformation.squash;
  if (squash && squash.amount !== 0) {
    // Escala (1 + a) en el eje y 1 / (1 + a) en el perpendicular: área idéntica.
    const sx = 1 + squash.amount;
    const sy = 1 / sx;
    const c = Math.cos(squash.angle);
    const s = Math.sin(squash.angle);
    for (const p of pts) {
      const u = p[0] * c + p[1] * s;
      const v = -p[0] * s + p[1] * c;
      p[0] = u * sx * c - v * sy * s;
      p[1] = u * sx * s + v * sy * c;
    }
  }
  if (opts.preserveArea) {
    const k = Math.sqrt(polygonArea(baseline) / polygonArea(pts));
    for (const p of pts) {
      p[0] *= k;
      p[1] *= k;
    }
  }
  return pts;
}

/** Área (positiva) del polígono por la fórmula del cordón. */
export function polygonArea(pts: readonly Point[]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[(i + 1) % pts.length]!;
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

/** Interpolación punto a punto entre contornos con el mismo número de puntos. */
export function mixContours(a: readonly Point[], b: readonly Point[], t: number): Point[] {
  if (a.length !== b.length) throw new RangeError(`Contornos incompatibles: ${a.length} y ${b.length} puntos`);
  return a.map(([x, y], i) => {
    const [bx, by] = b[i]!;
    return [x + (bx - x) * t, y + (by - y) * t];
  });
}

const fmt = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
};

/**
 * Curva cerrada que pasa por todos los puntos (Catmull‑Rom uniforme → Bézier
 * cúbica). `tension` 1 = Catmull‑Rom clásico; menos tensa, contornos más
 * tirantes. Precisión de 0.01 unidades: cadenas estables para pruebas visuales.
 */
export function toSmoothPath(pts: readonly Point[], { scale = 1, cx = 0, cy = 0, tension = 1 } = {}): string {
  const n = pts.length;
  if (n < 3) throw new RangeError('Un contorno necesita al menos 3 puntos');
  const P = (i: number): Point => {
    const [x, y] = pts[((i % n) + n) % n]!;
    return [cx + x * scale, cy + y * scale];
  };
  const k = tension / 6;
  const [sx, sy] = P(0);
  let d = `M${fmt(sx)} ${fmt(sy)}`;
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1);
    const p1 = P(i);
    const p2 = P(i + 1);
    const p3 = P(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) * k;
    const c1y = p1[1] + (p2[1] - p0[1]) * k;
    const c2x = p2[0] - (p3[0] - p1[0]) * k;
    const c2y = p2[1] - (p3[1] - p1[1]) * k;
    d += `C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return `${d}Z`;
}
