/**
 * Integridad espacial: el modo de composición que corresponde a un ancho
 * disponible. Se usa con el ancho real del contenedor (ResizeObserver o
 * container queries), nunca sólo con el de la ventana: una demostración
 * incrustada en una columna estrecha es estrecha aunque la ventana sea ancha.
 *
 * - `expanded`: composición completa (varias columnas, regiones laterales visibles).
 * - `compact`: menos columnas; las regiones secundarias pasan a riel, pestañas u hoja.
 * - `constrained`: una columna principal; lo secundario se abre en paneles alternativos.
 */
export type NexSpace = 'expanded' | 'compact' | 'constrained';

export const SPACES: readonly NexSpace[] = ['expanded', 'compact', 'constrained'];

export interface SpaceThresholds {
  /** Por debajo de este ancho (px), `compact`. */
  compactBelow: number;
  /** Por debajo de este ancho (px), `constrained`. */
  constrainedBelow: number;
}

export const DEFAULT_SPACE_THRESHOLDS: SpaceThresholds = { compactBelow: 880, constrainedBelow: 560 };

export function resolveSpace(width: number, { compactBelow, constrainedBelow }: SpaceThresholds = DEFAULT_SPACE_THRESHOLDS): NexSpace {
  if (!(width > 0)) return 'expanded';
  if (width < constrainedBelow) return 'constrained';
  if (width < compactBelow) return 'compact';
  return 'expanded';
}

export interface ColumnFit {
  /** Ancho total disponible (px). */
  available: number;
  /** Anchos fijos de las columnas laterales en orden de prescindibilidad (la primera se pliega antes). */
  sides: readonly number[];
  /** Separación entre columnas (px). */
  gap: number;
  /** Ancho mínimo útil de la columna principal (px). */
  mainMin: number;
}

/**
 * Cuántas columnas laterales caben sin bajar la principal de `mainMin`.
 * Devuelve el número de laterales que deben plegarse, empezando por la primera.
 */
export function columnsToFold({ available, sides, gap, mainMin }: ColumnFit): number {
  for (let folded = 0; folded <= sides.length; folded++) {
    const kept = sides.slice(folded);
    const used = kept.reduce((sum, w) => sum + w + gap, 0);
    if (available - used >= mainMin) return folded;
  }
  return sides.length;
}
