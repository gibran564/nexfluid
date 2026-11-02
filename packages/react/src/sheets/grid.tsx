'use client';

/**
 * NexSheetGrid: rejilla virtual sobre UN desplazamiento nativo.
 *
 * - Sólo se pintan las filas y columnas visibles (más un margen), a partir de
 *   ejes con tamaños variables (`createAxis`). Encabezados pegajosos (sticky)
 *   dentro del mismo desplazamiento: siempre sincronizados, sin JS.
 * - El área desplazable es la del navegador (rueda, touchpad, táctil, teclado).
 *   NexScroll la representa con un tracker por eje (`ScrollTracker`) y dos
 *   carriles; la barra nativa sólo se oculta cuando ambos están listos.
 * - La selección vive fuera del estado de React de la rejilla: moverse no
 *   vuelve a pintar celdas. El contorno es una sola superficie que viaja con
 *   resortes (sus bordes, con física distinta según la dirección).
 * - Semántica `grid` (filas, encabezados de fila y columna, celda activa con
 *   aria-activedescendant). El foco se queda en la rejilla o en el editor.
 */
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { ScrollTracker } from '@eclipsis/core';
import { cellKey, columnName, createAxis, fillTarget, formatValue, isFormula, isFormulaError, selectionRange, type Axis, type CellRange, type CellValue, type Sheet } from '@eclipsis/sheets';
import { cx, toDomId } from '@eclipsis/components';
import { canAnimate, useMotionPreference } from '../provider.tsx';
import { morphSpring, useSprings, type SpringPreset } from '../springs.ts';
import { useNexSheets, useSheetsInteraction } from './controller.tsx';

const ROW_H = 30;
const COL_W = 112;
const HEAD_H = 30;
const OVERSCAN = 3;
/** Sin selección guardada, la activa es A1 (como al abrir cualquier hoja). */
const ORIGIN = { row: 0, column: 0 };

