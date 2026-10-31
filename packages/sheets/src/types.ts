/**
 * El modelo de datos de NexSheets.
 *
 * Una hoja es DISPERSA: sólo existen las celdas con contenido, con clave
 * `"<fila>:<columna>"` en base 0, y cada celda guarda lo ESCRITO (`input`),
 * fórmula incluida. El valor se calcula, no se guarda. Es el mismo contrato
 * que la hoja de NexBook, así que un adaptador entre ambos es la identidad.
 */

export interface SheetCell {
  /** Texto tal cual, incluida la fórmula con su `=` inicial si la hay. */
  input: string;
}

export interface SheetData {
  rows: number;
  columns: number;
  /** Clave `"<fila>:<columna>"`, base 0. Sólo las celdas con contenido. */
  cells: Record<string, SheetCell>;
  /** Nombre de las columnas, si quien hizo la hoja les puso uno. */
  headers?: string[];
}

/** Una hoja dentro de un libro: datos + identidad + presentación. */
export interface Sheet extends SheetData {
  id: string;
  name: string;
  /** Anchos de columna en px que difieren del predeterminado. */
  columnWidths?: Record<number, number>;
  /** Altos de fila en px que difieren del predeterminado. */
  rowHeights?: Record<number, number>;
}

export interface Workbook {
  version: 1;
  sheets: Sheet[];
  /** id de la hoja activa. */
  active: string;
}
