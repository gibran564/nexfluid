/**
 * Libro: varias hojas con nombre. Operaciones puras (devuelven un libro
 * nuevo y comparten lo que no cambia), aptas para el historial y para React.
 */
import { cellKey } from './cells.ts';
import { DEFAULT_SHEET_LIMITS, type SheetLimits } from './limits.ts';
import type { Sheet, SheetData, Workbook } from './types.ts';

let counter = 0;
/** id estable y legible; sin depender de crypto (también en Node y en tests). */
export function sheetId(): string {
  counter += 1;
  return `sheet-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export function createSheet(name: string, data: Partial<SheetData> = {}, id = sheetId()): Sheet {
  return { id, name, rows: data.rows ?? 100, columns: data.columns ?? 26, cells: data.cells ?? {}, ...(data.headers ? { headers: data.headers } : {}) };
}

export function createWorkbook(sheets: Sheet[] = [createSheet('Hoja 1')]): Workbook {
  if (!sheets.length) throw new Error('Un libro necesita al menos una hoja.');
  return { version: 1, sheets, active: sheets[0]!.id };
}

/**
 * Crea una hoja a partir de filas de valores (`[['Mes', 'Ventas'], ['Ene', 120]]`).
 * Los números se guardan como su texto: el motor los lee como números al evaluar.
 */
export function sheetFromRows(name: string, rows: ReadonlyArray<ReadonlyArray<string | number | boolean | null>>, size: { rows?: number; columns?: number } = {}): Sheet {
  const cells: SheetData['cells'] = {};
  let width = 0;
  rows.forEach((line, r) => {
    width = Math.max(width, line.length);
    line.forEach((value, c) => {
      if (value === null || value === '') return;
      cells[cellKey(r, c)] = { input: typeof value === 'boolean' ? (value ? 'VERDADERO' : 'FALSO') : String(value) };
    });
  });
  return createSheet(name, { rows: Math.max(size.rows ?? 0, rows.length, 1), columns: Math.max(size.columns ?? 0, width, 1), cells });
}

export function activeSheet(workbook: Workbook): Sheet {
  return workbook.sheets.find((s) => s.id === workbook.active) ?? workbook.sheets[0]!;
}

export function getSheet(workbook: Workbook, id: string): Sheet | undefined {
  return workbook.sheets.find((s) => s.id === id);
}

/** Sustituye los datos de una hoja (conserva id, nombre y presentación). */
export function updateSheet(workbook: Workbook, id: string, update: (sheet: Sheet) => SheetData | Sheet): Workbook {
  let changed = false;
  const sheets = workbook.sheets.map((s) => {
    if (s.id !== id) return s;
    const next = update(s);
    if (next === s) return s;
    changed = true;
    return { ...s, ...next, id: s.id, name: (next as Sheet).name ?? s.name };
  });
  return changed ? { ...workbook, sheets } : workbook;
}

export function setActiveSheet(workbook: Workbook, id: string): Workbook {
  return workbook.active === id || !getSheet(workbook, id) ? workbook : { ...workbook, active: id };
}

/** Un nombre que no choca con otra hoja: «Hoja 2», «Hoja 2 (2)»… */
export function uniqueSheetName(workbook: Workbook, wanted: string): string {
  const names = new Set(workbook.sheets.map((s) => s.name.toLowerCase()));
  if (!names.has(wanted.toLowerCase())) return wanted;
  for (let i = 2; ; i++) {
    const candidate = `${wanted} (${i})`;
    if (!names.has(candidate.toLowerCase())) return candidate;
  }
}

export function addSheet(workbook: Workbook, sheet: Sheet = createSheet(`Hoja ${workbook.sheets.length + 1}`), { activate = true } = {}): Workbook {
  const named = { ...sheet, name: uniqueSheetName(workbook, sheet.name) };
  return { ...workbook, sheets: [...workbook.sheets, named], active: activate ? named.id : workbook.active };
}

export function renameSheet(workbook: Workbook, id: string, name: string): Workbook {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return workbook;
  const others = { ...workbook, sheets: workbook.sheets.filter((s) => s.id !== id) };
  return updateSheet(workbook, id, (s) => ({ ...s, name: uniqueSheetName(others, trimmed) }));
}

/** Quita una hoja (nunca la última). La activa pasa a la vecina. */
export function removeSheet(workbook: Workbook, id: string): Workbook {
  if (workbook.sheets.length <= 1) return workbook;
  const index = workbook.sheets.findIndex((s) => s.id === id);
  if (index < 0) return workbook;
  const sheets = workbook.sheets.filter((s) => s.id !== id);
  const active = workbook.active === id ? sheets[Math.min(index, sheets.length - 1)]!.id : workbook.active;
  return { ...workbook, sheets, active };
}

/** Ancho de una columna (px). */
export function columnWidth(sheet: Sheet, column: number, fallback = 112): number {
  return sheet.columnWidths?.[column] ?? fallback;
}

export function setColumnWidth(workbook: Workbook, id: string, column: number, width: number, { min = 40, max = 640 } = {}): Workbook {
  const w = Math.round(Math.min(max, Math.max(min, width)));
  return updateSheet(workbook, id, (s) => ({ ...s, columnWidths: { ...s.columnWidths, [column]: w } }));
}

/** Comprueba que un libro respeta el contrato (lo usa la deserialización). */
export function validateWorkbook(workbook: Workbook, limits: SheetLimits = DEFAULT_SHEET_LIMITS): string[] {
  const problems: string[] = [];
  if (workbook.version !== 1) problems.push(`versión desconocida: ${String(workbook.version)}`);
  if (!Array.isArray(workbook.sheets) || !workbook.sheets.length) problems.push('el libro no tiene hojas');
  const ids = new Set<string>();
  for (const s of workbook.sheets ?? []) {
    if (ids.has(s.id)) problems.push(`id repetido: ${s.id}`);
    ids.add(s.id);
    if (!(s.rows >= 1 && s.rows <= limits.maxRows) || !(s.columns >= 1 && s.columns <= limits.maxColumns)) problems.push(`${s.name}: tamaño fuera de los límites`);
    const keys = Object.keys(s.cells ?? {});
    if (keys.length > limits.maxCells) problems.push(`${s.name}: demasiadas celdas`);
    for (const key of keys) {
      const [r, c] = key.split(':').map(Number);
      if (!Number.isInteger(r) || !Number.isInteger(c) || r! < 0 || c! < 0 || r! >= s.rows || c! >= s.columns) {
        problems.push(`${s.name}: celda fuera de la rejilla (${key})`);
        break;
      }
      if (typeof s.cells[key]?.input !== 'string') {
        problems.push(`${s.name}: celda sin texto (${key})`);
        break;
      }
    }
  }
  if (workbook.sheets?.length && !ids.has(workbook.active)) problems.push('la hoja activa no existe');
  return problems;
}
