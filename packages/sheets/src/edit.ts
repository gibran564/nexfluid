/*
 * Ediciones puras de una hoja.
 * Portado del motor de hojas de cálculo de NexBook (Nextudio), sin cambios de
 * comportamiento salvo los límites, que aquí son configurables (`SheetLimits`).
 */
import { DEFAULT_SHEET_LIMITS, type SheetLimits } from './limits.ts';
import type { SheetData } from './types.ts';
import { cellKey, formatReference, type CellAddress } from './cells.ts';
import { isFormula, isFormulaError, type CellValue } from './formula.ts';

/**
 * Las ediciones de una hoja, como funciones puras: reciben la hoja y devuelven
 * otra. Las usan la rejilla, el portapapeles y el historial, así que «pegar un
 * rango» o «vaciar una selección» significan lo mismo en todas partes.
 */

/** Un rectángulo de celdas, ya ordenado: `from` arriba a la izquierda. */
export interface CellRange {
  from: CellAddress;
  to: CellAddress;
}

export function rangeOf(a: CellAddress, b: CellAddress): CellRange {
  return {
    from: { row: Math.min(a.row, b.row), column: Math.min(a.column, b.column) },
    to: { row: Math.max(a.row, b.row), column: Math.max(a.column, b.column) },
  };
}

export function rangeContains(range: CellRange, address: CellAddress): boolean {
  return address.row >= range.from.row && address.row <= range.to.row && address.column >= range.from.column && address.column <= range.to.column;
}

export function rangeSize(range: CellRange): number {
  return (range.to.row - range.from.row + 1) * (range.to.column - range.from.column + 1);
}

/** `B2` o `B2:D5`, como se escribe en una fórmula. */
export function rangeLabel(range: CellRange): string {
  const from = formatReference(range.from);
  return rangeSize(range) === 1 ? from : `${from}:${formatReference(range.to)}`;
}

/** Vaciar una celda la BORRA: una hoja donde se escribió y se borró no pesa más. */
export function setCellInput(sheet: SheetData, address: CellAddress, input: string, limits: SheetLimits = DEFAULT_SHEET_LIMITS): SheetData {
  const key = cellKey(address.row, address.column);
  const cells = { ...sheet.cells };
  if (input.trim()) cells[key] = { input: input.slice(0, limits.maxCellChars) };
  else delete cells[key];
  return { ...sheet, cells };
}

/** Al encoger se borra lo que queda fuera: el esquema rechaza celdas fuera de la rejilla. */
export function resizeSheet(sheet: SheetData, rows: number, columns: number, limits: SheetLimits = DEFAULT_SHEET_LIMITS): SheetData {
  const nextRows = Math.min(Math.max(1, rows), limits.maxRows);
  const nextColumns = Math.min(Math.max(1, columns), limits.maxColumns);
  const cells = Object.fromEntries(
    Object.entries(sheet.cells).filter(([key]) => {
      const [row = '', column = ''] = key.split(':');
      return Number(row) < nextRows && Number(column) < nextColumns;
    })
  );
  return {
    ...sheet,
    rows: nextRows,
    columns: nextColumns,
    cells,
    ...(sheet.headers ? { headers: sheet.headers.slice(0, nextColumns) } : {}),
  };
}

export function clearRange(sheet: SheetData, range: CellRange): SheetData {
  const cells = { ...sheet.cells };
  for (let row = range.from.row; row <= range.to.row; row += 1) {
    for (let column = range.from.column; column <= range.to.column; column += 1) delete cells[cellKey(row, column)];
  }
  return { ...sheet, cells };
}

/** Lo ESCRITO en el rango (fórmulas incluidas), como texto con tabuladores: lo que entiende Excel al pegar. */
export function rangeToText(sheet: SheetData, range: CellRange, display?: (address: CellAddress) => string): string {
  const lines: string[] = [];
  for (let row = range.from.row; row <= range.to.row; row += 1) {
    const fields: string[] = [];
    for (let column = range.from.column; column <= range.to.column; column += 1) {
      const text = display ? display({ row, column }) : sheet.cells[cellKey(row, column)]?.input ?? '';
      fields.push(text.replace(/[\t\r\n]+/g, ' '));
    }
    lines.push(fields.join('\t'));
  }
  return lines.join('\n');
}

/** Texto con tabuladores y saltos de línea → rejilla. Una sola celda sin tabulador no es una rejilla. */
export function parseClipboardGrid(text: string): string[][] | null {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/\n$/, '');
  if (!normalized.includes('\t') && !normalized.includes('\n')) return null;
  return normalized.split('\n').map((line) => line.split('\t'));
}

/**
 * Pega una rejilla con su esquina en `at`. La hoja crece lo necesario, hasta
 * sus topes; lo que no cabe se deja fuera y se dice (`clipped`).
 */
