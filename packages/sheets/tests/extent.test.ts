import { describe, expect, it } from 'vitest';
import { DEFAULT_SHEET_EXTENT, DEFAULT_SHEET_LIMITS, viewExtent, withExtent, type SheetData } from '@nexfluid/sheets';

/** Extensión visible: vista, no datos (ver `extent.ts`). */
describe('viewExtent', () => {
  const tiny = { rows: 1, columns: 1 };

  it('una hoja vacía se ve como 26 columnas × 100 filas', () => {
    expect(DEFAULT_SHEET_EXTENT).toEqual({ rows: 100, columns: 26 });
    expect(viewExtent(tiny)).toEqual({ rows: 100, columns: 26 });
  });

  it('nunca es menor que los datos', () => {
    expect(viewExtent({ rows: 5000, columns: 40 })).toEqual({ rows: 5000, columns: 40 });
  });

  it('crece al acercarse al borde, con margen para seguir', () => {
    expect(viewExtent(tiny, { row: 50, column: 5 })).toEqual({ rows: 100, columns: 26 });
    expect(viewExtent(tiny, { row: 92, column: 0 }).rows).toBe(143);
    expect(viewExtent(tiny, { row: 0, column: 24 }).columns).toBe(35);
  });

  it('respeta los topes de la aplicación (NexBook: 200 × 40)', () => {
    const limits = { ...DEFAULT_SHEET_LIMITS, maxRows: 200, maxColumns: 40 };
    expect(viewExtent(tiny, { row: 199, column: 39 }, DEFAULT_SHEET_EXTENT, limits)).toEqual({ rows: 200, columns: 40 });
    expect(viewExtent(tiny, null, { rows: 500, columns: 100 }, limits)).toEqual({ rows: 200, columns: 40 });
  });
});

describe('withExtent', () => {
  const sheet: SheetData = { rows: 2, columns: 2, cells: { '0:0': { input: 'a' } } };
  it('amplía sin tocar las celdas y nunca encoge', () => {
    const grown = withExtent(sheet, { rows: 100, columns: 26 });
    expect(grown).toMatchObject({ rows: 100, columns: 26, cells: sheet.cells });
    expect(withExtent(grown, { rows: 10, columns: 10 })).toBe(grown);
  });
  it('devuelve la misma hoja si no cambia (las evaluaciones en caché se conservan)', () => {
    expect(withExtent(sheet, { rows: 1, columns: 1 })).toBe(sheet);
  });
});
