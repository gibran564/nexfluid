import { describe, expect, it } from 'vitest';
import { columnIndex, columnName, evaluateCell, evaluateSheet, formatValue, literal, parseRange, parseReference, type SheetData } from '@eclipsis/sheets';

/* Pruebas del motor portadas del editor de hojas de NexBook (Nextudio): el
   comportamiento heredado se comprueba con sus propias pruebas. */

/**
 * La hoja de cálculo.
 *
 * El motor de fórmulas es propio, y la razón está en `formula.ts`: las fórmulas
 * las escribe el alumnado y se guardan en un documento que otra persona puede
 * abrir. Convertirlas en JavaScript y evaluarlas sería ejecutar texto de
 * terceros en la sesión de quien lo lee.
 */

function sheetWith(cells: Record<string, string>, rows = 10, columns = 6): SheetData {
  return {
    rows,
    columns,
    cells: Object.fromEntries(Object.entries(cells).map(([key, input]) => [key, { input }])),
  };
}

/** `"B3"` → la clave con la que se guarda. */
function at(reference: string): string {
  const address = parseReference(reference)!;
  return `${address.row}:${address.column}`;
}

function valueOf(sheet: SheetData, reference: string) {
  const address = parseReference(reference)!;
  return evaluateCell(sheet, address);
}

describe('direcciones de celda', () => {
  it('las columnas van en base 26 BIYECTIVA: tras Z viene AA', () => {
    // Escribirlo con un `%` sin el `- 1` es el error clásico, y produce columnas
    // duplicadas a partir de la 27.
    expect(columnName(0)).toBe('A');
    expect(columnName(25)).toBe('Z');
    expect(columnName(26)).toBe('AA');
    expect(columnName(27)).toBe('AB');
    expect(columnName(51)).toBe('AZ');
    expect(columnName(52)).toBe('BA');
  });

  it('nombre e índice son inversos el uno del otro', () => {
    for (const index of [0, 1, 25, 26, 27, 51, 52, 700]) {
      expect(columnIndex(columnName(index))).toBe(index);
    }
  });

  it('un rango enorme no se expande', () => {
    /**
     * `A1:ZZ99999` pide más celdas de las que admite una hoja entera. Expandirlo
     * sería construir el array que tumba la pestaña de quien abrió el documento.
     */
    expect(parseRange('A1:ZZ99999')).toBeNull();
    expect(parseRange('A1:B2')).toHaveLength(4);
  });
});

describe('qué es un dato y qué es una fórmula', () => {
  it('un número escrito se lee como número', () => {
    expect(literal('42')).toBe(42);
    expect(literal('-3.5')).toBe(-3.5);
    expect(literal('25%')).toBe(0.25);
  });

  it('los ceros a la izquierda se quedan en texto', () => {
    // Quien escribe `007` casi siempre está escribiendo un código, no un número.
    expect(literal('007')).toBe('007');
  });

  it('el decimal no arrastra el error binario a la vista', () => {
    // 0.30000000000000004 delante de alguien que está aprendiendo no ayuda.
    expect(formatValue(0.1 + 0.2)).toBe('0.3');
  });
});

