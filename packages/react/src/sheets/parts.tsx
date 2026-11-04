'use client';

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { formatReference, formatValue, isFormula, isFormulaError, rangeLabel, rangeSize, rangeStats, selectionRange, type CellRange } from '@eclipsis/sheets';
import { cx } from '@eclipsis/components';
import { NexButton, NexIconButton } from '../button.tsx';
import { NexIcon } from '../icon.tsx';
import { NexSegmented } from '../segmented.tsx';
import { NexSheetsProvider, useNexSheets, useSheetsInteraction, type NexSheetsProviderProps } from './controller.tsx';
import { NexSheetGrid } from './grid.tsx';

const useSelection = () => useSheetsInteraction(useCallback((st, c) => st.selections[c.sheet.id] ?? null, []));
const useEditing = () => useSheetsInteraction(useCallback((st) => st.editing, []));
const ERROR_HELP: Record<string, string> = {
  '#REF!': 'La fórmula apunta fuera de la hoja.',
  '#VALOR!': 'Un operando no es del tipo esperado o la fórmula está mal escrita.',
  '#DIV/0!': 'División entre cero (o promedio de nada).',
  '#NOMBRE?': 'Función desconocida.',
  '#CICLO!': 'Referencia circular: la celda depende de sí misma.',
};

/**
 * Barra de fórmulas: referencia de la celda activa y lo ESCRITO en ella. Se
 * puede editar aquí o en la celda; ambas muestran el mismo borrador, pero el
 * foco se queda donde se escribe. El valor lo calcula el motor de la hoja: la
 * barra no evalúa nada.
 */
export function NexFormulaBar({ className }: { className?: string }) {
  const sheets = useNexSheets();
  const selection = useSelection();
  const editing = useEditing();
  const id = useId();
  const active = selection?.active ?? { row: 0, column: 0 };
  const range = selection ? selectionRange(selection) : null;
  const input = sheets.sheet.cells[`${active.row}:${active.column}`]?.input ?? '';
  const value = sheets.values.get(`${active.row}:${active.column}`) ?? null;
  const error = isFormulaError(value) ? value : null;
  const here = editing && editing.sheet === sheets.sheet.id;
  const back = (el: HTMLElement) => el.closest('.nx-sheets')?.querySelector<HTMLElement>('.nx-sheet__viewport')?.focus({ preventScroll: true });
  return (
    <div className={cx('nx-formula-bar', className)} data-editing={here ? '' : undefined} data-error={error ? '' : undefined}>
      <span className="nx-formula-bar__ref" aria-live="off">{range && rangeSize(range) > 1 ? rangeLabel(range) : formatReference(active)}</span>
      <span className="nx-formula-bar__fx" aria-hidden="true">fx</span>
      <input
        id={id}
        className="nx-formula-bar__input"
        aria-label={`Contenido de ${formatReference(active)}`}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={error ? true : undefined}
        value={here ? editing.draft : input}
        readOnly={sheets.readOnly}
        spellCheck={false}
        onFocus={() => { if (!here && !sheets.readOnly) sheets.startEdit('bar'); }}
        onChange={(e) => { if (!sheets.store.get().editing) sheets.startEdit('bar', e.target.value); else sheets.setDraft(e.target.value); }}
        onBlur={() => { if (sheets.store.get().editing?.origin === 'bar') sheets.commitEdit('stay'); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); sheets.commitEdit('stay'); back(e.currentTarget); }
          if (e.key === 'Escape') { e.preventDefault(); sheets.cancelEdit(); back(e.currentTarget); }
        }}
      />
      {error && <span id={`${id}-error`} className="nx-formula-bar__error" role="status">{error} · {ERROR_HELP[error]}</span>}
    </div>
  );
}