export interface NexSheetGridProps {
  /** Nombre accesible (por defecto, el de la hoja). */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

interface Window { r0: number; r1: number; c0: number; c1: number }

const rowHeaderWidth = (rows: number) => Math.max(44, String(rows).length * 9 + 24);

export function NexSheetGrid({ label, className, style }: NexSheetGridProps) {
  const sheets = useNexSheets();
  const sheet = sheets.sheet;
  const preference = useMotionPreference();
  const animate = canAnimate(sheets.motion, preference);
  const baseId = toDomId('nx-sheet', sheet.id);
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{ column: number; width: number } | null>(null);
  const widths = preview ? { ...sheet.columnWidths, [preview.column]: preview.width } : sheet.columnWidths;
  const cols = useMemo(() => createAxis(sheet.columns, COL_W, widths ?? {}), [sheet.columns, widths]);
  const rows = useMemo(() => createAxis(sheet.rows, ROW_H, sheet.rowHeights ?? {}), [sheet.rows, sheet.rowHeights]);
  const W = rowHeaderWidth(sheet.rows);
  const [win, setWin] = useState<Window>({ r0: 0, r1: Math.min(sheet.rows - 1, 30), c0: 0, c1: Math.min(sheet.columns - 1, 12) });
  const axes = useRef({ rows, cols, W });
  axes.current = { rows, cols, W };

  // Ventana visible: se recalcula al desplazar (como mucho una vez por fotograma) o al cambiar de tamaño.
  const measureWindow = useCallback(() => {
    const v = viewport.current;
    if (!v) return;
    const { rows: ra, cols: ca, W: w } = axes.current;
    const r = ra.visible(Math.max(0, v.scrollTop - HEAD_H), v.clientHeight, OVERSCAN);
    const c = ca.visible(Math.max(0, v.scrollLeft - w), v.clientWidth, OVERSCAN);
    setWin((old) => (old.r0 === r.start && old.r1 === r.end && old.c0 === c.start && old.c1 === c.end ? old : { r0: r.start, r1: r.end, c0: c.start, c1: c.end }));
  }, []);
  useLayoutEffect(() => {
    const v = viewport.current;
    if (!v) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; measureWindow(); });
    };
    v.addEventListener('scroll', onScroll, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measureWindow()) : null;
    ro?.observe(v);
    measureWindow();
    return () => { v.removeEventListener('scroll', onScroll); ro?.disconnect(); cancelAnimationFrame(frame); };
  }, [measureWindow]);
  useLayoutEffect(() => measureWindow(), [rows, cols, measureWindow]);

  // Posición de desplazamiento por hoja: volver a una hoja la deja donde estaba.
  const scrollBySheet = useRef(new Map<string, { top: number; left: number }>());
  const shownSheet = useRef(sheet.id);
  useLayoutEffect(() => {
    const v = viewport.current;
    if (!v || shownSheet.current === sheet.id) return;
    scrollBySheet.current.set(shownSheet.current, { top: v.scrollTop, left: v.scrollLeft });
    shownSheet.current = sheet.id;
    const saved = scrollBySheet.current.get(sheet.id) ?? { top: 0, left: 0 };
    v.scrollTop = saved.top;
    v.scrollLeft = saved.left;
    measureWindow();
  }, [sheet.id, measureWindow]);

  // La celda activa se pinta siempre (aria-activedescendant debe existir), aunque esté fuera de la ventana.
  const stored = useSheetsInteraction(useCallback((st, c) => st.selections[c.sheet.id]?.active ?? null, []));
  const active = stored ?? ORIGIN;
  const activeRow = active.row;
  const activeCol = active.column;
  const rowList = useMemo(() => {
    const list: number[] = [];
    for (let r = win.r0; r <= Math.min(win.r1, sheet.rows - 1); r++) list.push(r);
    if (activeRow < sheet.rows && (activeRow < win.r0 || activeRow > win.r1)) list.push(activeRow);
    return list;
  }, [win.r0, win.r1, sheet.rows, activeRow]);
  const colList = useMemo(() => {
    const list: number[] = [];
    for (let c = win.c0; c <= Math.min(win.c1, sheet.columns - 1); c++) list.push(c);
    if (activeCol < sheet.columns && (activeCol < win.c0 || activeCol > win.c1)) list.push(activeCol);
    return list;
  }, [win.c0, win.c1, sheet.columns, activeCol]);

  // ---- Teclado --------------------------------------------------------------
  const pageRows = () => Math.max(1, Math.floor((viewport.current?.clientHeight ?? 300) / ROW_H) - 1);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return; // el editor tiene su propio teclado
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key;
    const arrows: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (arrows[k]) { e.preventDefault(); sheets.move(arrows[k]![0], arrows[k]![1], { extend: e.shiftKey, jump: mod }); return; }
    if (k === 'Tab') { e.preventDefault(); sheets.step(e.shiftKey ? 'prev-column' : 'next-column'); return; }
    if (k === 'Enter') { e.preventDefault(); if (e.shiftKey) sheets.step('prev-row'); else if (!sheets.readOnly) sheets.startEdit('cell'); return; }
    if (k === 'F2') { e.preventDefault(); sheets.startEdit('cell'); return; }
    if (k === 'PageDown' || k === 'PageUp') { e.preventDefault(); sheets.move(k === 'PageDown' ? pageRows() : -pageRows(), 0, { extend: e.shiftKey }); return; }
    if (k === 'Home') { e.preventDefault(); const s = sheets.selection(); sheets.move(mod ? -s.active.row : 0, -s.active.column, { extend: e.shiftKey }); return; }
    if (k === 'End') { e.preventDefault(); const s = sheets.selection(); sheets.move(mod ? sheet.rows - 1 - s.active.row : 0, sheet.columns - 1 - s.active.column, { extend: e.shiftKey }); return; }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); sheets.clear(); return; }
    if (mod && k.toLowerCase() === 'a') { e.preventDefault(); sheets.selectAll(); return; }
    if (mod && k.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) sheets.redo(); else sheets.undo(); return; }
    if (mod && k.toLowerCase() === 'y') { e.preventDefault(); sheets.redo(); return; }
    if (k === 'Escape') { const s = sheets.selection(); sheets.select({ anchor: s.active, extent: s.active, active: s.active }); return; }
    // Una tecla imprimible empieza a escribir en la celda activa, sustituyendo su contenido.
    if (!mod && !e.altKey && k.length === 1 && !sheets.readOnly) { e.preventDefault(); sheets.startEdit('cell', k); }
  };

  // La celda activa siempre a la vista al moverse con teclado (desplazamiento nativo, instantáneo).
  useEffect(() => {
    const v = viewport.current;
    if (!v || !stored) return;
    const { rows: ra, cols: ca, W: w } = axes.current;
    const top = HEAD_H + ra.offsetOf(active.row), bottom = top + ra.sizeOf(active.row);
    const left = w + ca.offsetOf(active.column), right = left + ca.sizeOf(active.column);
    if (top - HEAD_H < v.scrollTop) v.scrollTop = top - HEAD_H;
    else if (bottom > v.scrollTop + v.clientHeight) v.scrollTop = bottom - v.clientHeight;
    if (left - w < v.scrollLeft) v.scrollLeft = left - w;
    else if (right > v.scrollLeft + v.clientWidth) v.scrollLeft = right - v.clientWidth;
  }, [stored]);

  // ---- Puntero --------------------------------------------------------------
  const drag = useRef<null | { kind: 'select' | 'fill'; start: { row: number; column: number } }>(null);
  const [fillPreview, setFillPreview] = useState<CellRange | null>(null);
  const cellAt = (clientX: number, clientY: number) => {
    const el = content.current!;
    const r = el.getBoundingClientRect();
    const k = r.width / (el.offsetWidth || 1) || 1;
    const x = (clientX - r.left) / k - axes.current.W;
    const y = (clientY - r.top) / k - HEAD_H;
    return { row: axes.current.rows.indexAt(Math.max(0, y)), column: axes.current.cols.indexAt(Math.max(0, x)), header: { row: y < 0, column: x < 0 } };
  };
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('.nx-sheet__resize, .nx-sheet__editor')) return;
    const fill = t.closest('.nx-sheet__fill');
    const hit = cellAt(e.clientX, e.clientY);
    const s = sheets.selection();
    if (sheets.store.get().editing) sheets.commitEdit('stay');
    viewport.current?.focus({ preventScroll: true });
    if (fill) {
      drag.current = { kind: 'fill', start: s.active };
    } else if (hit.header.row && hit.header.column) {
      sheets.selectAll();
      return;
    } else if (hit.header.row) {
      sheets.select(e.shiftKey ? { ...s, anchor: { row: 0, column: s.anchor.column }, extent: { row: sheet.rows - 1, column: hit.column } } : { anchor: { row: 0, column: hit.column }, extent: { row: sheet.rows - 1, column: hit.column }, active: { row: 0, column: hit.column } });
      return;
    } else if (hit.header.column) {
      sheets.select(e.shiftKey ? { ...s, anchor: { row: s.anchor.row, column: 0 }, extent: { row: hit.row, column: sheet.columns - 1 } } : { anchor: { row: hit.row, column: 0 }, extent: { row: hit.row, column: sheet.columns - 1 }, active: { row: hit.row, column: 0 } });
      return;
    } else {
      const at = { row: hit.row, column: hit.column };
      sheets.select(e.shiftKey ? { ...s, extent: at } : { anchor: at, extent: at, active: at });
      drag.current = { kind: 'select', start: at };
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const hit = cellAt(e.clientX, e.clientY);
    const at = { row: hit.row, column: hit.column };
    const s = sheets.selection();
    if (d.kind === 'select') {
      if (s.extent.row !== at.row || s.extent.column !== at.column) sheets.select({ ...s, extent: at });
    } else {
      const target = fillTarget(selectionRange(s), at);
      setFillPreview((old) => (old && rangeKey(old) === rangeKey(target) ? old : target));
    }
  };
  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.kind === 'fill' && fillPreview) {
      if (rangeKey(fillPreview) !== rangeKey(selectionRange(sheets.selection()))) sheets.fill(fillPreview);
    }
    setFillPreview(null);
  };

  // ---- NexScroll: un tracker por eje sobre el mismo desplazamiento -----------
  const vLane = useRef<HTMLDivElement>(null);
  const hLane = useRef<HTMLDivElement>(null);
  const vThumb = useRef<SVGPathElement>(null);
  const hThumb = useRef<SVGPathElement>(null);
  const trackers = useRef<ScrollTracker[]>([]);
  const animateRef = useRef(animate);
  animateRef.current = animate;
  const [railsReady, setRailsReady] = useState(false);
  useLayoutEffect(() => {
    const v = viewport.current;
    if (!v) return;
    const make = (orientation: 'vertical' | 'horizontal', lane: HTMLDivElement, thumb: SVGPathElement) => {
      const t = new ScrollTracker(v, { orientation, crossAxisFallback: false, deformation: 0.5, animate: () => animateRef.current });
      t.setParts({ root: lane, track: lane.querySelector<HTMLElement>('.nx-scroll__rail'), thumb });
      return t;
    };
    trackers.current = [make('vertical', vLane.current!, vThumb.current!), make('horizontal', hLane.current!, hThumb.current!)];
    setRailsReady(true);
    return () => { for (const t of trackers.current) t.dispose(); trackers.current = []; };
  }, []);
  useLayoutEffect(() => { for (const t of trackers.current) t.refresh(); }, [rows.total, cols.total, sheet.id]);
  const railHandlers = (index: number, orientation: 'vertical' | 'horizontal') => {
    let dragging = false;
    const axis = (e: { clientX: number; clientY: number }) => (orientation === 'vertical' ? e.clientY : e.clientX);
    return {
      onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
        const t = trackers.current[index];
        if (!t || e.button !== 0) return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        const local = orientation === 'vertical' ? e.clientY - r.top : e.clientX - r.left;
        const g = t.geometry();
        if (local < g.start || local > g.start + g.length) t.jumpToTrack(axis(e));
        e.currentTarget.setPointerCapture?.(e.pointerId);
        dragging = true;
        t.beginDrag(axis(e));
      },
      onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => { if (dragging) trackers.current[index]?.dragTo(axis(e)); },
      onPointerUp: () => { dragging = false; trackers.current[index]?.endDrag(); },
      onPointerCancel: () => { dragging = false; trackers.current[index]?.endDrag(); },
      onPointerEnter: () => trackers.current[index]?.setInteracting(true),
      onPointerLeave: () => trackers.current[index]?.setInteracting(false),
    };
  };

  // ---- Columnas redimensionables (arrastre y teclado en el asa) ------------------
  const startResize = (column: number) => (e: ReactPointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = cols.sizeOf(column);
    const target = e.currentTarget;
    target.setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => setPreview({ column, width: Math.max(40, Math.min(640, startW + ev.clientX - startX)) });
    const up = (ev: PointerEvent) => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      setPreview(null);
      sheets.resizeColumn(column, startW + ev.clientX - startX);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  };

  const totalW = W + cols.total;
  const totalH = HEAD_H + rows.total;
  const values = sheets.values;
  return (
    <div className={cx('nx-sheet', className)} style={style} data-nx-rails={railsReady ? '' : undefined}>
      <div
        ref={viewport}
        className="nx-sheet__viewport"
        role="grid"
        aria-label={label ?? sheet.name}
        aria-rowcount={sheet.rows + 1}
        aria-colcount={sheet.columns + 1}
        aria-multiselectable="true"
        aria-readonly={sheets.readOnly || undefined}
        aria-activedescendant={`${baseId}-${active.row}-${active.column}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={(e) => { if (!(e.target as HTMLElement).closest('.nx-sheet__head, .nx-sheet__rowhead')) sheets.startEdit('cell'); }}
        onCopy={(e) => { if (e.target !== e.currentTarget) return; e.preventDefault(); e.clipboardData.setData('text/plain', sheets.copyText()); }}
        onCut={(e) => { if (e.target !== e.currentTarget) return; e.preventDefault(); e.clipboardData.setData('text/plain', sheets.copyText()); sheets.clear(); }}
        onPaste={(e) => { if (e.target !== e.currentTarget) return; e.preventDefault(); sheets.paste(e.clipboardData.getData('text/plain')); }}
      >
        <div ref={content} className="nx-sheet__content" data-sheet={sheet.id} style={{ width: totalW, height: totalH, '--nx-sheet-rowhead': `${W}px` } as CSSProperties}>
          <div className="nx-sheet__headrow" role="row" aria-rowindex={1} style={{ width: totalW }}>
            <div className="nx-sheet__corner" role="columnheader" aria-colindex={1}><span className="nx-visually-hidden">Filas</span></div>
            {colList.map((c) => (
              <div key={c} className="nx-sheet__head" role="columnheader" aria-colindex={c + 2} style={{ left: W + cols.offsetOf(c), width: cols.sizeOf(c) }}>
                {sheet.headers?.[c] ? <><span>{columnName(c)}</span><span className="nx-sheet__head-name">{sheet.headers[c]}</span></> : columnName(c)}
                <span className="nx-sheet__resize" aria-hidden="true" onPointerDown={startResize(c)} />
              </div>
            ))}
          </div>
          {rowList.map((r) => (
            <SheetRow key={r} row={r} cols={colList} rowsAxis={rows} colsAxis={cols} W={W} sheet={sheet} values={values} baseId={baseId} />
          ))}
          <SelectionSurface rows={rows} cols={cols} W={W} animate={animate} fillPreview={fillPreview} />
          <CellEditor rows={rows} cols={cols} W={W} />
        </div>
      </div>
      <div ref={vLane} className="nx-sheet__lane nx-sheet__lane--v" aria-hidden="true">
        <div className="nx-scroll__rail" {...railHandlers(0, 'vertical')}>
          <svg className="nx-scroll__thumb" focusable="false"><path ref={vThumb} className="nx-scroll__thumb-shape" /></svg>
        </div>
      </div>
      <div ref={hLane} className="nx-sheet__lane nx-sheet__lane--h" aria-hidden="true">
        <div className="nx-scroll__rail" {...railHandlers(1, 'horizontal')}>
          <svg className="nx-scroll__thumb" focusable="false"><path ref={hThumb} className="nx-scroll__thumb-shape" /></svg>
        </div>
      </div>
    </div>
  );
}

const rangeKey = (r: CellRange) => `${r.from.row}:${r.from.column}:${r.to.row}:${r.to.column}`;

interface RowProps { row: number; cols: number[]; rowsAxis: Axis; colsAxis: Axis; W: number; sheet: Sheet; values: ReadonlyMap<string, CellValue>; baseId: string }

/** Una fila visible. Sólo se vuelve a pintar si cambian sus datos, la ventana o los ejes. */
const SheetRow = memo(function SheetRow({ row, cols, rowsAxis, colsAxis, W, sheet, values, baseId }: RowProps) {
  return (
    <div className="nx-sheet__row" role="row" aria-rowindex={row + 2} style={{ top: HEAD_H + rowsAxis.offsetOf(row), height: rowsAxis.sizeOf(row), width: W + colsAxis.total }}>
      <div className="nx-sheet__rowhead" role="rowheader" aria-colindex={1}>{row + 1}</div>
      {cols.map((c) => {
        const key = cellKey(row, c);
        const input = sheet.cells[key]?.input ?? '';
        const value = values.get(key) ?? null;
        const error = isFormulaError(value);
        return (
          <div
            key={c}
            id={`${baseId}-${row}-${c}`}
            role="gridcell"
            aria-colindex={c + 2}
            className="nx-sheet__cell"
            data-kind={error ? 'error' : typeof value === 'number' ? 'number' : value === null ? 'empty' : 'text'}
            data-formula={isFormula(input) ? '' : undefined}
            style={{ left: W + colsAxis.offsetOf(c), width: colsAxis.sizeOf(c) }}
          >
            {error ? String(value) : formatValue(value)}
          </div>
        );
      })}
    </div>
  );
});

/**
 * El contorno de la selección: una superficie que viaja entre celdas. Cada
 * borde es un resorte: el que avanza responde antes (precision) y el
 * contrario le sigue (flow), así el contorno se estira un instante en la
 * dirección del movimiento y se recoge al llegar. El rango real se pinta
 * siempre al final; con movimiento reducido, salta.
 */
function SelectionSurface({ rows, cols, W, animate, fillPreview }: { rows: Axis; cols: Axis; W: number; animate: boolean; fillPreview: CellRange | null }) {
  const sheets = useNexSheets();
  const selection = useSheetsInteraction(useCallback((st, c) => st.selections[c.sheet.id] ?? null, []));
  const editing = useSheetsInteraction(useCallback((st) => st.editing !== null, []));
  const box = useRef<HTMLDivElement>(null);
  const cell = useRef<HTMLDivElement>(null);
  const sel = selection ?? { anchor: { row: 0, column: 0 }, extent: { row: 0, column: 0 }, active: { row: 0, column: 0 } };
  const range = selectionRange(sel);
  const rect = (r: CellRange) => [W + cols.offsetOf(r.from.column), HEAD_H + rows.offsetOf(r.from.row), W + cols.offsetOf(r.to.column + 1), HEAD_H + rows.offsetOf(r.to.row + 1)];
  const paint = (el: HTMLDivElement | null, [l, t, r, b]: number[]) => {
    if (!el) return;
    el.style.transform = `translate(${l!.toFixed(1)}px, ${t!.toFixed(1)}px)`;
    el.style.width = `${Math.max(0, r! - l!).toFixed(1)}px`;
    el.style.height = `${Math.max(0, b! - t!).toFixed(1)}px`;
  };
  const target = rect(range);
  const activeTarget = rect({ from: sel.active, to: sel.active });
  const boxSprings = useSprings(target, (v) => paint(box.current, v), 0.3);
  const cellSprings = useSprings(activeTarget, (v) => paint(cell.current, v), 0.3);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current || !animate) {
      first.current = false;
      boxSprings.jump(target);
      cellSprings.jump(activeTarget);
      return;
    }
    const lead: SpringPreset = morphSpring('precision');
    const trail: SpringPreset = morphSpring('flow');
    const [l0, t0, r0, b0] = boxSprings.values();
    // Borde que avanza: precisión; borde que sigue: un poco de viscosidad.
    const presets = [target[0]! < l0! ? lead : trail, target[1]! < t0! ? lead : trail, target[2]! > r0! ? lead : trail, target[3]! > b0! ? lead : trail];
    boxSprings.to(target, presets);
    cellSprings.to(activeTarget, [lead, lead, lead, lead]);
  }, [target.join(','), activeTarget.join(','), animate]); // eslint-disable-line react-hooks/exhaustive-deps
  const multiple = range.from.row !== range.to.row || range.from.column !== range.to.column;
  return (
    <>
      <div ref={box} className="nx-sheet__selection" data-multiple={multiple ? '' : undefined} aria-hidden="true">
        {!sheets.readOnly && !editing && <span className="nx-sheet__fill" title="Rellenar" />}
      </div>
      <div ref={cell} className="nx-sheet__active" data-editing={editing ? '' : undefined} aria-hidden="true" />
      {fillPreview && (() => {
        const [l, t, r, b] = rect(fillPreview);
        return <div className="nx-sheet__fill-preview" aria-hidden="true" style={{ transform: `translate(${l}px, ${t}px)`, width: r! - l!, height: b! - t! }} />;
      })()}
    </>
  );
}

/** El editor en celda. Comparte el borrador con la barra de fórmulas; sólo existe cuando se escribe AQUÍ. */
function CellEditor({ rows, cols, W }: { rows: Axis; cols: Axis; W: number }) {
  const sheets = useNexSheets();
  const editing = useSheetsInteraction(useCallback((st, c) => (st.editing && st.editing.sheet === c.sheet.id ? st.editing : null), []));
  const input = useRef<HTMLInputElement>(null);
  const isCell = editing?.origin === 'cell';
  useLayoutEffect(() => {
    if (!isCell || !input.current) return;
    input.current.focus({ preventScroll: true });
    const n = input.current.value.length;
    input.current.setSelectionRange(n, n);
  }, [isCell, editing?.address.row, editing?.address.column]);
  if (!editing) return null;
  const { row, column } = editing.address;
  const left = W + cols.offsetOf(column), top = HEAD_H + rows.offsetOf(row);
  const style = { transform: `translate(${left}px, ${top}px)`, minWidth: cols.sizeOf(column), height: rows.sizeOf(row) };
  if (!isCell) return <div className="nx-sheet__editor" data-preview="" style={style} aria-hidden="true">{editing.draft}</div>;
  const back = () => input.current?.closest<HTMLElement>('.nx-sheet__viewport')?.focus({ preventScroll: true });
  return (
    <input
      ref={input}
      className="nx-sheet__editor"
      style={{ ...style, width: Math.max(cols.sizeOf(column), editing.draft.length * 8 + 24) }}
      value={editing.draft}
      aria-label={`Editar ${columnName(column)}${row + 1}`}
      spellCheck={false}
      onChange={(e) => sheets.setDraft(e.target.value)}
      onBlur={() => { if (sheets.store.get().editing?.origin === 'cell') sheets.commitEdit('stay'); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); sheets.commitEdit(e.shiftKey ? 'prev-row' : 'next-row'); back(); }
        else if (e.key === 'Tab') { e.preventDefault(); sheets.commitEdit(e.shiftKey ? 'prev-column' : 'next-column'); back(); }
        else if (e.key === 'Escape') { e.preventDefault(); sheets.cancelEdit(); back(); }
      }}
    />
  );
}

