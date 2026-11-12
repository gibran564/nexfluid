/**
 * NexGrid: composición en cuadrícula, como DATO serializable y aritmética pura.
 *
 * Un diseño de cuadrícula (`NexGridLayout`) es JSON: columnas, separación por
 * token y elementos con su ancho y alto en celdas. No guarda elementos de
 * React ni CSS libre, así que una aplicación puede persistirlo, validarlo en
 * el servidor o recibirlo de una fuente no confiable y normalizarlo aquí.
 *
 * Las medidas (rectángulos) las toma el adaptador; aquí sólo se decide: dónde
 * cae un elemento arrastrado en dos dimensiones, a qué índice lleva una flecha
 * y cuánto crece o encoge un elemento con el teclado.
 */

export type NexGridGap = 'none' | 'compact' | 'medium' | 'comfortable';
export const NEX_GRID_GAPS: readonly NexGridGap[] = ['none', 'compact', 'medium', 'comfortable'];

export const NEX_GRID_LIMITS = {
  minColumns: 1,
  maxColumns: 12,
  maxRowSpan: 6,
  maxItems: 48,
  /** Cuadrículas dentro de cuadrículas: más allá de este nivel se apilan. */
  maxDepth: 2,
} as const;

export interface NexGridItemLayout {
  /** Identidad estable del elemento (la misma que su clave). */
  id: string;
  /** Columnas que ocupa en el ancho completo. */
  span: number;
  /** Filas que ocupa. Por defecto 1. */
  rowSpan?: number;
  /** Columnas en espacio `compact` (contenedor estrecho). Por defecto, todas. */
  spanCompact?: number;
}

export interface NexGridLayout {
  version: 1;
  columns: number;
  gap: NexGridGap;
  items: NexGridItemLayout[];
}

const ID = /^[A-Za-z][\w-]{0,63}$/;
const int = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function clampColumns(columns: unknown): number {
  return clamp(int(columns, NEX_GRID_LIMITS.maxColumns), NEX_GRID_LIMITS.minColumns, NEX_GRID_LIMITS.maxColumns);
}

export function clampSpan(span: unknown, columns: number): number {
  return clamp(int(span, columns), 1, columns);
}

/**
 * Normaliza un diseño de procedencia desconocida: columnas y anchos acotados,
 * ids válidos y únicos, separación de la lista cerrada, como mucho
 * `maxItems`. Nunca inventa elementos. `null` si no es un objeto.
 */
export function normalizeGridLayout(input: unknown): { layout: NexGridLayout; corrections: string[] } | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const corrections: string[] = [];
  const columns = clampColumns(raw.columns);
  if (raw.columns !== columns) corrections.push(`columns → ${columns}`);
  const gap = NEX_GRID_GAPS.includes(raw.gap as NexGridGap) ? (raw.gap as NexGridGap) : 'medium';
  if (raw.gap !== gap) corrections.push(`gap → ${gap}`);
  const seen = new Set<string>();
  const items: NexGridItemLayout[] = [];
  for (const [index, entry] of (Array.isArray(raw.items) ? raw.items : []).entries()) {
    if (items.length >= NEX_GRID_LIMITS.maxItems) { corrections.push('demasiados elementos'); break; }
    if (!entry || typeof entry !== 'object') { corrections.push(`item ${index}: descartado`); continue; }
    const item = entry as Record<string, unknown>;
    if (typeof item.id !== 'string' || !ID.test(item.id) || seen.has(item.id)) { corrections.push(`item ${index}: id inválido o repetido`); continue; }
    seen.add(item.id);
    const span = clampSpan(item.span, columns);
    const rowSpan = clamp(int(item.rowSpan, 1), 1, NEX_GRID_LIMITS.maxRowSpan);
    const normalized: NexGridItemLayout = { id: item.id, span };
    if (rowSpan !== 1) normalized.rowSpan = rowSpan;
    if (item.spanCompact !== undefined) normalized.spanCompact = clampSpan(item.spanCompact, columns);
    if (item.span !== span) corrections.push(`item ${item.id}: span → ${span}`);
    items.push(normalized);
  }
  return { layout: { version: 1, columns, gap, items }, corrections };
}