/** Pestañas de hojas: la gota de NexSegmented viaja entre hojas; cada hoja conserva su selección y su desplazamiento. */
export function NexSheetTabs({ className }: { className?: string }) {
  const sheets = useNexSheets();
  return (
    <div className={cx('nx-sheet-tabs', className)}>
      <NexSegmented
        aria-label="Hojas del libro"
        density="compact"
        value={sheets.workbook.active}
        onValueChange={(id) => sheets.setActive(id)}
        options={sheets.workbook.sheets.map((s) => ({ value: s.id, label: s.name }))}
      />
      {!sheets.readOnly && <NexIconButton label="Añadir hoja" icon={<NexIcon name="plus" />} density="compact" onClick={() => sheets.addSheet()} />}
    </div>
  );
}

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Herramientas: deshacer/rehacer, suma rápida, vaciar, importar y exportar CSV. Una sola parada de Tab con flechas. */
export function NexSheetToolbar({ className, children }: { className?: string; children?: ReactNode }) {
  const sheets = useNexSheets();
  const file = useRef<HTMLInputElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  useSelection(); // se actualiza al moverse (estado de los botones)
  useEffect(() => {
    const items = [...(bar.current?.querySelectorAll<HTMLElement>('button') ?? [])];
    const current = items.find((i) => i.tabIndex === 0 && !i.hasAttribute('disabled')) ?? items.find((i) => !i.hasAttribute('disabled'));
    for (const i of items) i.tabIndex = i === current ? 0 : -1;
  });
  return (
    <div
      ref={bar}
      className={cx('nx-sheet-toolbar', className)}
      role="toolbar"
      aria-label="Herramientas de la hoja"
      onKeyDown={(e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        const i = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = items[(i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length];
        if (!next) return;
        e.preventDefault();
        for (const it of items) it.tabIndex = it === next ? 0 : -1;
        next.focus();
      }}
    >
      <NexIconButton label="Deshacer" icon={<NexIcon name="arrow-left" />} density="compact" disabled={!sheets.canUndo} onClick={() => sheets.undo()} />
      <NexIconButton label="Rehacer" icon={<NexIcon name="arrow-right" />} density="compact" disabled={!sheets.canRedo} onClick={() => sheets.redo()} />
      <span className="nx-sheet-toolbar__sep" aria-hidden="true" />
      <NexButton density="compact" appearance="ghost" disabled={sheets.readOnly} onClick={() => sheets.quickSum()}>Σ Suma</NexButton>
      <NexButton density="compact" appearance="ghost" disabled={sheets.readOnly} onClick={() => sheets.clear()}>Vaciar</NexButton>
      <span className="nx-sheet-toolbar__sep" aria-hidden="true" />
      <NexButton density="compact" appearance="ghost" disabled={sheets.readOnly} onClick={() => file.current?.click()}>Importar CSV</NexButton>
      <NexButton density="compact" appearance="ghost" onClick={() => download(sheets.exportCsv(), `${sheets.sheet.name}.csv`)}>Exportar CSV</NexButton>
      {children}
      <input
        ref={file}
        type="file"
        accept=".csv,text/csv,.tsv,text/tab-separated-values"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try { sheets.importCsv(await f.text(), f.name.replace(/\.[^.]+$/, '')); } catch (err) { sheets.announce(err instanceof Error ? err.message : 'No se pudo importar.'); }
        }}
      />
    </div>
  );
}

const fmt = (n: number | null) => (n === null ? '—' : String(Math.round(n * 1e4) / 1e4));

/** Rango pequeño: se recorre; rango enorme (una columna entera): se recorren sólo las celdas con contenido. */
function statsFor(cells: Record<string, unknown>, values: ReadonlyMap<string, unknown>, range: CellRange) {
  if (rangeSize(range) <= 50_000) return rangeStats(values as never, range);
  const inside = new Map<string, never>();
  for (const key of Object.keys(cells)) {
    const [r, c] = key.split(':').map(Number);
    if (r! >= range.from.row && r! <= range.to.row && c! >= range.from.column && c! <= range.to.column) inside.set(key, values.get(key) as never);
  }
  return rangeStats(inside, { from: range.from, to: range.from.row === range.to.row && range.from.column === range.to.column ? range.to : range.to });
}

/** Barra de estado: celda activa, selección, modo y resumen numérico. Anuncia las acciones (región viva). */
export function NexSheetStatusBar({ className }: { className?: string }) {
  const sheets = useNexSheets();
  const selection = useSelection();
  const editing = useEditing();
  const notice = useSheetsInteraction(useCallback((st) => st.notice, []));
  const range = selection ? selectionRange(selection) : null;
  const stats = range && rangeSize(range) > 1 ? statsFor(sheets.sheet.cells, sheets.values, range) : null;
  return (
    <div className={cx('nx-sheet-status', className)}>
      <span className="nx-sheet-status__mode" data-editing={editing ? '' : undefined}>{editing ? 'Editando' : sheets.readOnly ? 'Sólo lectura' : 'Listo'}</span>
      {range && <span>{rangeLabel(range)}{rangeSize(range) > 1 ? ` · ${rangeSize(range).toLocaleString('es-MX')} celdas` : ''}</span>}
      {stats && stats.numbers > 0 && (
        <span className="nx-sheet-status__stats">Suma {fmt(stats.sum)} · Promedio {fmt(stats.average)} · Mín {fmt(stats.min)} · Máx {fmt(stats.max)} · Cuenta {stats.count}</span>
      )}
      <span className="nx-sheet-status__notice" role="status" aria-live="polite">{notice}</span>
    </div>
  );
}

