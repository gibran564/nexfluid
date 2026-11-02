'use client';

/**
 * El controlador de NexSheets: une el libro (datos, @eclipsis/sheets) con el
 * estado de interacción (selección por hoja, edición, historial) y lo expone
 * por contexto a la rejilla, la barra de fórmulas, las pestañas y la barra de
 * estado.
 *
 * El libro es estado de React (controlado o no). La selección y la edición
 * viven en un almacén externo: moverse por la hoja no vuelve a pintar la
 * rejilla, sólo a quien se suscribe (contorno, barra de fórmulas, estado).
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  activeSheet, addSheet as addSheetOp, clampSelection, clearRange, createHistory, csvToSheet, DEFAULT_SHEET_LIMITS, evaluateSheet, fillRange,
  formatReference, getSheet, moveSelection, parseClipboardGrid, pasteGrid, quickFormula, rangeLabel, rangeToText, removeSheet as removeSheetOp,
  renameSheet as renameSheetOp, selectAll, selectionAt, selectionRange, setActiveSheet, setCellInput, setColumnWidth, sheetValueRows, stepInside,
  toCsv, updateSheet, createSheet, type CellAddress, type CellRange, type CellValue, type Selection, type Sheet, type SheetLimits, type Workbook,
} from '@eclipsis/sheets';
import type { NexMotion } from '@eclipsis/components';
import { useNex } from '../provider.tsx';

export interface SheetsEditing {
  sheet: string;
  address: CellAddress;
  draft: string;
  /** Dónde se escribe: en la celda o en la barra de fórmulas. El foco no salta entre ambas. */
  origin: 'cell' | 'bar';
}

interface Interaction {
  selections: Record<string, Selection>;
  editing: SheetsEditing | null;
  /** Último mensaje para la región viva (copiar, pegar, deshacer…). */
  notice: string;
}

