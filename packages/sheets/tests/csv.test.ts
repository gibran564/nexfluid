import { describe, expect, it } from 'vitest';
import { CsvRejected, cellKey, csvToSheet, detectDelimiter, evaluateSheet, parseCsvRows, DEFAULT_SHEET_LIMITS } from '@eclipsis/sheets';

const NEXBOOK_LIMITS = { maxSheetRows: 200, maxSheetColumns: 40, maxSheetCells: 2_000 };
const LIMITS = { ...DEFAULT_SHEET_LIMITS, maxRows: 200, maxColumns: 40, maxCells: 2_000 };

const importCsv = (text: string, options = {}) => csvToSheet(text, options, LIMITS);

/* Pruebas de importación CSV portadas de NexBook, con sus límites (200 × 40). */

/**
 * Importar datos a una hoja.
 *
 * Dos mitades, como en el importador de `.nexbook`: que un archivo normal se lea
 * bien, y que uno hostil o roto no consiga nada. La segunda es la que justifica
 * que estos parsers estén escritos aquí en vez de delegados a una biblioteca
 * general: lo que no se quiere ejecutar, sencillamente no se abre.
 */

const at = (sheet: { cells: Record<string, { input: string }> }, row: number, column: number) =>
  sheet.cells[cellKey(row, column)]?.input;

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

describe('CSV', () => {
  it('lee encabezados, filas y valores vacíos', () => {
    const result = importCsv('producto,unidades,precio\nTornillo,10,2.5\nTuerca,,1.25\n');

    expect(result.delimiter).toBe(',');
    expect(result.sheet.headers).toEqual(['producto', 'unidades', 'precio']);
    expect(at(result.sheet, 1, 0)).toBe('Tornillo');
    expect(at(result.sheet, 1, 1)).toBe('10');
    // Un valor vacío NO se guarda: una hoja donde se borró no pesa más.
    expect(at(result.sheet, 2, 1)).toBeUndefined();
    expect(at(result.sheet, 2, 2)).toBe('1.25');
  });

  it('detecta el punto y coma, que es lo que exporta Excel en español', () => {
    const result = importCsv('producto;unidades\nTornillo;10\n');
    expect(result.delimiter).toBe(';');
    expect(at(result.sheet, 1, 1)).toBe('10');
  });

  it('detecta el tabulador', () => {
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
  });

  it('NO cuenta los delimitadores que van dentro de comillas', () => {
    // El caso que rompe cualquier `split(',')`: una dirección con comas dentro
    // de un archivo de punto y coma.
    expect(detectDelimiter('nombre;ciudad\n"Ana";"Durango, Dgo."')).toBe(';');
  });

  it('respeta comillas, comillas escapadas y saltos de línea dentro del campo', () => {
    const rows = parseCsvRows('a,"b,c","d""e","f\ng"\n', ',');
    expect(rows[0]).toEqual(['a', 'b,c', 'd"e', 'f\ng']);
  });

  it('acepta CRLF igual que LF', () => {
    const rows = parseCsvRows('a,b\r\n1,2\r\n', ',');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('conserva la eñe y los acentos', () => {
    const result = importCsv('año,región\n2026,Durango\n');
    expect(result.sheet.headers).toEqual(['año', 'región']);
    expect(at(result.sheet, 1, 1)).toBe('Durango');
  });

  it('quita el BOM, que si no se convierte en parte del primer encabezado', () => {
    const result = importCsv('﻿producto,precio\nTornillo,2\n');
    expect(result.sheet.headers?.[0]).toBe('producto');
  });

  it('una primera fila numérica NO se toma por encabezados', () => {
    const result = importCsv('1,2,3\n4,5,6\n');
    expect(result.sheet.headers).toBeUndefined();
  });

  it('un texto que empieza por `=` se guarda como TEXTO, no como fórmula', () => {
    /**
     * Sin esto, importar un archivo ajeno podría inyectar fórmulas en la hoja de
     * quien lo importa. La comilla inicial es lo que cualquier hoja de cálculo
     * usa para decir «esto es texto».
     */
    const result = importCsv('valor\n=SUMA(A1:A9)\n');
    expect(at(result.sheet, 1, 0)).toBe("'=SUMA(A1:A9)");

    const values = evaluateSheet(result.sheet);
    expect(values.get(cellKey(1, 0))).not.toBe(0);
  });

  it('rechaza un archivo vacío y uno sin filas', () => {
    expect(() => importCsv('')).toThrow(CsvRejected);
    expect(() => importCsv('\n\n\n')).toThrow(CsvRejected);
  });

  it('recorta y AVISA cuando el archivo supera el tamaño de una hoja', () => {
    const rows = ['n'];
    for (let index = 0; index < NEXBOOK_LIMITS.maxSheetRows + 20; index += 1) {
      rows.push(String(index));
    }

    const result = importCsv(rows.join('\n'));
    expect(result.sheet.rows).toBe(NEXBOOK_LIMITS.maxSheetRows);
    expect(result.totalRows).toBeGreaterThan(NEXBOOK_LIMITS.maxSheetRows);
    expect(result.warnings.join(' ')).toContain('filas');
  });
});