/** Inspector de celda: lo escrito, el valor, su tipo y, si falla, por qué. También el nombre de la hoja. */
export function NexCellInspector({ className }: { className?: string }) {
  const sheets = useNexSheets();
  const selection = useSelection();
  const active = selection?.active ?? { row: 0, column: 0 };
  const key = `${active.row}:${active.column}`;
  const input = sheets.sheet.cells[key]?.input ?? '';
  const value = sheets.values.get(key) ?? null;
  const error = isFormulaError(value) ? value : null;
  const [name, setName] = useState(sheets.sheet.name);
  useEffect(() => setName(sheets.sheet.name), [sheets.sheet.name]);
  const type = error ? 'Error' : value === null ? 'Vacía' : typeof value === 'number' ? 'Número' : typeof value === 'boolean' ? 'Lógico' : 'Texto';
  return (
    <section className={cx('nx-cell-inspector', className)} aria-label="Inspector de celda">
      <h3 className="nx-cell-inspector__ref">{formatReference(active)}</h3>
      <dl>
        <div><dt>Escrito</dt><dd><code>{input || '—'}</code></dd></div>
        <div><dt>Valor</dt><dd>{error ?? formatValue(value) ?? '—'}</dd></div>
        <div><dt>Tipo</dt><dd>{type}{isFormula(input) ? ' · fórmula' : ''}</dd></div>
        {error && <div><dt>Motivo</dt><dd>{ERROR_HELP[error]}</dd></div>}
      </dl>
      {!sheets.readOnly && (
        <form className="nx-cell-inspector__rename" onSubmit={(e) => { e.preventDefault(); sheets.renameSheet(sheets.sheet.id, name); }}>
          <label>Nombre de la hoja<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></label>
          <NexButton type="submit" density="compact" appearance="ghost">Renombrar</NexButton>
          {sheets.workbook.sheets.length > 1 && <NexButton density="compact" appearance="ghost" tone="danger" onClick={() => sheets.removeSheet(sheets.sheet.id)}>Quitar hoja</NexButton>}
        </form>
      )}
    </section>
  );
}

export interface NexSheetsProps extends NexSheetsProviderProps {
  /** Alto del editor (px o CSS). Por defecto 560 px. */
  height?: number | string;
  toolbar?: boolean;
  formulaBar?: boolean;
  tabs?: boolean;
  statusBar?: boolean;
  inspector?: boolean;
  /** Nombre accesible de la rejilla (por defecto, el de la hoja). */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * NexSheets: el editor completo (herramientas, barra de fórmulas, rejilla,
 * pestañas, estado e inspector opcional). Para otra composición, usa
 * `NexSheets.Provider` con las piezas sueltas.
 */
export function NexSheetsEditor({ height = 560, toolbar = true, formulaBar = true, tabs = true, statusBar = true, inspector = false, label, className, style, ...provider }: NexSheetsProps) {
  return (
    <NexSheetsProvider {...provider}>
      <div className={cx('nx-sheets', className)} style={{ ...style, '--nx-sheets-height': typeof height === 'number' ? `${height}px` : height } as CSSProperties} data-inspector={inspector ? '' : undefined}>
        {toolbar && <NexSheetToolbar />}
        {formulaBar && <NexFormulaBar />}
        <div className="nx-sheets__body">
          <NexSheetGrid label={label} />
          {inspector && <NexCellInspector />}
        </div>
        {(tabs || statusBar) && (
          <div className="nx-sheets__foot">
            {tabs && <NexSheetTabs />}
            {statusBar && <NexSheetStatusBar />}
          </div>
        )}
      </div>
    </NexSheetsProvider>
  );
}

export const NexSheets = Object.assign(NexSheetsEditor, {
  Provider: NexSheetsProvider,
  Grid: NexSheetGrid,
  FormulaBar: NexFormulaBar,
  Tabs: NexSheetTabs,
  Toolbar: NexSheetToolbar,
  StatusBar: NexSheetStatusBar,
  Inspector: NexCellInspector,
});