describe('el intérprete de fórmulas', () => {
  it('hace aritmética con la precedencia correcta', () => {
    const sheet = sheetWith({ [at('A1')]: '=2 + 3 * 4', [at('A2')]: '=(2 + 3) * 4', [at('A3')]: '=2^3^2' });

    expect(valueOf(sheet, 'A1')).toBe(14);
    expect(valueOf(sheet, 'A2')).toBe(20);
    // La potencia asocia por la derecha: 2^(3^2) = 512, no (2^3)^2 = 64.
    expect(valueOf(sheet, 'A3')).toBe(512);
  });

  it('resuelve referencias encadenadas', () => {
    const sheet = sheetWith({
      [at('A1')]: '10',
      [at('B1')]: '=A1 * 2',
      [at('C1')]: '=B1 + A1',
    });

    expect(valueOf(sheet, 'C1')).toBe(30);
  });

  it('suma y promedia un rango', () => {
    const sheet = sheetWith({
      [at('A1')]: '1',
      [at('A2')]: '2',
      [at('A3')]: '3',
      [at('B1')]: '=SUMA(A1:A3)',
      [at('B2')]: '=PROMEDIO(A1:A3)',
      [at('B3')]: '=MAX(A1:A3)',
    });

    expect(valueOf(sheet, 'B1')).toBe(6);
    expect(valueOf(sheet, 'B2')).toBe(2);
    expect(valueOf(sheet, 'B3')).toBe(3);
  });

  it('acepta los nombres en inglés y en español', () => {
    // Quien ha usado Excel en español escribe SUMA y quien siguió un tutorial
    // escribe SUM. Hacer fallar a uno de los dos sólo enseña a desconfiar.
    const sheet = sheetWith({ [at('A1')]: '2', [at('A2')]: '3', [at('B1')]: '=SUM(A1:A2)' });
    expect(valueOf(sheet, 'B1')).toBe(5);
  });

  it('SI elige la rama correcta', () => {
    const sheet = sheetWith({
      [at('A1')]: '15',
      [at('B1')]: '=SI(A1>10; "alto"; "bajo")',
      [at('B2')]: '=SI(A1>100; "alto"; "bajo")',
    });

    expect(valueOf(sheet, 'B1')).toBe('alto');
    expect(valueOf(sheet, 'B2')).toBe('bajo');
  });

  it('el texto se concatena con &', () => {
    const sheet = sheetWith({ [at('A1')]: 'Hola', [at('B1')]: '=A1 & " mundo"' });
    expect(valueOf(sheet, 'B1')).toBe('Hola mundo');
  });

  it('una división entre cero se dice, no se calcula', () => {
    const sheet = sheetWith({ [at('A1')]: '=1/0' });
    expect(valueOf(sheet, 'A1')).toBe('#DIV/0!');
  });

  it('una función que no existe da #NOMBRE?', () => {
    const sheet = sheetWith({ [at('A1')]: '=BUSCARV(A2)' });
    expect(valueOf(sheet, 'A1')).toBe('#NOMBRE?');
  });

  it('una referencia fuera de la hoja da #REF!', () => {
    const sheet = sheetWith({ [at('A1')]: '=Z99' }, 5, 3);
    expect(valueOf(sheet, 'A1')).toBe('#REF!');
  });

  it('una referencia circular se corta en vez de agotar la pila', () => {
    /**
     * `A1 = B1 + 1` y `B1 = A1 + 1` es una recursión infinita. Sin el corte, lo
     * que se agota es la pila del navegador de quien abre el documento.
     */
    const sheet = sheetWith({ [at('A1')]: '=B1 + 1', [at('B1')]: '=A1 + 1' });

    expect(valueOf(sheet, 'A1')).toBe('#CICLO!');
    expect(valueOf(sheet, 'B1')).toBe('#CICLO!');
  });

  it('NO evalúa JavaScript', () => {
    /**
     * La prueba de seguridad de la hoja. Las fórmulas las escribe el alumnado y
     * se guardan en un documento que otra persona abre; si esto se evaluara
     * como JavaScript, sería ejecución de código de terceros en su sesión.
     */
    const hostiles = [
      '=globalThis',
      '=constructor',
      '=fetch("https://ejemplo.mx")',
      '=[].constructor.constructor("return 1")()',
      '=process',
      '=require("fs")',
    ];

    for (const formula of hostiles) {
      const sheet = sheetWith({ [at('A1')]: formula });
      const value = valueOf(sheet, 'A1');
      // Da un error de fórmula, que es la respuesta correcta: no existe ese
      // nombre en el lenguaje de la hoja.
      expect(typeof value === 'string' && value.startsWith('#')).toBe(true);
    }
  });

  it('recalcula la hoja entera de una vez', () => {
    const sheet = sheetWith({ [at('A1')]: '5', [at('B1')]: '=A1*2', [at('C1')]: '=B1*2' });
    const values = evaluateSheet(sheet);

    expect(values.get(at('C1'))).toBe(20);
  });
});
