import type { NexConsoleTableOutput } from './types.ts';

/** Presentation recovered from stdout, never runtime type evidence or saved data. */
export interface PrintedStructure {
  start: number;
  end: number;
  kind: 'matrix' | 'vector' | 'table';
  table: NexConsoleTableOutput;
}

const MAX_TEXT = 100_000;
const MAX_CANDIDATE = 16_000;
const MAX_ROWS = 50;
const MAX_COLUMNS = 40;
const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

function cell(text: string): string | number {
  // Preserve large integers rather than rounding them through JavaScript.
  return NUMBER.test(text) && Number.isFinite(Number(text)) && text.replace(/[^0-9]/g, '').length <= 15 ? Number(text) : text;
}

function table(columns: string[], rows: (string | number)[][]): NexConsoleTableOutput {
  return { seq: 0, stream: 'table', columns, rows, totalRows: rows.length };
}

/** A small literal reader: no eval, Python execution, names, calls or objects. */
function arrayLiteral(text: string): (string | number)[][] | (string | number)[] | null {
  let at = 0;
  let cells = 0;
  const space = () => { while (/\s/.test(text[at] ?? '') && at < text.length) at++; };
  const scalar = (): string | number | null => {
    const quote = text[at];
    if (quote === '"' || quote === "'") {
      at++;
      let value = '';
      while (at < text.length && value.length <= 300) {
        const char = text[at++]!;
        if (char === quote) return value;
        if (char === '\n' || char === '\r') return null;
        if (char !== '\\') { value += char; continue; }
        const escape = text[at++] ?? '';
        const simple: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '\\': '\\', "'": "'", '"': '"' };
        if (escape in simple) value += simple[escape];
        else if (escape === 'u' || escape === 'x') {
          const length = escape === 'u' ? 4 : 2;
          const hex = text.slice(at, at + length);
          if (!new RegExp(`^[0-9a-f]{${length}}$`, 'i').test(hex)) return null;
          value += String.fromCharCode(parseInt(hex, 16)); at += length;
        } else return null;
      }
      return null;
    }
    const token = text.slice(at).match(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i)?.[0];
    if (!token || !Number.isFinite(Number(token))) return null;
    at += token.length;
    return cell(token);
  };
  type Values = (string | number | (string | number)[])[];
  const read = (depth: number): Values | null => {
    if (text[at++] !== '[' || depth > 1) return null;
    const values: Values = [];
    space();
    while (at < text.length && text[at] !== ']') {
      let value: string | number | (string | number)[] | null;
      if (text[at] === '[') {
        const nested = read(depth + 1);
        if (!nested || nested.some(Array.isArray)) return null;
        value = nested as (string | number)[];
      } else {
        value = scalar();
        if (++cells > MAX_ROWS * MAX_COLUMNS) return null;
      }
      if (value === null) return null;
      values.push(value);
      const beforeSpace = at;
      space();
      const separated = at > beforeSpace;
      if (text[at] === ',') { at++; space(); }
      else if (text[at] !== ']' && !separated) return null;
    }
    if (text[at++] !== ']') return null;
    return values;
  };
  const values = read(0);
  if (!values || at !== text.length || values.length === 0) return null;
  if (values.every((value) => !Array.isArray(value))) return values.length <= MAX_COLUMNS ? values as (string | number)[] : null;
  if (!values.every(Array.isArray) || values.length > MAX_ROWS) return null;
  const rows = values as (string | number)[][];
  const width = rows[0]!.length;
  return width > 0 && width <= MAX_COLUMNS && rows.every((row) => row.length === width) ? rows : null;
}

/** Find the whole bracket group, including invalid/truncated groups, before parsing. */
function arrayEnd(text: string, start: number): number {
  let depth = 0;
  let quote = '';
  for (let at = start; at < text.length; at++) {
    const char = text[at];
    if (quote) {
      if (char === '\\') at++;
      else if (char === quote) quote = '';
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '[') depth++;
    else if (char === ']' && --depth === 0) return at + 1;
  }
  return text.length;
}

