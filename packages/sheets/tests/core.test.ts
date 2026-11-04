import { describe, expect, it } from 'vitest';
import {
  addSheet, cellKey, createAxis, createHistory, createWorkbook, edgeOf, evaluateSheet, fillRange, fillTarget, moveSelection, parseWorkbook,
  pasteGrid, rangeOf, rangeToText, removeSheet, renameSheet, selectionAt, selectionRange, serializeWorkbook, setCellInput, sheetFromRows,
  shiftFormula, stepInside, toCsv, sheetValueRows, updateSheet, WorkbookRejected, activeSheet, csvToSheet, type SheetData,
} from '@nexfluid/sheets';

const grid = (rows: Array<Array<string | number>>): SheetData => ({ ...sheetFromRows('t', rows, { rows: 20, columns: 8 }) });
const input = (s: SheetData, r: number, c: number) => s.cells[cellKey(r, c)]?.input;

describe('libro', () => {
  it('añade, renombra sin duplicar y quita hojas conservando una activa', () => {
    let wb = createWorkbook();
    wb = addSheet(wb);
    expect(wb.sheets.map((s) => s.name)).toEqual(['Hoja 1', 'Hoja 2']);
    expect(wb.active).toBe(wb.sheets[1]!.id);
    wb = renameSheet(wb, wb.sheets[1]!.id, 'Hoja 1');
    expect(wb.sheets[1]!.name).toBe('Hoja 1 (2)');
    const second = wb.sheets[1]!.id;
    wb = removeSheet(wb, second);
    expect(wb.sheets).toHaveLength(1);
    expect(wb.active).toBe(wb.sheets[0]!.id);
    expect(removeSheet(wb, wb.sheets[0]!.id)).toBe(wb); // nunca la última
  });

  it('las operaciones son inmutables y comparten lo que no cambia', () => {
    const wb = addSheet(createWorkbook(), sheetFromRows('Datos', [[1, 2]]), { activate: false });
    const next = updateSheet(wb, wb.sheets[0]!.id, (s) => setCellInput(s, { row: 0, column: 0 }, '5'));
    expect(next).not.toBe(wb);
    expect(next.sheets[1]).toBe(wb.sheets[1]);
    expect(input(next.sheets[0]!, 0, 0)).toBe('5');
    expect(wb.sheets[0]!.cells).toEqual({});
  });

  it('JSON: ida y vuelta, y rechaza celdas fuera de la rejilla', () => {
    const wb = createWorkbook([sheetFromRows('Ventas', [['Mes', 'Total'], ['Ene', 120]])]);
    expect(parseWorkbook(serializeWorkbook(wb))).toEqual(wb);
    const bad = JSON.parse(serializeWorkbook(wb));
    bad.sheets[0].cells['99:0'] = { input: 'x' };
    expect(() => parseWorkbook(JSON.stringify(bad))).toThrow(WorkbookRejected);
    expect(() => parseWorkbook('{')).toThrow(WorkbookRejected);
  });
});

describe('historial', () => {
  it('deshace y rehace instantáneas; un cambio nuevo borra el futuro', () => {
    const h = createHistory();
    const a = createWorkbook([sheetFromRows('A', [[1]])]);
    const b = updateSheet(a, a.active, (s) => setCellInput(s, { row: 0, column: 0 }, '2'));
    h.record(a, 'Editar A1');
    const back = h.undo(b)!;
    expect(back.workbook).toBe(a);
    expect(back.label).toBe('Editar A1');
    expect(h.redo(a)!.workbook).toBe(b);
    h.undo(b);
    h.record(a, 'Otro');
    expect(h.canRedo).toBe(false);
  });
  it('respeta el tope de pasos', () => {
    const h = createHistory(3);
    const wb = createWorkbook();
    for (let i = 0; i < 10; i++) h.record(wb, `p${i}`);
    expect(h.size).toBe(3);
  });
});

describe('selección y teclado', () => {
  const sheet = grid([[1, 2, 3], [4, '', 6], ['', '', 9]]);
  it('mueve, extiende con Mayús y salta al borde de los datos', () => {
    let sel = selectionAt(0, 0);
    sel = moveSelection(sel, sheet, 0, 1, { extend: true });
    sel = moveSelection(sel, sheet, 1, 0, { extend: true });
    expect(selectionRange(sel)).toEqual(rangeOf({ row: 0, column: 0 }, { row: 1, column: 1 }));
    expect(sel.active).toEqual({ row: 0, column: 0 });
    expect(edgeOf(sheet, { row: 0, column: 0 }, 0, 1)).toEqual({ row: 0, column: 2 });
    expect(edgeOf(sheet, { row: 0, column: 1 }, 1, 0)).toEqual({ row: 19, column: 1 }); // B2 vacía → hasta el final
    expect(moveSelection(selectionAt(0, 0), sheet, -1, -1)).toEqual(selectionAt(0, 0)); // no sale de la hoja
  });
  it('Intro y Tab recorren el rango sin perderlo', () => {
    let sel = { anchor: { row: 0, column: 0 }, extent: { row: 1, column: 1 }, active: { row: 0, column: 0 } };
    sel = stepInside(sel, sheet, 'next-column');
    expect(sel.active).toEqual({ row: 0, column: 1 });
    sel = stepInside(sel, sheet, 'next-column');
    expect(sel.active).toEqual({ row: 1, column: 0 });
    sel = stepInside(sel, sheet, 'next-row');
    expect(sel.active).toEqual({ row: 0, column: 1 });
    expect(selectionRange(sel)).toEqual(rangeOf({ row: 0, column: 0 }, { row: 1, column: 1 }));
  });
});