function createStore(initial: Interaction) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(update: Partial<Interaction> | ((s: Interaction) => Partial<Interaction>)) {
      const patch = typeof update === 'function' ? update(state) : update;
      state = { ...state, ...patch };
      for (const l of [...listeners]) l();
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
type Store = ReturnType<typeof createStore>;

export interface NexSheetsController {
  readonly workbook: Workbook;
  readonly sheet: Sheet;
  readonly values: ReadonlyMap<string, CellValue>;
  readonly readOnly: boolean;
  readonly motion: NexMotion;
  readonly limits: SheetLimits;
  readonly store: Store;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  selection(): Selection;
  select(selection: Selection): void;
  move(dRow: number, dColumn: number, options?: { extend?: boolean; jump?: boolean }): void;
  step(direction: 'next-row' | 'prev-row' | 'next-column' | 'prev-column'): void;
  selectAll(): void;
  /** Escribe en una celda (una entrada de historial). */
  write(address: CellAddress, input: string, label?: string): void;
  startEdit(origin: 'cell' | 'bar', initial?: string): void;
  setDraft(draft: string): void;
  commitEdit(then?: 'next-row' | 'prev-row' | 'next-column' | 'prev-column' | 'stay'): void;
  cancelEdit(): void;
  clear(): void;
  copyText(): string;
  paste(text: string): boolean;
  fill(target: CellRange): void;
  quickSum(name?: string): void;
  undo(): void;
  redo(): void;
  setActive(id: string): void;
  addSheet(): void;
  removeSheet(id: string): void;
  renameSheet(id: string, name: string): void;
  resizeColumn(column: number, width: number): void;
  importCsv(text: string, name: string): void;
  exportCsv(): string;
  announce(message: string): void;
}

const Ctx = createContext<NexSheetsController | null>(null);

export function useNexSheets(): NexSheetsController {
  const c = useContext(Ctx);
  if (!c) throw new Error('Los componentes de NexSheets van dentro de <NexSheets> o <NexSheets.Provider>.');
  return c;
}

/** Suscripción fina al estado de interacción. */
export function useSheetsInteraction<T>(select: (state: Interaction, controller: NexSheetsController) => T): T {
  const c = useNexSheets();
  const get = useCallback(() => select(c.store.get(), c), [c, select]); // eslint-disable-line react-hooks/exhaustive-deps
  return useSyncExternalStore(c.store.subscribe, get, get);
}

export interface NexSheetsProviderProps {
  /** Libro controlado. */
  workbook?: Workbook;
  /** Libro inicial (no controlado). */
  defaultWorkbook?: Workbook;
  onChange?: (workbook: Workbook) => void;
  readOnly?: boolean;
  motion?: NexMotion;
  limits?: SheetLimits;
  children?: ReactNode;
}

const label = (r: CellRange) => rangeLabel(r);

export function NexSheetsProvider({ workbook: controlled, defaultWorkbook, onChange, readOnly = false, motion, limits = DEFAULT_SHEET_LIMITS, children }: NexSheetsProviderProps) {
  const defaults = useNex();
  const [inner, setInner] = useState<Workbook>(() => controlled ?? defaultWorkbook ?? { version: 1, sheets: [createSheet('Hoja 1')], active: '' });
  const workbook = controlled ?? inner;
  const fixed = workbook.active ? workbook : { ...workbook, active: workbook.sheets[0]!.id };
  const sheet = activeSheet(fixed);
  const history = useRef(createHistory<Record<string, Selection>>()).current;
  const [, bump] = useState(0);
  const store = useRef<Store | null>(null);
  if (!store.current) store.current = createStore({ selections: {}, editing: null, notice: '' });
  const latest = useRef(fixed);
  latest.current = fixed;

  // Una evaluación por hoja y versión de la hoja (las operaciones son inmutables).
  const cache = useRef(new WeakMap<Sheet, Map<string, CellValue>>());
  const valuesOf = (s: Sheet) => {
    let v = cache.current.get(s);
    if (!v) { v = evaluateSheet(s); cache.current.set(s, v); }
    return v;
  };
  const values = valuesOf(sheet);

  const commitWorkbook = useCallback((next: Workbook, historyLabel: string | null) => {
    const before = latest.current;
    if (next === before) return;
    if (historyLabel) history.record(before, historyLabel, store.current!.get().selections);
    latest.current = next;
    if (controlled === undefined) setInner(next);
    onChange?.(next);
    bump((n) => n + 1);
  }, [controlled, onChange, history]);

  const controller = useMemo<NexSheetsController>(() => {
    const s = store.current!;
    const wb = () => latest.current;
    const cur = () => activeSheet(wb());
    const selOf = (id: string) => s.get().selections[id] ?? selectionAt(0, 0);
    const setSel = (sel: Selection) => {
      const sh = cur();
      s.set((st) => ({ selections: { ...st.selections, [sh.id]: clampSelection(sel, sh) } }));
    };
    const announce = (notice: string) => s.set({ notice });
    const writeSheet = (fn: (sh: Sheet) => Sheet, historyLabel: string) => {
      const sh = cur();
      commitWorkbook(updateSheet(wb(), sh.id, (x) => fn(x as Sheet)), historyLabel);
    };
    const api: NexSheetsController = {
      get workbook() { return wb(); },
      get sheet() { return cur(); },
      get values() { return valuesOf(cur()); },
      readOnly,
      motion: motion ?? defaults.motion,
      limits,
      store: s,
      get canUndo() { return history.canUndo; },
      get canRedo() { return history.canRedo; },
      selection: () => selOf(cur().id),
      select: setSel,
      move(dRow, dColumn, options) { setSel(moveSelection(selOf(cur().id), cur(), dRow, dColumn, options)); },
      step(direction) { setSel(stepInside(selOf(cur().id), cur(), direction)); },
      selectAll() { setSel(selectAll(cur())); },
      write(address, input, l) {
        if (readOnly) return;
        if ((cur().cells[`${address.row}:${address.column}`]?.input ?? '') === input) return;
        writeSheet((x) => setCellInput(x, address, input, limits) as Sheet, l ?? `Editar ${formatReference(address)}`);
      },
      startEdit(origin, initial) {
        if (readOnly) return;
        const sh = cur();
        const at = selOf(sh.id).active;
        s.set({ editing: { sheet: sh.id, address: at, draft: initial ?? sh.cells[`${at.row}:${at.column}`]?.input ?? '', origin } });
      },
      setDraft(draft) {
        const e = s.get().editing;
        if (e) s.set({ editing: { ...e, draft } });
      },
      commitEdit(then = 'next-row') {
        const e = s.get().editing;
        if (!e) return;
        s.set({ editing: null });
        if (e.sheet === cur().id) api.write(e.address, e.draft);
        if (then !== 'stay') api.step(then);
      },
      cancelEdit() { if (s.get().editing) s.set({ editing: null }); },
      clear() {
        if (readOnly) return;
        const r = selectionRange(selOf(cur().id));
        writeSheet((x) => clearRange(x, r) as Sheet, `Vaciar ${label(r)}`);
        announce(`Vaciado ${label(r)}.`);
      },
      copyText() {
        const r = selectionRange(selOf(cur().id));
        announce(`Copiado ${label(r)}.`);
        return rangeToText(cur(), r);
      },
      paste(text) {
        if (readOnly) return false;
        const sel = selOf(cur().id);
        const grid = parseClipboardGrid(text) ?? [[text.replace(/\r?\n$/, '')]];
        const result = pasteGrid(cur(), selectionRange(sel).from, grid, limits);
        commitWorkbook(updateSheet(wb(), cur().id, () => result.sheet), `Pegar ${label(result.range)}`);
        setSel({ anchor: result.range.from, extent: result.range.to, active: result.range.from });
        announce(result.clipped ? `Pegado en ${label(result.range)}; parte no cupo en la hoja.` : `Pegado en ${label(result.range)}.`);
        return true;
      },
      fill(target) {
        if (readOnly) return;
        const sel = selOf(cur().id);
        const source = selectionRange(sel);
        writeSheet((x) => fillRange(x, source, target, limits) as Sheet, `Rellenar ${label(target)}`);
        setSel({ anchor: target.from, extent: target.to, active: sel.active });
        announce(`Rellenado ${label(target)}.`);
      },
      quickSum(name = 'SUMA') {
        if (readOnly) return;
        const sh = cur();
        const plan = quickFormula(sh, valuesOf(sh), selectionRange(selOf(sh.id)), name, limits);
        if (!plan) { announce('No hay números que sumar en la selección.'); return; }
        api.write(plan.at, plan.input, `Suma en ${formatReference(plan.at)}`);
        setSel(selectionAt(plan.at.row, plan.at.column));
        announce(`${plan.input} en ${formatReference(plan.at)}.`);
      },
      undo() {
        const entry = history.undo(wb(), s.get().selections);
        if (!entry) return;
        s.set({ editing: null, selections: entry.meta ?? s.get().selections });
        commitWorkbook(entry.workbook, null);
        announce(`Deshecho: ${entry.label}.`);
      },
      redo() {
        const entry = history.redo(wb(), s.get().selections);
        if (!entry) return;
        s.set({ editing: null, selections: entry.meta ?? s.get().selections });
        commitWorkbook(entry.workbook, null);
        announce(`Rehecho: ${entry.label}.`);
      },
      setActive(id) {
        api.commitEdit('stay');
        commitWorkbook(setActiveSheet(wb(), id), null);
      },
      addSheet() {
        if (readOnly) return;
        commitWorkbook(addSheetOp(wb()), 'Añadir hoja');
      },
      removeSheet(id) {
        if (readOnly) return;
        commitWorkbook(removeSheetOp(wb(), id), `Quitar ${getSheet(wb(), id)?.name ?? 'hoja'}`);
      },
      renameSheet(id, name) {
        if (readOnly) return;
        commitWorkbook(renameSheetOp(wb(), id, name), 'Renombrar hoja');
      },
      resizeColumn(column, width) {
        commitWorkbook(setColumnWidth(wb(), cur().id, column, width), 'Ancho de columna');
      },
      importCsv(text, name) {
        if (readOnly) return;
        const result = csvToSheet(text, {}, limits);
        const imported = createSheet(name, result.sheet);
        commitWorkbook(addSheetOp(wb(), imported), `Importar ${name}`);
        announce(`Importadas ${result.sheet.rows} filas en «${name}».${result.warnings.length ? ` ${result.warnings.join(' ')}` : ''}`);
      },
      exportCsv() { return toCsv(sheetValueRows(cur())); },
      announce,
    };
    return api;
  }, [readOnly, motion, defaults.motion, limits, commitWorkbook, history]); // eslint-disable-line react-hooks/exhaustive-deps

  // El valor de contexto cambia con el libro para que quien lee datos se actualice.
  const value = useMemo(() => Object.create(controller, {
    workbook: { value: fixed, enumerable: true },
    sheet: { value: sheet, enumerable: true },
    values: { value: values, enumerable: true },
  }) as NexSheetsController, [controller, fixed, sheet, values]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