function printedTable(lines: string[], index: number): { count: number; value: NexConsoleTableOutput } | null {
  const header = lines[index]!.trim();
  if (/^precision\s+recall\s+f1-score\s+support$/.test(header)) {
    const rows: (string | number)[][] = [];
    let end = index + 1;
    let summary = false;
    let classes = 0;
    for (let at = index + 1; at < lines.length && at - index <= MAX_ROWS + 8; at++) {
      const line = lines[at]!.trim();
      if (!line) continue;
      const row = line.match(/^(.+?)\s{2,}(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+)$/);
      const accuracy = line.match(/^accuracy\s+(\d+(?:\.\d+)?)\s+(\d+)$/);
      if (row) {
        const label = row[1]!;
        summary ||= label === 'macro avg' || label === 'weighted avg' || label === 'micro avg' || label === 'samples avg';
        if (!summary) classes++;
        if (row.slice(2, 5).some((value) => Number(value) > 1)) return null;
        rows.push([label, ...row.slice(2).map(cell)]);
      } else if (accuracy) {
        if (Number(accuracy[1]) > 1) return null;
        rows.push(['accuracy', '', '', cell(accuracy[1]!), cell(accuracy[2]!)]);
        summary = true;
      } else break;
      end = at + 1;
    }
    if (classes < 1 || !summary || rows.length > MAX_ROWS) return null;
    return { count: end - index, value: table(['Clase', 'precision', 'recall', 'f1-score', 'support'], rows) };
  }
  // Pandas' indexed, aligned representation. Reject wrapped/truncated/ambiguous
  // tables rather than inventing columns from arbitrary logs or CSV.
  const columns = header.split(/\s{2,}/);
  if (columns.length < 2 || columns.length >= MAX_COLUMNS || columns.some((name) => !name || name.length > 100 || /[\[\]{}<>]|\.\.\./.test(name))) return null;
  const rows: (string | number)[][] = [];
  let numeric = false;
  for (let at = index + 1; at < lines.length && rows.length <= MAX_ROWS; at++) {
    const match = lines[at]!.match(/^\s*(\d+)\s+(.+?)\s*$/);
    if (!match) break;
    const values = match[2]!.split(/\s{2,}/);
    if (values.length !== columns.length || values.some((value) => value.length > 300 || value === '...')) return null;
    numeric ||= values.some((value) => NUMBER.test(value));
    rows.push([cell(match[1]!), ...values.map(cell)]);
  }
  if (rows.length < 2 || rows.length > MAX_ROWS || !numeric) return null;
  if (lines[index + rows.length + 1]?.includes('...')) return null;
  return { count: rows.length + 1, value: table(['índice', ...columns], rows) };
}

export function recognizePrintedStructures(text: string): PrintedStructure[] {
  if (text.length > MAX_TEXT || text.includes('\x1b') || text.includes('\r')) return [];
  const structures: PrintedStructure[] = [];
  const lines = text.split('\n');
  let offset = 0;
  for (let index = 0; index < lines.length;) {
    if (structures.length >= 100) break;
    const parsed = printedTable(lines, index);
    if (parsed) {
      const length = lines.slice(index, index + parsed.count).join('\n').length;
      structures.push({ start: offset, end: offset + length, kind: 'table', table: parsed.value });
      offset += length + 1;
      index += parsed.count;
    } else { offset += lines[index]!.length + 1; index++; }
  }
  for (let at = 0; at < text.length; at++) {
    if (structures.length >= 100) break;
    const existing = structures.find((structure) => at >= structure.start && at < structure.end);
    if (existing) { at = existing.end - 1; continue; }
    if (text[at] !== '[') continue;
    const end = arrayEnd(text, at);
    const raw = text.slice(at, end);
    // No subgroups of tensors, malformed arrays, ellipses or oversized arrays.
    const values = raw.length <= MAX_CANDIDATE ? arrayLiteral(raw) : null;
    if (values && !/[\w\]"']/.test(text[at - 1] ?? '') && !/[\w\["']/.test(text[end] ?? '')) {
      const matrix = Array.isArray(values[0]);
      const rows = matrix ? values as (string | number)[][] : [values as (string | number)[]];
      structures.push({ start: at, end, kind: matrix ? 'matrix' : 'vector', table: table(rows[0]!.map((_, column) => String(column)), rows) });
    }
    at = end - 1;
  }
  return structures.sort((a, b) => a.start - b.start);
}
