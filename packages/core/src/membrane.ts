/**
 * Membranas: la geometría de las superficies de NexFluidUI.
 *
 * Una membrana es el contorno de un rectángulo de w × h px con esquinas
 * superelípticas (curvatura continua, no arcos de círculo) y bordes que se
 * deforman bajo un campo de influencia: el puntero los atrae (abultamiento
 * gaussiano a lo largo del perímetro, normal hacia fuera) y la presión los
 * aplasta conservando el área.
 *
 * El número de puntos es fijo para cualquier tamaño, así que dos membranas
 * siempre son interpolables (una tarjeta puede convertirse en un panel).
 */
import { mixContours, toSmoothPath, type Point } from './shape.ts';

export interface MembraneOptions {
  /** Radio de esquina en px. Se limita a la mitad del lado menor (cápsula). */
  radius: number;
  /** 0 = arco circular; 1 = superelipse de curvatura continua (n ≈ 5). */
  smoothing?: number;
  /** Puntos por esquina y por lado. Por defecto 6 y 6 (48 en total). */
  cornerPoints?: number;
  edgePoints?: number;
  /** Atracción: posición del foco (px, coordenadas de la membrana) y amplitud en px. */
  attract?: { x: number; y: number; amount: number; width?: number };
  /** Presión: 0–0.08. Ensancha y aplasta conservando el área. */
  press?: number;
}

export const MEMBRANE_POINTS = (opts: Pick<MembraneOptions, 'cornerPoints' | 'edgePoints'> = {}) =>
  4 * ((opts.cornerPoints ?? 6) + (opts.edgePoints ?? 6));

/** Esquina superelíptica: cuarto de curva |x|^n + |y|^n = 1 para t ∈ [0, π/2]. */
function corner(t: number, n: number): [number, number] {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [Math.sign(c) * Math.pow(Math.abs(c), 2 / n), Math.sign(s) * Math.pow(Math.abs(s), 2 / n)];
}

/**
 * Puntos del contorno en sentido horario empezando por el centro del lado
 * superior. Cada punto lleva su normal exterior (para deformar).
 */
export function membraneOutline(w: number, h: number, opts: MembraneOptions): Point[] {
  const cp = opts.cornerPoints ?? 6;
  const ep = opts.edgePoints ?? 6;
  const r = Math.max(0, Math.min(opts.radius, w / 2, h / 2));
  const n = 2 + 3 * Math.min(1, Math.max(0, opts.smoothing ?? 0.6));
  const pts: Point[] = [];
  const normals: Point[] = [];

  // Centros de esquina: superior derecha, inferior derecha, inferior izquierda, superior izquierda.
  const centers: Array<[number, number, number]> = [
    [w - r, r, -Math.PI / 2],
    [w - r, h - r, 0],
    [r, h - r, Math.PI / 2],
    [r, r, Math.PI],
  ];
  // Lados que preceden a cada esquina: superior (desde el centro), derecho, inferior, izquierdo.
  const edges: Array<[Point, Point, Point]> = [
    [[w / 2, 0], [w - r, 0], [0, -1]],
    [[w, r], [w, h - r], [1, 0]],
    [[w - r, h], [r, h], [0, 1]],
    [[0, h - r], [0, r], [-1, 0]],
  ];
  for (let k = 0; k < 4; k++) {
    const [a, b, nrm] = edges[k]!;
    // En el lado superior sólo se recorre la mitad derecha; la izquierda cierra al final.
    const segs = k === 0 ? Math.ceil(ep / 2) : ep;
    for (let i = 0; i < segs; i++) {
      const t = i / segs;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      normals.push(nrm);
    }
    const [cx, cy, start] = centers[k]!;
    for (let i = 0; i < cp; i++) {
      const t = start + ((i + 0.5) / cp) * (Math.PI / 2);
      const [ux, uy] = corner(t, n);
      pts.push([cx + ux * r, cy + uy * r]);
      const len = Math.hypot(ux, uy) || 1;
      normals.push([ux / len, uy / len]);
    }
  }
  // Mitad izquierda del lado superior.
  const rest = ep - Math.ceil(ep / 2);
  for (let i = 0; i < rest; i++) {
    const t = i / Math.max(1, rest);
    pts.push([r + (w / 2 - r) * t, 0]);
    normals.push([0, -1]);
  }

  const { attract, press = 0 } = opts;
  if (attract && attract.amount !== 0) {
    const sigma = attract.width ?? Math.max(24, Math.min(w, h) * 0.6);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      const d2 = (p[0] - attract.x) ** 2 + (p[1] - attract.y) ** 2;
      const k = attract.amount * Math.exp(-d2 / (2 * sigma * sigma));
      p[0] += normals[i]![0] * k;
      p[1] += normals[i]![1] * k;
    }
  }
  if (press !== 0) {
    const sx = 1 + press;
    const sy = 1 / sx;
    for (const p of pts) {
      p[0] = w / 2 + (p[0] - w / 2) * sx;
      p[1] = h / 2 + (p[1] - h / 2) * sy;
    }
  }
  return pts;
}

