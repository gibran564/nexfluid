'use client';

/**
 * NexDataView: los datos de una hoja dentro de un documento, como tabla o como
 * gráfico, y la puerta a NexSheets cuando hace falta el editor completo.
 *
 * Un solo dato: la aplicación es dueña de un `SheetData` (el formato de
 * NexSheets Core). La tabla y el gráfico lo EVALÚAN —una fórmula muestra su
 * resultado— y «Abrir en NexSheets» edita ese mismo dato, así que tabla,
 * gráfico y editor no pueden desincronizarse.
 *
 * Abrir en NexSheets:
 * - con `onOpenSheets`, la experiencia completa la pone la aplicación
 *   (p. ej. el modo enfoque de NexBook): recibe el dato y una función para
 *   devolver los cambios;
 * - sin él y con `onChange`, la vista se transforma (NexMorph) en el editor
 *   NexSheets real, en un panel modal, y cada cambio llega por `onChange`.
 *
 * Los controles (Tabla / Gráfico, Abrir) aparecen al acercarse o al enfocar,
 * no están siempre a la vista.
 */
import { useId, useMemo, useState, type ReactNode } from 'react';
import { createSheet, evaluateSheet, formatValue, type CellValue, type SheetData, type Workbook } from '@eclipsis/sheets';
import { cx, type NexMotion } from '@eclipsis/components';
import { NexButton } from '../button.tsx';
import { NexIcon } from '../icon.tsx';
import { NexMorph } from '../morph.tsx';
import { NexSegmented } from '../segmented.tsx';
import { NexSheetsEditor } from './parts.tsx';

export type NexDataViewMode = 'table' | 'chart';

export interface NexSheetsOpenRequest {
  /** El dato tal como está ahora. */
  sheet: SheetData;
  title: string;
  /** Devuelve el dato editado; la vista se vuelve a pintar con él. */
  commit: (next: SheetData) => void;
}

export interface NexDataViewProps {
  sheet: SheetData;
  /** Sin él, la vista es de sólo lectura y no ofrece abrir el editor integrado. */
  onChange?: (sheet: SheetData) => void;
  /** Título (pie de la tabla, nombre del gráfico y del editor). */
  title: string;
  view?: NexDataViewMode;
  defaultView?: NexDataViewMode;
  onViewChange?: (view: NexDataViewMode) => void;
  /** Usa la primera fila como encabezado cuando la hoja no declara `headers`. Por defecto, sí. */
  headerRow?: boolean;
  /** Delegar «Abrir en NexSheets» en la aplicación. */
  onOpenSheets?: (request: NexSheetsOpenRequest) => void;
  /** Ocultar los controles propios (la aplicación los pone en otro sitio). */
  controls?: boolean;
  motion?: NexMotion;
  className?: string;
}

interface Table { head: string[]; rows: CellValue[][] }

/** La región ocupada de la hoja, evaluada. */
function tableOf(sheet: SheetData, headerRow: boolean): Table {
  const values = evaluateSheet(sheet);
  let maxRow = -1;
  let maxCol = -1;
  for (const key of Object.keys(sheet.cells)) {
    const [r, c] = key.split(':').map(Number);
    if ((sheet.cells[key]?.input ?? '') === '') continue;
    maxRow = Math.max(maxRow, r!);
    maxCol = Math.max(maxCol, c!);
  }
  maxCol = Math.max(maxCol, (sheet.headers?.length ?? 0) - 1);
  const grid: CellValue[][] = [];
  for (let r = 0; r <= maxRow; r++) {
    const row: CellValue[] = [];
    for (let c = 0; c <= maxCol; c++) row.push(values.get(`${r}:${c}`) ?? null);
    grid.push(row);
  }
  if (sheet.headers?.length) return { head: Array.from({ length: maxCol + 1 }, (_, c) => sheet.headers![c] ?? ''), rows: grid };
  if (headerRow && grid.length) return { head: grid[0]!.map((v) => formatValue(v)), rows: grid.slice(1) };
  return { head: Array.from({ length: maxCol + 1 }, (_, c) => String.fromCharCode(65 + (c % 26))), rows: grid };
}

/** Columnas numéricas (todas sus celdas no vacías son números): las series del gráfico. */
function seriesOf(table: Table): number[] {
  const out: number[] = [];
  for (let c = 1; c < table.head.length; c++) {
    const cells = table.rows.map((r) => r[c]).filter((v) => v !== null && v !== '');
    if (cells.length && cells.every((v) => typeof v === 'number')) out.push(c);
  }
  return out;
}

