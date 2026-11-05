/**
 * Contrato de salida de NexConsole: lo que un programa produjo, en orden.
 *
 * Es el contrato de salidas de NexBook (Nextudio) sin lo que es de la
 * aplicación: `seq` ordena, `stream` discrimina. Añade `input` (lo que se
 * escribió en stdin, en su sitio) y `figure`/`custom` para formatos que pinta
 * un renderizador externo. Nada de esto ejecuta código.
 */

/** Evidencia opcional del runtime; los documentos antiguos no la traen. */
export interface NexViewDisplay {
  kind: 'scalar' | 'collection' | 'matrix' | 'table';
  pythonType?: string;
  shape?: number[];
  dtypes?: string[];
  /** Representación original acotada, aparte de stdout/stderr. */
  original?: string;
}

/** Sólo identificadores y coincidencias relevantes, nunca valores del espacio de nombres. */
export interface NexViewContext {
  target: 'name' | 'column' | 'attribute';
  identifier: string;
  suggestions: string[];
}

/** Cómo terminó (o va) la ejecución, en el vocabulario de los diagnósticos. */
export type NexConsoleStatus = 'ok' | 'failed' | 'timeout' | 'stopped' | 'rejected';

export type NexConsoleCellValue = string | number | boolean | null;
export type NexConsoleJsonValue = string | number | boolean | null | NexConsoleJsonValue[] | { [key: string]: NexConsoleJsonValue };

export interface NexConsoleTextOutput {
  seq: number;
  stream: 'stdout' | 'stderr' | 'error';
  text: string;
  truncated?: boolean;
  context?: NexViewContext;
  /** Región activa: todavía recibe fragmentos. No se interpreta como estructura hasta cerrarse. */
  open?: boolean;
}

/** Lo que la persona escribió en stdin (sin el Enter). */
export interface NexConsoleInputOutput {
  seq: number;
  stream: 'input';
  text: string;
}

export interface NexConsoleTableOutput {
  seq: number;
  stream: 'table';
  /** Relación EXPLÍCITA: resultados con el mismo grupo se componen juntos. Sin ella, no se infiere ninguna. */
  group?: string;
  /** Título dado por el programa (nunca inventado). */
  title?: string;
  columns: string[];
  rows: NexConsoleCellValue[][];
  totalRows: number;
  truncated?: boolean;
  display?: NexViewDisplay;
}

export interface NexConsoleImageOutput {
  seq: number;
  stream: 'image';
  /** Relación EXPLÍCITA: resultados con el mismo grupo se componen juntos. Sin ella, no se infiere ninguna. */
  group?: string;
  /** Título dado por el programa (nunca inventado). */
  title?: string;
  /** URL ya resuelta (data:, blob:, https:). Si falta, la resuelve `renderers.image`. */
  src?: string;
  /** Identificador de la aplicación (p. ej. un asset de NexBook). */
  assetId?: string;
  mimeType: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface NexConsoleJsonOutput {
  seq: number;
  stream: 'json';
  /** Relación EXPLÍCITA: resultados con el mismo grupo se componen juntos. Sin ella, no se infiere ninguna. */
  group?: string;
  /** Título dado por el programa (nunca inventado). */
  title?: string;
  value: NexConsoleJsonValue;
  truncated?: boolean;
  display?: NexViewDisplay;
}

/** Una figura (Plotly, Vega…): la pinta un renderizador de la aplicación. */
export interface NexConsoleFigureOutput {
  seq: number;
  stream: 'figure';
  format: string;
  title?: string;
  group?: string;
  /** Relación ancho/alto preferida (p. ej. 1.6). Sin ella, 16:10. */
  aspect?: number;
  data: unknown;
}

/** Cualquier otro formato, por tipo MIME, para un renderizador externo. */
export interface NexConsoleCustomOutput {
  seq: number;
  stream: 'custom';
  group?: string;
  mime: string;
  data: unknown;
}

export type NexConsoleOutput =
  | NexConsoleTextOutput
  | NexConsoleInputOutput
  | NexConsoleTableOutput
  | NexConsoleImageOutput
  | NexConsoleJsonOutput
  | NexConsoleFigureOutput
  | NexConsoleCustomOutput;

/** Estado de la ejecución, el mismo ciclo que la sesión interactiva de Nextudio. */
export type NexConsoleState = 'idle' | 'starting' | 'running' | 'waiting_for_input' | 'completed' | 'failed' | 'cancelled' | 'timed_out';