/** Trazado SVG de una membrana. Tensión baja para que los lados rectos sigan rectos. */
export function membranePath(w: number, h: number, opts: MembraneOptions): string {
  return toSmoothPath(membraneOutline(w, h, opts), { tension: 0.85 });
}

/** Interpolación entre dos membranas (mismo número de puntos): tarjeta → panel. */
export function morphMembranes(a: readonly Point[], b: readonly Point[], t: number): string {
  return toSmoothPath(mixContours(a, b, t), { tension: 0.85 });
}

const f = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
};

/**
 * Gota líquida entre dos posiciones: cápsula de alto `h` de `start` a `end`
 * cuyos bordes largos se estrechan en el centro según `pinch` (0–1). Con
 * pinch 0 es una cápsula; al estirarse se forma un cuello como en un metaball.
 * Horizontal en coordenadas locales; `vertical` intercambia ejes.
 */
export function liquidCapsule(start: number, end: number, h: number, pinch = 0, { vertical = false, offset = 0 } = {}): string {
  const a = Math.min(start, end);
  const b = Math.max(start, end);
  const r = Math.min(h / 2, (b - a) / 2);
  const len = b - a;
  const neck = Math.min(0.85, Math.max(0, pinch)) * (h / 2) * Math.min(1, len / (h * 2.5));
  const top = offset;
  const bottom = offset + h;
  const mid = (a + b) / 2;
  const P = (x: number, y: number) => (vertical ? `${f(y)} ${f(x)}` : `${f(x)} ${f(y)}`);
  const k = 0.5523 * r;
  return [
    `M${P(a + r, top)}`,
    `C${P(a + r + (mid - a - r) * 0.5, top)} ${P(mid - (mid - a - r) * 0.35, top + neck)} ${P(mid, top + neck)}`,
    `C${P(mid + (b - r - mid) * 0.35, top + neck)} ${P(b - r - (b - r - mid) * 0.5, top)} ${P(b - r, top)}`,
    `C${P(b - r + k, top)} ${P(b, top + r - k)} ${P(b, top + r)}`,
    `L${P(b, bottom - r)}`,
    `C${P(b, bottom - r + k)} ${P(b - r + k, bottom)} ${P(b - r, bottom)}`,
    `C${P(b - r - (b - r - mid) * 0.5, bottom)} ${P(mid + (b - r - mid) * 0.35, bottom - neck)} ${P(mid, bottom - neck)}`,
    `C${P(mid - (mid - a - r) * 0.35, bottom - neck)} ${P(a + r + (mid - a - r) * 0.5, bottom)} ${P(a + r, bottom)}`,
    `C${P(a + r - k, bottom)} ${P(a, bottom - r + k)} ${P(a, bottom - r)}`,
    `L${P(a, top + r)}`,
    `C${P(a, top + r - k)} ${P(a + r - k, top)} ${P(a + r, top)}`,
    'Z',
  ].join('');
}
