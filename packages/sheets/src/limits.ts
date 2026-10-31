/**
 * Topes de una hoja. Son parte del contrato, no un detalle: un rango como
 * `A1:ZZ9999999` o un pegado enorme deben rechazarse antes de construir el
 * array que tumba la pestaña.
 *
 * Los valores por defecto de NexSheets admiten hojas grandes (la rejilla es
 * virtual); una aplicación puede pasar los suyos —NexBook usa 200 × 40—.
 */
export interface SheetLimits {
  maxRows: number;
  maxColumns: number;
  /** Celdas con contenido. */
  maxCells: number;
  /** Caracteres por celda. */
  maxCellChars: number;
}

export const DEFAULT_SHEET_LIMITS: SheetLimits = {
  maxRows: 1_000_000,
  maxColumns: 702, // A … ZZ
  maxCells: 2_000_000,
  maxCellChars: 32_767,
};
