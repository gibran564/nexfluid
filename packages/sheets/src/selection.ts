/**
 * Selección: un rango (de `anchor` a `extent`) y la celda activa, donde se
 * escribe. La activa puede recorrer el rango (Intro/Tab) sin cambiarlo.
 * Movimientos de teclado puros.
 */
import type { CellAddress } from './cells.ts';
import { rangeOf, type CellRange } from './edit.ts';
import type { SheetData } from './types.ts';
import { cellKey } from './cells.ts';

export interface Selection {
  /** Esquina fija del rango (donde empezó la selección). */
  anchor: CellAddress;
  /** Esquina que se mueve al extender (Mayús + flecha, arrastre). */
  extent: CellAddress;
  /** Celda activa: la que se edita y la que muestra la barra de fórmulas. */
  active: CellAddress;
}

export const selectionAt = (row: number, column: number): Selection => ({ anchor: { row, column }, extent: { row, column }, active: { row, column } });

export function selectionRange(selection: Selection): CellRange {
  return rangeOf(selection.anchor, selection.extent);
}

export function clampAddress(address: CellAddress, sheet: Pick<SheetData, 'rows' | 'columns'>): CellAddress {
  return { row: Math.max(0, Math.min(sheet.rows - 1, address.row)), column: Math.max(0, Math.min(sheet.columns - 1, address.column)) };
}

export function clampSelection(selection: Selection, sheet: Pick<SheetData, 'rows' | 'columns'>): Selection {
  return { anchor: clampAddress(selection.anchor, sheet), extent: clampAddress(selection.extent, sheet), active: clampAddress(selection.active, sheet) };
}

const has = (sheet: SheetData, row: number, column: number) => (sheet.cells[cellKey(row, column)]?.input ?? '').trim() !== '';

/**
 * Ctrl/⌘ + flecha: salta al borde del bloque de datos, como cualquier hoja.
 * Desde una celda con datos, al último dato contiguo; si la siguiente está
 * vacía, al siguiente dato; si no hay más, al extremo de la hoja.
 */
export function edgeOf(sheet: SheetData, from: CellAddress, dRow: number, dColumn: number): CellAddress {
  let { row, column } = from;
  const inside = (r: number, c: number) => r >= 0 && c >= 0 && r < sheet.rows && c < sheet.columns;
  const next = () => ({ r: row + dRow, c: column + dColumn });
  let n = next();
  if (!inside(n.r, n.c)) return from;
  if (has(sheet, row, column) && has(sheet, n.r, n.c)) {
    while (inside(n.r, n.c) && has(sheet, n.r, n.c)) { row = n.r; column = n.c; n = next(); }
    return { row, column };
  }
  row = n.r; column = n.c; n = next();
  while (!has(sheet, row, column) && inside(n.r, n.c)) { row = n.r; column = n.c; n = next(); }
  return { row, column };
}

export interface MoveOptions {
  /** Mayús: extiende el rango moviendo su esquina libre (ancla y activa se quedan). */
  extend?: boolean;
  /** Ctrl/⌘: al borde de los datos. */
  jump?: boolean;
}

export function moveSelection(selection: Selection, sheet: SheetData, dRow: number, dColumn: number, { extend = false, jump = false }: MoveOptions = {}): Selection {
  const from = extend ? selection.extent : selection.active;
  const target = clampAddress(jump ? edgeOf(sheet, from, Math.sign(dRow), Math.sign(dColumn)) : { row: from.row + dRow, column: from.column + dColumn }, sheet);
  return extend ? { ...selection, extent: target } : { anchor: target, extent: target, active: target };
}

/**
 * Intro / Tab dentro de un rango seleccionado recorren SUS celdas (sin
 * perder el rango), como en cualquier hoja; con una sola celda, se mueven.
 */
export function stepInside(selection: Selection, sheet: SheetData, direction: 'next-row' | 'prev-row' | 'next-column' | 'prev-column'): Selection {
  const range = selectionRange(selection);
  const single = range.from.row === range.to.row && range.from.column === range.to.column;
  const d = { 'next-row': [1, 0], 'prev-row': [-1, 0], 'next-column': [0, 1], 'prev-column': [0, -1] }[direction] as [number, number];
  if (single) return moveSelection(selection, sheet, d[0], d[1]);
  let { row, column } = selection.active;
  const width = range.to.column - range.from.column + 1;
  const height = range.to.row - range.from.row + 1;
  // Recorre en orden de lectura (por filas para Tab, por columnas para Intro), dando la vuelta.
  if (d[1] !== 0) {
    let i = (row - range.from.row) * width + (column - range.from.column) + d[1];
    i = (i + width * height) % (width * height);
    row = range.from.row + Math.floor(i / width);
    column = range.from.column + (i % width);
  } else {
    let i = (column - range.from.column) * height + (row - range.from.row) + d[0];
    i = (i + width * height) % (width * height);
    column = range.from.column + Math.floor(i / height);
    row = range.from.row + (i % height);
  }
  return { ...selection, active: { row, column } };
}

export function selectAll(sheet: Pick<SheetData, 'rows' | 'columns'>): Selection {
  return { anchor: { row: 0, column: 0 }, extent: { row: sheet.rows - 1, column: sheet.columns - 1 }, active: { row: 0, column: 0 } };
}