function Chart({ table, title }: { table: Table; title: string }) {
  const series = seriesOf(table);
  const max = Math.max(1e-9, ...table.rows.flatMap((r) => series.map((c) => Number(r[c] ?? 0))));
  const band = 18 + series.length * 14;
  const height = table.rows.length * band + 8;
  if (!series.length) return <p className="nx-data-view__empty">No hay columnas numéricas que dibujar.</p>;
  const summary = table.rows.map((r) => `${formatValue(r[0] ?? null)}: ${series.map((c) => `${table.head[c]} ${formatValue(r[c] ?? null)}`).join(', ')}`).join('; ');
  return (
    <figure className="nx-data-view__chart">
      <svg viewBox={`0 0 640 ${height}`} role="img" aria-label={`${title}. ${summary}`}>
        {table.rows.map((row, i) => (
          <g key={i} transform={`translate(0 ${i * band + 4})`}>
            <text x="0" y="14" className="nx-data-view__label">{formatValue(row[0] ?? null)}</text>
            {series.map((c, s) => {
              const v = Number(row[c] ?? 0);
              const w = Math.max(0, (v / max) * 380);
              return (
                <g key={c}>
                  <rect x="200" y={4 + s * 14} height="10" rx="5" width={w} className="nx-data-view__bar" data-series={s % 3} />
                  <text x={206 + w} y={13 + s * 14} className="nx-data-view__value">{formatValue(row[c] ?? null)}</text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
      {series.length > 1 && (
        <figcaption className="nx-data-view__legend">
          {series.map((c, s) => <span key={c}><i data-series={s % 3} aria-hidden="true" />{table.head[c]}</span>)}
        </figcaption>
      )}
    </figure>
  );
}

const toWorkbook = (sheet: SheetData, title: string): Workbook => {
  const s = createSheet(title, sheet, 'nx-data-view');
  return { version: 1, sheets: [s], active: s.id };
};
const fromWorkbook = (workbook: Workbook): SheetData => {
  const { rows, columns, cells, headers } = workbook.sheets[0]!;
  return headers ? { rows, columns, cells, headers } : { rows, columns, cells };
};

export function NexDataView({
  sheet, onChange, title, view: controlled, defaultView = 'table', onViewChange, headerRow = true, onOpenSheets, controls = true, motion, className,
}: NexDataViewProps) {
  const [inner, setInner] = useState<NexDataViewMode>(defaultView);
  const view = controlled ?? inner;
  const [open, setOpen] = useState(false);
  const id = useId();
  const table = useMemo(() => tableOf(sheet, headerRow), [sheet, headerRow]);
  const setView = (next: NexDataViewMode) => { if (controlled === undefined) setInner(next); onViewChange?.(next); };
  const canEdit = Boolean(onOpenSheets || onChange);

  const body: ReactNode = view === 'table' ? (
    <div className="nx-data-view__table nx-markdown__table" key="table">
      <table>
        <caption className="nx-visually-hidden">{title}</caption>
        <thead><tr>{table.head.map((h, c) => <th key={c} scope="col">{h}</th>)}</tr></thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r}>
              {row.map((v, c) => c === 0
                ? <th key={c} scope="row">{formatValue(v)}</th>
                : <td key={c} data-numeric={typeof v === 'number' ? '' : undefined}>{formatValue(v)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : <div className="nx-data-view__swap" key="chart"><Chart table={table} title={title} /></div>;

  const bar = controls && (
    <div className="nx-data-view__controls">
      <NexSegmented aria-label={`Vista de ${title}`} density="compact" motion={motion} value={view} onValueChange={(v) => setView(v as NexDataViewMode)}
        options={[{ value: 'table', label: 'Tabla' }, { value: 'chart', label: 'Gráfico' }]} />
      {canEdit && (onOpenSheets
        ? <NexButton density="compact" appearance="ghost" iconStart={<NexIcon name="grid" size={14} />}
            onClick={() => onOpenSheets({ sheet, title, commit: (next) => onChange?.(next) })}>Abrir en NexSheets</NexButton>
        : <NexMorph.Trigger className="nx-data-view__open"><NexIcon name="grid" size={14} /> Abrir en NexSheets</NexMorph.Trigger>)}
    </div>
  );

  // Delegado o de sólo lectura: sin transformación propia.
  if (onOpenSheets || !onChange) {
    return <div className={cx('nx-data-view', className)} data-view={view}>{body}{bar}</div>;
  }
  return (
    <NexMorph open={open} onOpenChange={setOpen} motion={motion}>
      <NexMorph.Source className={cx('nx-data-view', className)} data-view={view}>
        {body}
        {bar}
      </NexMorph.Source>
      <NexMorph.Target label={`${title} en NexSheets`} className="nx-data-view__target">
        <div className="nx-data-view__head">
          <NexMorph.Title className="nx-data-view__title" id={`${id}-t`}>{title}</NexMorph.Title>
          <NexMorph.Close label="Volver al documento" />
        </div>
        {open && (
          <NexSheetsEditor height="min(70vh, 640px)" label={title}
            defaultWorkbook={toWorkbook(sheet, title)} onChange={(wb) => onChange(fromWorkbook(wb))} motion={motion} />
        )}
      </NexMorph.Target>
    </NexMorph>
  );
}
