/**
 * Autollenado (el «tirador» de la selección): extiende un rango con su patrón.
 *
 * Reglas, en este orden y por cada línea (columna al rellenar en vertical,
 * fila en horizontal):
 *
 * 1. Fórmulas: se copian desplazando sus referencias RELATIVAS (`A1`), no las
 *    absolutas (`$A$1`). Una referencia que saldría de la hoja es `#REF!`.
 * 2. Dos o más números con paso constante: serie aritmética (1, 2 → 3, 4…).
 * 3. Un texto que termina en entero, solo: se incrementa (Semana 1 → Semana 2).
 * 4. Cualquier otra cosa: se repite el patrón.
 *
 * No intenta adivinar fechas, meses ni series geométricas: mejor no rellenar
 * que rellenar mal.
 */
import { cellKey, columnIndex, columnName } from './cells.ts';
import { rangeOf, type CellRange } from './edit.ts';
import { isFormula, literal } from './formula.ts';
import { DEFAULT_SHEET_LIMITS, type SheetLimits } from './limits.ts';
import type { SheetData } from './types.ts';

const REF = /(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})(?![A-Za-z0-9_(])/g;

/** Desplaza las referencias relativas de una fórmula. Fuera de comillas; las funciones no se tocan. */
export function shiftFormula(input: string, dRow: number, dColumn: number): string {
  let out = '';
  let quoted = false;
  let chunk = '';
  const flush = () => {
    out += chunk.replace(REF, (match, colAbs: string, col: string, rowAbs: string, row: string, offset: number, whole: string) => {
      // Parte de un nombre más largo (p. ej. «LOG10», «X1Y»): no es una referencia.
      const prev = whole[offset - 1];
      if (prev && /[A-Za-z0-9_.]/.test(prev)) return match;
      const c = colAbs ? columnIndex(col) : columnIndex(col) + dColumn;
      const r = rowAbs ? Number(row) - 1 : Number(row) - 1 + dRow;
      if (c < 0 || r < 0) return '#REF!';
      return `${colAbs}${columnName(c)}${rowAbs}${r + 1}`;
    });
    chunk = '';
  };
  for (const ch of input) {
    if (ch === '"') {
      if (!quoted) flush(); else { out += chunk; chunk = ''; }
      quoted = !quoted;
      out += ch;
      continue;
    }
    chunk += ch;
  }
  if (quoted) out += chunk; else flush();
  return out;
}

type Direction = 'down' | 'up' | 'right' | 'left';

/** Dirección del relleno: el destino debe extender el origen por un único lado. */
export function fillDirection(source: CellRange, target: CellRange): Direction | null {
  const sameCols = target.from.column === source.from.column && target.to.column === source.to.column;
  const sameRows = target.from.row === source.from.row && target.to.row === source.to.row;
  if (sameCols && target.from.row === source.from.row && target.to.row > source.to.row) return 'down';
  if (sameCols && target.to.row === source.to.row && target.from.row < source.from.row) return 'up';
  if (sameRows && target.from.column === source.from.column && target.to.column > source.to.column) return 'right';
  if (sameRows && target.to.column === source.to.column && target.from.column < source.from.column) return 'left';
  return null;
}

/** El destino de arrastrar el tirador hasta `to`: se extiende por el eje con más recorrido. */
export function fillTarget(source: CellRange, to: { row: number; column: number }): CellRange {
  const below = to.row - source.to.row, above = source.from.row - to.row;
  const right = to.column - source.to.column, left = source.from.column - to.column;
  const vertical = Math.max(below, above), horizontal = Math.max(right, left);
  if (vertical <= 0 && horizontal <= 0) return source;
  if (vertical >= horizontal) {
    return below > 0 ? rangeOf(source.from, { row: to.row, column: source.to.column }) : rangeOf({ row: to.row, column: source.from.column }, source.to);
  }
  return right > 0 ? rangeOf(source.from, { row: source.to.row, column: to.column }) : rangeOf({ row: source.from.row, column: to.column }, source.to);
}

function seriesFor(inputs: readonly string[], count: number, distance: (i: number) => number): (i: number, delta: number) => string {
  const k = inputs.length;
  const values = inputs.map((x) => (isFormula(x) ? null : literal(x)));
  const numeric = values.every((v) => typeof v === 'number') ? (values as number[]) : null;
  if (numeric && k >= 2) {
    const step = (numeric[k - 1]! - numeric[0]!) / (k - 1);
    const linear = numeric.every((v, i) => Math.abs(v - (numeric[0]! + step * i)) < 1e-9);
    if (linear) return (i) => String(Math.round((numeric[0]! + step * distance(i)) * 1e10) / 1e10);
  }
  if (k === 1 && !isFormula(inputs[0]!) && typeof values[0] === 'string') {
    const m = /^(.*?)(\d+)$/.exec(inputs[0]!);
    if (m) return (i) => `${m[1]}${Number(m[2]) + distance(i)}`;
  }
  void count;
  return (i, delta) => {
    const src = inputs[((i % k) + k) % k]!;
    return isFormula(src) ? shiftFormula(src, delta, 0) : src;
  };
}

/**
 * Rellena `target` (que contiene `source` y lo extiende por un lado) y
 * devuelve la hoja nueva. Las celdas del origen no cambian.
 */
export function fillRange(sheet: SheetData, source: CellRange, target: CellRange, limits: SheetLimits = DEFAULT_SHEET_LIMITS): SheetData {
  const direction = fillDirection(source, target);
  if (!direction) return sheet;
  const cells = { ...sheet.cells };
  const vertical = direction === 'down' || direction === 'up';
  const lines = vertical ? [source.from.column, source.to.column] : [source.from.row, source.to.row];
  const along = vertical ? [source.from.row, source.to.row] : [source.from.column, source.to.column];
  const k = along[1]! - along[0]! + 1;
  const forward = direction === 'down' || direction === 'right';
  const extent = vertical ? target.to.row - target.from.row + 1 - k : target.to.column - target.from.column + 1 - k;
  for (let line = lines[0]!; line <= lines[1]!; line++) {
    const inputs = Array.from({ length: k }, (_, i) => {
      const pos = along[0]! + i;
      return sheet.cells[vertical ? cellKey(pos, line) : cellKey(line, pos)]?.input ?? '';
    });
    // Índice de serie: el origen ocupa 0..k-1; hacia delante k, k+1…; hacia atrás -1, -2…
    const next = seriesFor(inputs, extent, (i) => i);
    for (let n = 1; n <= extent; n++) {
      const i = forward ? k - 1 + n : -n;
      const pos = forward ? along[1]! + n : along[0]! - n;
      const sourceIndex = ((i % k) + k) % k;
      const delta = pos - (along[0]! + sourceIndex);
      let value = next(i, delta);
      // En horizontal, el desplazamiento de las fórmulas es por columnas.
      const src = inputs[sourceIndex]!;
      if (!vertical && isFormula(src) && value === shiftFormula(src, delta, 0)) value = shiftFormula(src, 0, delta);
      const key = vertical ? cellKey(pos, line) : cellKey(line, pos);
      if (value.trim()) cells[key] = { input: value.slice(0, limits.maxCellChars) };
      else delete cells[key];
    }
  }
  return { ...sheet, cells };
}