/** Filas visuales de un flujo de elementos (colocación automática, sin huecos). */
export function gridRowsOf(spans: readonly number[], columns: number): number[][] {
  const rows: number[][] = [];
  let row: number[] = [];
  let used = 0;
  spans.forEach((raw, index) => {
    const span = clampSpan(raw, columns);
    if (used + span > columns && row.length > 0) { rows.push(row); row = []; used = 0; }
    row.push(index);
    used += span;
  });
  if (row.length > 0) rows.push(row);
  return rows;
}

/**
 * Destino de una flecha desde el elemento `index`:
 * ←/→ un puesto en orden de lectura; ↑/↓ el elemento de la fila anterior o
 * siguiente más cercano en columna; Inicio/Fin los extremos. `null` si no mueve.
 */
export function gridKeyboardMove(key: string, index: number, spans: readonly number[], columns: number): number | null {
  const total = spans.length;
  if (index < 0 || index >= total) return null;
  let target: number | null = null;
  if (key === 'ArrowLeft') target = index - 1;
  else if (key === 'ArrowRight') target = index + 1;
  else if (key === 'Home') target = 0;
  else if (key === 'End') target = total - 1;
  else if (key === 'ArrowUp' || key === 'ArrowDown') {
    const rows = gridRowsOf(spans, columns);
    const r = rows.findIndex((row) => row.includes(index));
    const next = rows[r + (key === 'ArrowUp' ? -1 : 1)];
    if (!next) return null;
    const startOf = (row: number[], i: number) => row.slice(0, row.indexOf(i)).reduce((sum, j) => sum + clampSpan(spans[j], columns), 0);
    const center = startOf(rows[r]!, index) + clampSpan(spans[index], columns) / 2;
    let best = next[0]!;
    let distance = Infinity;
    for (const candidate of next) {
      const c = startOf(next, candidate) + clampSpan(spans[candidate], columns) / 2;
      if (Math.abs(c - center) < distance) { distance = Math.abs(c - center); best = candidate; }
    }
    target = best;
  }
  if (target === null || target < 0 || target >= total || target === index) return null;
  return target;
}

/**
 * Nuevo ancho con el teclado: Mayús+←/→ encoge o crece una columna (dentro de
 * 1..columns). `null` si la tecla no redimensiona o no cambia nada.
 */
export function gridResizeStep(key: string, span: number, columns: number): number | null {
  const current = clampSpan(span, columns);
  const next = key === 'ArrowLeft' ? current - 1 : key === 'ArrowRight' ? current + 1 : null;
  if (next === null || next < 1 || next > columns) return null;
  return next;
}

export interface GridRect { left: number; top: number; width: number; height: number }

/**
 * Dónde cae un elemento arrastrado en una cuadrícula: cuántos de los DEMÁS
 * elementos quedan antes del puntero en orden de lectura. Un elemento está
 * «antes» si su fila termina por encima del puntero, o si está en la misma
 * franja vertical y su centro queda a la izquierda. `rects` excluye el
 * elemento arrastrado y va en orden de documento.
 */
export function gridReorderSlot(rects: readonly GridRect[], pointer: { x: number; y: number }): number {
  let slot = 0;
  for (const rect of rects) {
    const sameBand = pointer.y >= rect.top && pointer.y <= rect.top + rect.height;
    const above = rect.top + rect.height < pointer.y;
    if (above || (sameBand && rect.left + rect.width / 2 < pointer.x)) slot++;
  }
  return slot;
}

/** Valor CSS de la separación de un token (los mismos `--nx-space-*` del sistema). */
export function gridGapValue(gap: NexGridGap): string {
  switch (gap) {
    case 'none': return '0px';
    case 'compact': return 'var(--nx-space-3, 12px)';
    case 'comfortable': return 'var(--nx-space-7, 32px)';
    default: return 'var(--nx-space-5, 20px)';
  }
}
