/**
 * Un eje de la rejilla (filas o columnas) con tamaño por defecto y
 * excepciones. Es lo que necesita la virtualización: posición de un índice,
 * índice en una posición y el tramo visible, en O(log n) sin recorrer el eje.
 */
export interface Axis {
  readonly count: number;
  readonly total: number;
  /** Inicio (px) del elemento `index`. */
  offsetOf(index: number): number;
  sizeOf(index: number): number;
  /** Índice del elemento que contiene la posición `offset` (px). */
  indexAt(offset: number): number;
  /** Tramo [start, end] que cubre [offset, offset + length], con margen. */
  visible(offset: number, length: number, overscan?: number): { start: number; end: number };
}

export function createAxis(count: number, defaultSize: number, overrides: Readonly<Record<number, number>> = {}): Axis {
  // Excepciones ordenadas con su desviación acumulada respecto del tamaño por defecto.
  const keys = Object.keys(overrides).map(Number).filter((i) => i >= 0 && i < count).sort((a, b) => a - b);
  const extra: number[] = []; // extra[k] = suma de desviaciones de keys[0..k-1]
  let acc = 0;
  for (const k of keys) {
    extra.push(acc);
    acc += overrides[k]! - defaultSize;
  }
  const total = count * defaultSize + acc;
  /** Número de excepciones con índice < i. */
  const before = (i: number) => {
    let lo = 0, hi = keys.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (keys[mid]! < i) lo = mid + 1; else hi = mid; }
    return lo;
  };
  const sizeOf = (i: number) => overrides[i] ?? defaultSize;
  const offsetOf = (i: number) => {
    const clamped = Math.max(0, Math.min(count, i));
    const n = before(clamped);
    return clamped * defaultSize + (n ? extra[n - 1]! + overrides[keys[n - 1]!]! - defaultSize : 0);
  };
  const indexAt = (offset: number) => {
    if (count === 0) return 0;
    if (offset <= 0) return 0;
    if (offset >= total) return count - 1;
    let lo = 0, hi = count - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offsetOf(mid) <= offset) lo = mid; else hi = mid - 1;
    }
    return lo;
  };
  return {
    count,
    total,
    offsetOf,
    sizeOf,
    indexAt,
    visible(offset, length, overscan = 2) {
      if (count === 0) return { start: 0, end: -1 };
      const start = Math.max(0, indexAt(offset) - overscan);
      const end = Math.min(count - 1, indexAt(offset + Math.max(0, length)) + overscan);
      return { start, end };
    },
  };
}
