import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NexProvider, NexScroll } from '@eclipsis/react';
import { NexSheets, cellKey, createWorkbook, sheetFromRows, type Workbook } from '@eclipsis/react/sheets';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});
const $ = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T>(sel)!;
const key = (el: Element, k: string, o: KeyboardEventInit = {}) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o })); });
const type = (el: HTMLInputElement, value: string) => act(() => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
const book = () => createWorkbook([sheetFromRows('Datos', [['a', 1], ['b', 2], ['Total', '=SUMA(B1:B2)']], { rows: 10, columns: 4 })]);

function mount(onChange?: (wb: Workbook) => void) {
  let latest = book();
  act(() => root.render(<NexProvider reducedMotion="reduce"><NexSheets defaultWorkbook={latest} onChange={(wb) => { latest = wb; onChange?.(wb); }} height={300} /></NexProvider>));
  return { get workbook() { return latest; } };
}

describe('NexSheets', () => {
  it('rejilla accesible con tamaño real, celda activa y encabezados', () => {
    mount();
    const grid = $('[role="grid"]');
    expect(grid.getAttribute('aria-rowcount')).toBe('11');
    expect(grid.getAttribute('aria-colcount')).toBe('5');
    expect(container.querySelectorAll('[role="columnheader"]').length).toBeGreaterThan(1);
    expect(container.querySelector('[role="rowheader"]')?.textContent).toBe('1');
    const activeId = grid.getAttribute('aria-activedescendant');
    expect(activeId && document.getElementById(activeId)).toBeTruthy();
    expect(document.getElementById(activeId!)!.textContent).toBe('a');
  });

  it('escribir edita, Intro confirma y baja, la fórmula se recalcula y el foco vuelve a la rejilla', () => {
    const state = mount();
    const grid = $('[role="grid"]');
    act(() => grid.focus());
    key(grid, 'ArrowRight');
    key(grid, '7');
    const editor = $<HTMLInputElement>('input.nx-sheet__editor');
    expect(editor.value).toBe('7');
    expect($<HTMLInputElement>('.nx-formula-bar__input').value).toBe('7'); // mismo borrador
    type(editor, '10');
    key(editor, 'Enter');
    expect(state.workbook.sheets[0]!.cells[cellKey(0, 1)]!.input).toBe('10');
    expect(container.querySelector('input.nx-sheet__editor')).toBeNull();
    expect(document.activeElement).toBe(grid);
    expect($('.nx-formula-bar__ref').textContent).toBe('B2');
    const total = Array.from(container.querySelectorAll('[role="gridcell"]')).find((c) => c.id.endsWith('-2-1'));
    expect(total?.textContent).toBe('12');
  });

  it('Escape cancela sin tocar los datos', () => {
    const state = mount();
    const grid = $('[role="grid"]');
    key(grid, 'x');
    key($('input.nx-sheet__editor'), 'Escape');
    expect(state.workbook.sheets[0]!.cells[cellKey(0, 0)]!.input).toBe('a');
  });

  it('pegar TSV, vaciar y deshacer/rehacer', () => {
    const state = mount();
    const grid = $('[role="grid"]');
    key(grid, 'ArrowDown', { ctrlKey: true });
    key(grid, 'ArrowDown');
    const data = { getData: () => 'x\ty\n3\t4', setData: () => {} };
    act(() => { const e = new Event('paste', { bubbles: true, cancelable: true }); Object.assign(e, { clipboardData: data }); grid.dispatchEvent(e); });
    const cells = () => state.workbook.sheets[0]!.cells;
    expect(cells()[cellKey(4, 1)]?.input).toBe('4');
    expect($('.nx-formula-bar__ref').textContent).toBe('A4:B5');
    key(grid, 'Delete');
    expect(cells()[cellKey(4, 1)]).toBeUndefined();
    key(grid, 'z', { ctrlKey: true });
    expect(cells()[cellKey(4, 1)]?.input).toBe('4');
    key(grid, 'y', { ctrlKey: true });
    expect(cells()[cellKey(4, 1)]).toBeUndefined();
    expect($('[role="status"].nx-sheet-status__notice').textContent).toContain('Rehecho');
  });

  it('Mayús + flechas forma un rango y la barra de estado lo resume', () => {
    mount();
    const grid = $('[role="grid"]');
    key(grid, 'ArrowRight');
    key(grid, 'ArrowDown', { shiftKey: true });
    expect($('.nx-formula-bar__ref').textContent).toBe('B1:B2');
    expect($('.nx-sheet-status').textContent).toContain('Suma 3');
  });

  it('las hojas conservan su selección al cambiar y se pueden añadir', () => {
    mount();
    const grid = $('[role="grid"]');
    key(grid, 'ArrowDown');
    act(() => $<HTMLButtonElement>('button[aria-label="Añadir hoja"]').click());
    expect(container.querySelectorAll('[role="radio"]')).toHaveLength(2);
    expect($('.nx-formula-bar__ref').textContent).toBe('A1');
    act(() => container.querySelectorAll<HTMLButtonElement>('[role="radio"]')[0]!.click());
    expect($('.nx-formula-bar__ref').textContent).toBe('A2');
  });

  it('sólo lectura: navega pero no edita', () => {
    act(() => root.render(<NexSheets defaultWorkbook={book()} readOnly height={300} />));
    const grid = $('[role="grid"]');
    key(grid, 'z');
    expect(container.querySelector('input.nx-sheet__editor')).toBeNull();
    expect(grid.getAttribute('aria-readonly')).toBe('true');
  });

  it('sin violaciones de axe', async () => {
    mount();
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
});

describe('NexScroll 2.0', () => {
  it('sin JS (servidor) la barra nativa no se oculta: no hay data-nx-scroll-ready', () => {
    const html = renderToString(<NexScroll.Area variant="editorial" label="Doc" sections={[{ id: 's1', label: 'Uno' }]}><p id="s1">x</p></NexScroll.Area>);
    expect(html).not.toContain('data-nx-scroll-ready');
    expect(html).toContain('nx-scroll__lane');
  });

  it('el carril es una columna propia y los marcadores son una navegación con nombre único', () => {
    act(() => root.render(
      <NexScroll.Area variant="editorial" label="Guía" sections={[{ id: 'g1', label: 'Uno' }, { id: 'g2', label: 'Dos' }]}>
        <h2 id="g1">Uno</h2><h2 id="g2">Dos</h2>
      </NexScroll.Area>,
    ));
    const lane = $('.nx-scroll__lane');
    expect(lane.parentElement).toBe($('.nx-scroll'));
    expect(lane.querySelector('.nx-scroll__rail')!.getAttribute('aria-hidden')).toBe('true');
    expect($('nav.nx-scroll__markers').getAttribute('aria-label')).toBe('Secciones: Guía');
    expect(container.querySelectorAll('.nx-scroll__marker button')).toHaveLength(2);
    expect($('.nx-scroll__chapter').getAttribute('aria-hidden')).toBe('true');
    expect($('[role="region"].nx-scroll__viewport').getAttribute('tabindex')).toBe('0');
  });

  it('un marcador lleva la sección al foco', () => {
    act(() => root.render(
      <NexScroll.Area variant="editorial" label="Guía" sections={[{ id: 'h1', label: 'Uno' }, { id: 'h2', label: 'Dos' }]}>
        <h2 id="h1">Uno</h2><h2 id="h2">Dos</h2>
      </NexScroll.Area>,
    ));
    act(() => container.querySelectorAll<HTMLButtonElement>('.nx-scroll__marker button')[1]!.click());
    expect(document.activeElement?.id).toBe('h2');
  });
});
