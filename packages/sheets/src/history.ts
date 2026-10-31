/**
 * Historial de deshacer/rehacer por instantáneas.
 *
 * Las operaciones son puras y comparten estructura, así que guardar el libro
 * entero en cada paso cuesta lo que cambió, no lo que mide. Cada entrada
 * lleva una etiqueta («Pegar B2:D9») para anunciarla y, opcionalmente, la
 * selección de ese momento para devolverla al deshacer.
 */
import type { Workbook } from './types.ts';

export interface HistoryEntry<Meta = unknown> {
  workbook: Workbook;
  label: string;
  meta?: Meta;
}

export interface History<Meta = unknown> {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly size: number;
  /** Registra el estado ANTERIOR a un cambio (se llama antes de aplicar el nuevo). */
  record(before: Workbook, label: string, meta?: Meta): void;
  /** Devuelve el estado al que volver y guarda `current` para rehacer. */
  undo(current: Workbook, meta?: Meta): HistoryEntry<Meta> | null;
  redo(current: Workbook, meta?: Meta): HistoryEntry<Meta> | null;
  clear(): void;
}

export function createHistory<Meta = unknown>(limit = 200): History<Meta> {
  let past: HistoryEntry<Meta>[] = [];
  let future: HistoryEntry<Meta>[] = [];
  return {
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    get size() { return past.length; },
    record(before, label, meta) {
      past.push({ workbook: before, label, meta });
      if (past.length > limit) past = past.slice(past.length - limit);
      future = [];
    },
    undo(current, meta) {
      const entry = past.pop();
      if (!entry) return null;
      future.push({ workbook: current, label: entry.label, meta });
      return entry;
    },
    redo(current, meta) {
      const entry = future.pop();
      if (!entry) return null;
      past.push({ workbook: current, label: entry.label, meta });
      return entry;
    },
    clear() { past = []; future = []; },
  };
}