describe('portapapeles (TSV)', () => {
  it('copia lo escrito y pega una rejilla, creciendo la hoja', () => {
    const s = grid([[1, '=A1*2']]);
    expect(rangeToText(s, rangeOf({ row: 0, column: 0 }, { row: 0, column: 1 }))).toBe('1\t=A1*2');
    const pasted = pasteGrid({ ...s, rows: 2, columns: 2 }, { row: 1, column: 1 }, [['a', 'b'], ['c', 'd']]);
    expect(pasted.sheet.rows).toBe(3);
    expect(pasted.sheet.columns).toBe(3);
    expect(input(pasted.sheet, 2, 2)).toBe('d');
  });
});

describe('autollenado', () => {
  it('desplaza referencias relativas y respeta las absolutas y el texto', () => {
    expect(shiftFormula('=A1+$B$1+B$2+$C3', 2, 1)).toBe('=B3+$B$1+C$2+$C5');
    expect(shiftFormula('=SUMA(A1:A3)&"A1"', 1, 0)).toBe('=SUMA(A2:A4)&"A1"');
    expect(shiftFormula('=LOG10(A1)', 1, 0)).toBe('=LOG10(A2)');
    expect(shiftFormula('=A1', -1, 0)).toBe('=#REF!');
  });
  it('series aritméticas, texto numerado y fórmulas hacia abajo', () => {
    const s = grid([[1, 'Semana 1', '=A1*10'], [3]]);
    const down = fillRange(s, rangeOf({ row: 0, column: 0 }, { row: 1, column: 0 }), rangeOf({ row: 0, column: 0 }, { row: 4, column: 0 }));
    expect([2, 3, 4].map((r) => input(down, r, 0))).toEqual(['5', '7', '9']);
    const text = fillRange(s, rangeOf({ row: 0, column: 1 }, { row: 0, column: 1 }), rangeOf({ row: 0, column: 1 }, { row: 2, column: 1 }));
    expect(input(text, 2, 1)).toBe('Semana 3');
    const f = fillRange(s, rangeOf({ row: 0, column: 2 }, { row: 0, column: 2 }), rangeOf({ row: 0, column: 2 }, { row: 2, column: 2 }));
    expect(input(f, 2, 2)).toBe('=A3*10');
    expect(evaluateSheet(f).get(cellKey(1, 2))).toBe(30);
  });
  it('hacia la derecha las fórmulas se desplazan por columnas; un patrón no numérico se repite', () => {
    const s = grid([['=A2', 'x', 'y']]);
    const right = fillRange(s, rangeOf({ row: 0, column: 0 }, { row: 0, column: 0 }), rangeOf({ row: 0, column: 0 }, { row: 0, column: 2 }));
    expect(input(right, 0, 2)).toBe('=C2');
    const rep = fillRange(s, rangeOf({ row: 0, column: 1 }, { row: 0, column: 2 }), rangeOf({ row: 0, column: 1 }, { row: 0, column: 5 }));
    expect([3, 4, 5].map((c) => input(rep, 0, c))).toEqual(['x', 'y', 'x']);
  });
  it('el destino se extiende por el eje con más recorrido', () => {
    const src = rangeOf({ row: 0, column: 0 }, { row: 1, column: 0 });
    expect(fillTarget(src, { row: 6, column: 1 })).toEqual(rangeOf({ row: 0, column: 0 }, { row: 6, column: 0 }));
    expect(fillTarget(src, { row: 1, column: 4 })).toEqual(rangeOf({ row: 0, column: 0 }, { row: 1, column: 4 }));
  });
});

describe('eje virtual', () => {
  it('posición e índice son inversos, con tamaños distintos', () => {
    const axis = createAxis(1000, 30, { 3: 100, 10: 10 });
    expect(axis.total).toBe(1000 * 30 + 70 - 20);
    expect(axis.offsetOf(4)).toBe(30 * 3 + 100);
    expect(axis.offsetOf(11)).toBe(11 * 30 + 70 - 20);
    for (const i of [0, 3, 4, 10, 11, 999]) expect(axis.indexAt(axis.offsetOf(i) + 1)).toBe(i);
    expect(axis.visible(0, 90, 0)).toEqual({ start: 0, end: 3 });
  });
});

describe('CSV de ida y vuelta', () => {
  it('exporta los VALORES calculados y protege del CSV con fórmulas', () => {
    const s = grid([['Total', '=2+3'], ['=1', '@x']]);
    const out = toCsv(sheetValueRows(s));
    expect(out).toContain('Total,5');
    expect(out).toContain("'@x");
    const back = csvToSheet(out);
    expect(back.sheet.cells[cellKey(0, 1)]?.input).toBe('5');
  });
  it('el libro activo se resuelve aunque el id no exista', () => {
    const wb = createWorkbook();
    expect(activeSheet({ ...wb, active: 'nope' })).toBe(wb.sheets[0]);
  });
});