export function pasteGrid(sheet: SheetData, at: CellAddress, grid: readonly (readonly string[])[], limits: SheetLimits = DEFAULT_SHEET_LIMITS): { sheet: SheetData; range: CellRange; clipped: boolean } {
  const height = grid.length;
  const width = Math.max(1, ...grid.map((row) => row.length));
  let rows = Math.min(limits.maxRows, Math.max(sheet.rows, at.row + height));
  const columns = Math.min(limits.maxColumns, Math.max(sheet.columns, at.column + width));
  // El tope de celdas de la rejilla manda sobre las filas.
  rows = Math.max(sheet.rows, Math.min(rows, Math.floor(limits.maxCells / columns)));
  const cells = { ...sheet.cells };
  let clipped = false;
  grid.forEach((line, rowOffset) => {
    for (let columnOffset = 0; columnOffset < width; columnOffset += 1) {
      const row = at.row + rowOffset;
      const column = at.column + columnOffset;
      if (row >= rows || column >= columns) {
        if ((line[columnOffset] ?? '').trim()) clipped = true;
        continue;
      }
      const input = (line[columnOffset] ?? '').slice(0, limits.maxCellChars);
      if (input.trim()) cells[cellKey(row, column)] = { input };
      else delete cells[cellKey(row, column)];
    }
  });
  return {
    sheet: { ...sheet, rows, columns, cells },
    range: { from: at, to: { row: Math.min(rows - 1, at.row + height - 1), column: Math.min(columns - 1, at.column + width - 1) } },
    clipped,
  };
}

export interface RangeStats {
  /** Celdas con algo. */
  count: number;
  /** Celdas con un número. */
  numbers: number;
  sum: number;
  average: number | null;
  min: number | null;
  max: number | null;
}

export function rangeStats(values: ReadonlyMap<string, CellValue>, range: CellRange): RangeStats {
  let count = 0;
  let numbers = 0;
  let sum = 0;
  let min: number | null = null;
  let max: number | null = null;
  for (let row = range.from.row; row <= range.to.row; row += 1) {
    for (let column = range.from.column; column <= range.to.column; column += 1) {
      const value = values.get(cellKey(row, column)) ?? null;
      if (value === null || value === '') continue;
      count += 1;
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      numbers += 1;
      sum += value;
      min = min === null ? value : Math.min(min, value);
      max = max === null ? value : Math.max(max, value);
    }
  }
  return { count, numbers, sum, average: numbers ? sum / numbers : null, min, max };
}

export interface FormulaEntry {
  address: CellAddress;
  reference: string;
  input: string;
  value: CellValue;
  error: boolean;
}

/** Todas las fórmulas de la hoja, en orden de lectura; las que fallan, marcadas. */
export function sheetFormulas(sheet: SheetData, values: ReadonlyMap<string, CellValue>): FormulaEntry[] {
  const entries: FormulaEntry[] = [];
  for (const [key, cell] of Object.entries(sheet.cells)) {
    if (!isFormula(cell.input)) continue;
    const [row = 0, column = 0] = key.split(':').map(Number);
    const value = values.get(key) ?? null;
    entries.push({ address: { row, column }, reference: formatReference({ row, column }), input: cell.input, value, error: isFormulaError(value) });
  }
  return entries.sort((a, b) => a.address.row - b.address.row || a.address.column - b.address.column);
}

/**
 * Dónde y qué escribir para «Suma» (o promedio, contar…) sobre una selección.
 *
 * - Varias celdas: la fórmula va en la primera celda libre DEBAJO del rango
 *   (o a la derecha si es una sola fila), como el autosuma de cualquier hoja.
 * - Una celda: resume los números que tiene justo encima y se escribe en ella.
 */
export function quickFormula(sheet: SheetData, values: ReadonlyMap<string, CellValue>, range: CellRange, name: string, limits: SheetLimits = DEFAULT_SHEET_LIMITS): { at: CellAddress; input: string } | null {
  if (rangeSize(range) > 1) {
    const singleRow = range.from.row === range.to.row;
    const at = singleRow ? { row: range.from.row, column: range.to.column + 1 } : { row: range.to.row + 1, column: range.from.column };
    if (at.row >= limits.maxRows || at.column >= limits.maxColumns) return null;
    const source = singleRow || range.from.column === range.to.column ? range : { from: range.from, to: { row: range.to.row, column: range.from.column } };
    return { at, input: `=${name}(${rangeLabel(source)})` };
  }
  const at = range.from;
  let top = at.row;
  while (top > 0 && typeof values.get(cellKey(top - 1, at.column)) === 'number') top -= 1;
  if (top === at.row) return null;
  return { at, input: `=${name}(${rangeLabel({ from: { row: top, column: at.column }, to: { row: at.row - 1, column: at.column } })})` };
}
