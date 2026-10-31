/**
 * @nexfluid/sheets — NexSheets Core.
 *
 * Modelo de hojas de cálculo sin framework ni estilos: libros, celdas,
 * rangos, selección, historial, fórmulas, autollenado, CSV/TSV/JSON y ejes
 * para virtualizar. El motor de fórmulas, las direcciones, las ediciones y el
 * CSV proceden del editor de hojas de NexBook (Nextudio).
 *
 * Fórmulas: intérprete propio y cerrado (sin eval). Aritmética, comparaciones,
 * texto con `&`, referencias y rangos de UNA hoja y las funciones de
 * `FORMULA_NAMES` (en español e inglés). No hay referencias entre hojas,
 * matrices, fechas ni compatibilidad completa con Excel.
 */
export type { SheetCell, SheetData, Sheet, Workbook } from './types.ts';
export { DEFAULT_SHEET_LIMITS } from './limits.ts';
export type { SheetLimits } from './limits.ts';
export { cellKey, parseCellKey, columnName, columnIndex, parseReference, formatReference, parseRange, emptySheet, rawCell } from './cells.ts';
export type { CellAddress } from './cells.ts';
export { evaluateSheet, evaluateCell, literal, formatValue, isFormula, isFormulaError, FORMULA_NAMES } from './formula.ts';
export type { CellValue, FormulaError } from './formula.ts';
export {
  rangeOf, rangeContains, rangeSize, rangeLabel, setCellInput, resizeSheet, clearRange, rangeToText, parseClipboardGrid, pasteGrid,
  rangeStats, sheetFormulas, quickFormula,
} from './edit.ts';
export type { CellRange, RangeStats, FormulaEntry } from './edit.ts';
export { CsvRejected, detectDelimiter, parseCsvRows, csvToSheet, sheetValueRows, toCsv } from './csv.ts';
export type { CsvParseOptions, CsvImportResult } from './csv.ts';
export {
  sheetId, createSheet, createWorkbook, sheetFromRows, activeSheet, getSheet, updateSheet, setActiveSheet, uniqueSheetName, addSheet,
  renameSheet, removeSheet, columnWidth, setColumnWidth, validateWorkbook,
} from './workbook.ts';
export { createHistory } from './history.ts';
export type { History, HistoryEntry } from './history.ts';
export { selectionAt, selectionRange, clampAddress, clampSelection, edgeOf, moveSelection, stepInside, selectAll } from './selection.ts';
export type { Selection, MoveOptions } from './selection.ts';
export { shiftFormula, fillDirection, fillTarget, fillRange } from './fill.ts';
export { createAxis } from './axis.ts';
export type { Axis } from './axis.ts';
export { serializeWorkbook, parseWorkbook, WorkbookRejected } from './json.ts';
