import type { CellAddress } from './cells.ts';
import { DEFAULT_SHEET_LIMITS, type SheetLimits } from './limits.ts';
import type { SheetData } from './types.ts';

/**
 * Extensión VISIBLE de una hoja: la rejilla que se puede recorrer y editar,
 * distinta del rango con datos.
 *
 * Un CSV nuevo o vacío tiene 1 × 1 de datos, pero una hoja de cálculo se usa
 * como cualquier otra: columnas A, B, C…, filas numeradas, flechas que llegan
 * más allá de lo escrito y una rejilla que crece sola al acercarse al borde,
 * sin botones de «Añadir fila». La rejilla es virtual (sólo se pinta lo
 * visible), así que ampliarla no cuesta celdas: `cells` sigue guardando sólo
 * las que tienen contenido, y `sheetValueRows` / `toCsv` exportan sólo el
 * rango usado, sin filas vacías de relleno.
 */
export interface SheetExtent {
  rows: number;
  columns: number;
}

/** Lo que se ve al abrir una hoja vacía (26 columnas, A–Z; 100 filas). */
export const DEFAULT_SHEET_EXTENT: SheetExtent = { rows: 100, columns: 26 };

/** A cuántas filas/columnas del borde empieza a crecer, y cuánto crece. */
const MARGIN: SheetExtent = { rows: 10, columns: 3 };
const GROWTH: SheetExtent = { rows: 50, columns: 10 };

/**
 * La extensión para `sheet` con el foco en `focus` (la celda activa o el
 * extremo de la selección): nunca menor que los datos ni que `minimum`, con
 * margen para seguir avanzando, y nunca por encima de `limits`.
 */
export function viewExtent(
  sheet: Pick<SheetData, 'rows' | 'columns'>,
  focus: CellAddress | null = null,
  minimum: SheetExtent = DEFAULT_SHEET_EXTENT,
  limits: SheetLimits = DEFAULT_SHEET_LIMITS
): SheetExtent {
  let rows = Math.max(sheet.rows, minimum.rows, 1);
  let columns = Math.max(sheet.columns, minimum.columns, 1);
  if (focus) {
    if (focus.row >= rows - MARGIN.rows) rows = focus.row + 1 + GROWTH.rows;
    if (focus.column >= columns - MARGIN.columns) columns = focus.column + 1 + GROWTH.columns;
  }
  return {
    rows: Math.max(sheet.rows, Math.min(rows, limits.maxRows)),
    columns: Math.max(sheet.columns, Math.min(columns, limits.maxColumns)),
  };
}

/** La misma hoja con esa extensión (nunca encoge ni toca las celdas). Devuelve `sheet` si no cambia. */
export function withExtent<T extends SheetData>(sheet: T, extent: SheetExtent): T {
  const rows = Math.max(sheet.rows, extent.rows);
  const columns = Math.max(sheet.columns, extent.columns);
  return rows === sheet.rows && columns === sheet.columns ? sheet : { ...sheet, rows, columns };
}
