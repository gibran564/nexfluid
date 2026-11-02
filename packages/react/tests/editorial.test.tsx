import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NexCommandMenu, NexFlow, NexEditorialBlock, NexMenu, NexProvider, useNexFlow, type NexFlowMode, type NexMenuItem,
} from '@eclipsis/react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const $$ = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)];
const key = (el: Element, k: string) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
const pointer = (el: EventTarget, type: string, init: { clientY?: number; button?: number; isPrimary?: boolean } = {}) => act(() => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: init.button ?? 0, clientY: init.clientY ?? 0 });
  Object.defineProperty(event, 'isPrimary', { value: init.isPrimary ?? true });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  el.dispatchEvent(event);
});
async function violations() {
  const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

const items = (log: string[]): NexMenuItem[] => [
  { id: 'md', label: 'Texto', hint: 'Markdown', group: 'Escribir', onSelect: () => log.push('md') },
  { id: 'code', label: 'Código', hint: 'Python, R…', group: 'Programar', onSelect: () => log.push('code') },
  { id: 'img', label: 'Imagen', group: 'Datos', disabled: true, onSelect: () => log.push('img') },
  { id: 'sheet', label: 'Hoja de cálculo', group: 'Datos', onSelect: () => log.push('sheet') },
];

describe('NexMenu', () => {
  it('menu button: nombre, aria-expanded y foco en la primera acción al abrir', async () => {
    act(() => root.render(<NexMenu label="Acciones del bloque 1" items={items([])} />));
    const trigger = $<HTMLButtonElement>('.nx-menu__trigger');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-label')).toBe('Acciones del bloque 1');
    act(() => trigger.click());
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect($('[role="menu"]').getAttribute('aria-label')).toBe('Acciones del bloque 1');
    expect(document.activeElement?.textContent).toContain('Texto');
    expect(await violations()).toEqual([]);
  });

  it('↓ salta las deshabilitadas y da la vuelta; ↑ en el disparador abre en la última', () => {
    act(() => root.render(<NexMenu label="Insertar" items={items([])} />));
    const trigger = $<HTMLButtonElement>('.nx-menu__trigger');
    key(trigger, 'ArrowUp');
    expect(document.activeElement?.textContent).toContain('Hoja de cálculo');
    key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement?.textContent).toContain('Texto');
    key(document.activeElement!, 'ArrowDown');
    key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement?.textContent).toContain('Hoja de cálculo');
  });

  it('Intro elige: cierra, devuelve el foco y DESPUÉS ejecuta', () => {
    const log: string[] = [];
    let focusAtSelect: Element | null = null;
    const list = items(log).map((i) => (i.id === 'code' ? { ...i, onSelect: () => { focusAtSelect = document.activeElement; log.push('code'); } } : i));
    act(() => root.render(<NexMenu label="Insertar" items={list} />));
    const trigger = $<HTMLButtonElement>('.nx-menu__trigger');
    act(() => trigger.click());
    key(document.activeElement!, 'ArrowDown');
    key(document.activeElement!, 'Enter');
    expect(log).toEqual(['code']);
    expect(focusAtSelect).toBe(trigger);
    expect($('[role="menu"]')).toBeNull();
  });

  it('Escape cierra sin propagarse; una deshabilitada no se ejecuta', () => {
    const log: string[] = [];
    const outer = vi.fn();
    act(() => root.render(<div onKeyDown={outer}><NexMenu label="Insertar" items={items(log)} /></div>));
    act(() => $<HTMLButtonElement>('.nx-menu__trigger').click());
    act(() => $<HTMLElement>('[data-nx-index="2"]').click());
    expect(log).toEqual([]);
    key(document.activeElement!, 'Escape');
    expect(outer).not.toHaveBeenCalled();
    expect($('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe($('.nx-menu__trigger'));
  });

  it('una letra salta a la acción que empieza así; pulsar fuera cierra', () => {
    act(() => root.render(<NexMenu label="Insertar" items={items([])} />));
    act(() => $<HTMLButtonElement>('.nx-menu__trigger').click());
    key(document.activeElement!, 'h');
    expect(document.activeElement?.textContent).toContain('Hoja de cálculo');
    pointer(document.body, 'pointerdown');
    expect($('[role="menu"]')).toBeNull();
  });

  it('grupos con nombre e interruptores con aria-checked', () => {
    act(() => root.render(<NexMenu label="Vista" defaultOpen items={[
      { id: 'a', label: 'Compacta', group: 'Salida', checked: true, onSelect: () => {} },
      { id: 'b', label: 'Amplia', group: 'Salida', checked: false, onSelect: () => {} },
    ]} />));
    const group = $('[role="group"]');
    expect(document.getElementById(group.getAttribute('aria-labelledby')!)?.textContent).toBe('Salida');
    expect($$('[role="menuitemcheckbox"]').map((el) => el.getAttribute('aria-checked'))).toEqual(['true', 'false']);
  });
});

describe('NexMenu · orden agrupado', () => {
  it('las flechas recorren las acciones en el orden en que se ven (agrupadas)', () => {
    act(() => root.render(<NexMenu label="Mezcla" items={[
      { id: 'a', label: 'Alfa', group: 'Uno', onSelect: () => {} },
      { id: 'b', label: 'Beta', group: 'Dos', onSelect: () => {} },
      { id: 'c', label: 'Gamma', group: 'Uno', onSelect: () => {} },
    ]} />));
    act(() => $<HTMLButtonElement>('.nx-menu__trigger').click());
    expect(document.activeElement?.textContent).toContain('Alfa');
    key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement?.textContent).toContain('Gamma');
  });
});

describe('NexCommandMenu', () => {
  function Palette({ log, onClose }: { log: string[]; onClose: (r: string) => void }) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    return (
      <>
        <p ref={setAnchor} tabIndex={-1}>línea</p>
        <NexCommandMenu open anchor={anchor} label="Insertar" items={items(log)} onClose={onClose} />
      </>
    );
  }
  it('el foco va a la búsqueda; filtrar sin diacríticos; ↓ e Intro eligen sin sacar el foco del campo', async () => {
    const log: string[] = [];
    const closed: string[] = [];
    act(() => root.render(<Palette log={log} onClose={(r) => closed.push(r)} />));
    const input = $<HTMLInputElement>('.nx-cmd__search');
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('role')).toBe('combobox');
    act(() => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!; set.call(input, 'codigo'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    expect($$('[role="option"]').map((o) => o.textContent)).toEqual(['CódigoPython, R…']);
    expect(input.getAttribute('aria-activedescendant')).toBe($('[role="option"]').id);
    key(input, 'Enter');
    expect(closed).toEqual(['select']);
    expect(log).toEqual(['code']);
  });
  it('las deshabilitadas no se ofrecen; Escape o Retroceso con el filtro vacío descartan', () => {
    const closed: string[] = [];
    act(() => root.render(<Palette log={[]} onClose={(r) => closed.push(r)} />));
    expect($$('[role="option"]').some((o) => o.textContent?.includes('Imagen'))).toBe(false);
    key($('.nx-cmd__search'), 'Backspace');
    expect(closed).toEqual(['dismiss']);
    expect(document.activeElement?.tagName).toBe('P');
  });
});

interface Para { id: string; text: string }

/** Una aplicación mínima: el modelo es suyo; NexFlow sólo anuncia. */
function Doc({ mode = 'edit', onReorder, fixed, initial = ['a', 'b', 'c'] }: {
  mode?: NexFlowMode; onReorder?: (from: number, to: number) => void; fixed?: string[]; initial?: string[];
}) {
  const [doc, setDoc] = useState<Para[]>(initial.map((id) => ({ id, text: `Texto ${id}` })));
  const [selected, setSelected] = useState<string | null>(null);
  const insertItems = (at: number): NexMenuItem[] => [
    { id: 'p', label: 'Párrafo', onSelect: () => setDoc((d) => [...d.slice(0, at), { id: `n${at}`, text: 'Nuevo' }, ...d.slice(at)]) },
  ];
  return (
    <NexFlow mode={mode} selectedId={selected} onSelect={setSelected} insertItems={insertItems} aria-label="Documento"
      onReorder={(from, to) => {
        onReorder?.(from, to);
        setDoc((list) => { const next = [...list]; const [x] = next.splice(from, 1); next.splice(to, 0, x!); return next; });
      }}>
      {doc.map((p, i) => (
        <NexEditorialBlock key={p.id} blockId={p.id} label={`Párrafo ${i + 1}`} movable={!fixed?.includes(p.id)}
          actions={[{ id: 'del', label: 'Eliminar', tone: 'danger', onSelect: () => setDoc((d) => d.filter((x) => x.id !== p.id)) }]}
          tools={<button type="button">Herramienta {p.id}</button>}>
          <p><textarea aria-label={`Texto ${p.id}`} defaultValue={p.text} /></p>
        </NexEditorialBlock>
      ))}
    </NexFlow>
  );
}

const order = () => $$('[data-nx-flow-item]').map((el) => el.dataset.nxFlowItem);
const handle = (id: string) => document.querySelector<HTMLButtonElement>(`[data-nx-flow-item="${id}"] [data-nx-drag-handle]`);

describe('NexFlow · estructura invisible', () => {
  it('lectura: ningún control, ningún rol ni nombre por elemento; el documento es sólo contenido', async () => {
    act(() => root.render(<Doc mode="read" />));
    expect($$('button').length).toBe(0);
    expect($$('[data-nx-flow-item]').every((el) => !el.hasAttribute('role') && !el.hasAttribute('aria-label'))).toBe(true);
    pointer($('[data-nx-flow-item="b"] textarea'), 'pointerdown');
    expect($('[data-nx-selected]')).toBeNull();
    expect($('.nx-flow').classList.contains('nx-markdown')).toBe(true);
    expect(await violations()).toEqual([]);
  });

  it('edición: cada elemento es un grupo con nombre; seleccionar al pulsar o al enfocar revela sus herramientas', async () => {
    act(() => root.render(<Doc />));
    expect($('[data-nx-flow-item="a"]').getAttribute('role')).toBe('group');
    expect($('[data-nx-selected]')).toBeNull();
    pointer($('[data-nx-flow-item="b"] textarea'), 'pointerdown');
    expect($('[data-nx-flow-item="b"]').hasAttribute('data-nx-selected')).toBe(true);
    expect($('[data-nx-flow-item="b"] .nx-editorial-block__tools')?.textContent).toBe('Herramienta b');
    pointer(document, 'pointerup');
    await act(async () => { await Promise.resolve(); });
    act(() => $<HTMLTextAreaElement>('[data-nx-flow-item="c"] textarea').focus());
    expect($('[data-nx-selected]')?.dataset.nxFlowItem).toBe('c');
    expect(await violations()).toEqual([]);
  });

  it('cambiar de modo no desmonta el contenido (lo escrito sigue ahí)', () => {
    const { rerender } = { rerender: (m: NexFlowMode) => act(() => root.render(<Doc mode={m} />)) };
    rerender('edit');
    const area = $<HTMLTextAreaElement>('[data-nx-flow-item="a"] textarea');
    act(() => { area.value = 'sin guardar'; });
    rerender('read');
    rerender('edit');
    expect($<HTMLTextAreaElement>('[data-nx-flow-item="a"] textarea')).toBe(area);
    expect(area.value).toBe('sin guardar');
  });

  it('↓ en el asa reordena, conserva el foco y la identidad del nodo, y lo anuncia', () => {
    const moves: [number, number][] = [];
    act(() => root.render(<Doc onReorder={(f, t) => moves.push([f, t])} />));
    const area = $<HTMLTextAreaElement>('[data-nx-flow-item="a"] textarea');
    act(() => handle('a')!.focus());
    key(handle('a')!, 'ArrowDown');
    expect(moves).toEqual([[0, 1]]);
    expect(order()).toEqual(['b', 'a', 'c']);
    expect(document.activeElement).toBe(handle('a'));
    expect($<HTMLTextAreaElement>('[data-nx-flow-item="a"] textarea')).toBe(area);
    expect($('.nx-flow__page > [role="status"]').textContent).toBe('Párrafo 2: posición 2 de 3');
  });

  it('arrastrar desde el asa mueve al soltar; Escape cancela', () => {
    const moves: [number, number][] = [];
    act(() => root.render(<Doc onReorder={(f, t) => moves.push([f, t])} />));
    const rect = (top: number) => ({ top, bottom: top + 100, height: 100, left: 0, right: 300, width: 300, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
    const place = () => $$('[data-nx-flow-item]').forEach((el, i) => { el.getBoundingClientRect = () => rect(i * 120); });
    place();
    pointer(handle('a')!, 'pointerdown', { clientY: 50 });
    expect($('[data-nx-flow-item="a"]').hasAttribute('data-nx-dragging')).toBe(true);
    pointer(window, 'pointermove', { clientY: 200 });
    expect($('.nx-flow__drop')).not.toBeNull();
    pointer(window, 'pointerup', { clientY: 200 });
    expect(moves).toEqual([[0, 1]]);
    expect(order()).toEqual(['b', 'a', 'c']);

    place();
    pointer(handle('b')!, 'pointerdown', { clientY: 50 });
    pointer(window, 'pointermove', { clientY: 330 });
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
    pointer(window, 'pointerup', { clientY: 330 });
    expect(moves).toEqual([[0, 1]]);
    expect($('.nx-flow__drop')).toBeNull();
  });

  it('movable={false}: sin asa; los demás sí', () => {
    act(() => root.render(<Doc fixed={['a']} />));
    expect(handle('a')).toBeNull();
    expect(handle('b')).not.toBeNull();
  });

  it('no hay un insertador por elemento: el «+» del margen sólo existe para el seleccionado y abre la paleta en su hueco', () => {
    act(() => root.render(<Doc />));
    const visibleAdds = () => $$('.nx-editorial-block__gutter .nx-editorial-block__add').filter((b) => b.closest('[data-nx-selected]'));
    expect(visibleAdds()).toHaveLength(0);
    pointer($('[data-nx-flow-item="a"] textarea'), 'pointerdown');
    act(() => visibleAdds()[0]!.click());
    expect(document.activeElement).toBe($('.nx-cmd__search'));
    key($('.nx-cmd__search'), 'Enter');
    expect(order()).toEqual(['a', 'n1', 'b', 'c']);
    expect($('.nx-cmd')).toBeNull();
  });

  it('barra del pie: los mismos controles del seleccionado, con subir y bajar en lugar del asa', () => {
    const moves: [number, number][] = [];
    act(() => root.render(<Doc onReorder={(f, t) => moves.push([f, t])} />));
    expect($('.nx-flow__dockbar')).toBeNull();
    pointer($('[data-nx-flow-item="b"] textarea'), 'pointerdown');
    const bar = $('.nx-flow__dockbar');
    expect(bar.getAttribute('aria-label')).toBe('Herramientas de Párrafo 2');
    act(() => $$('.nx-flow__dockbar button').find((b) => b.getAttribute('aria-label') === 'Bajar Párrafo 2')!.click());
    expect(moves).toEqual([[1, 2]]);
    expect(order()).toEqual(['a', 'c', 'b']);
  });

  it('useNexFlow().openInsert abre la paleta desde el editor de la aplicación («/»)', () => {
    function Slash() {
      const flow = useNexFlow();
      return <button type="button" onClick={(e) => flow?.openInsert({ at: 0, anchor: e.currentTarget })}>barra</button>;
    }
    act(() => root.render(
      <NexFlow mode="edit" insertItems={() => [{ id: 'x', label: 'Párrafo', onSelect: () => {} }]}>
        <NexEditorialBlock blockId="a" label="Párrafo 1"><Slash /></NexEditorialBlock>
      </NexFlow>,
    ));
    act(() => $$('button').find((b) => b.textContent === 'barra')!.click());
    expect($('.nx-cmd')).not.toBeNull();
    expect($$('[role="option"]').map((o) => o.textContent)).toEqual(['Párrafo']);
  });

  it('el punto de inserción aparece sólo cerca de un hueco y nunca en lectura', () => {
    act(() => root.render(<Doc />));
    const rect = (top: number) => ({ top, bottom: top + 100, height: 100, left: 0, right: 300, width: 300, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
    $$('[data-nx-flow-item]').forEach((el, i) => { el.getBoundingClientRect = () => rect(i * 120); });
    const page = $('.nx-flow__page');
    const move = (y: number) => act(() => {
      const e = new MouseEvent('pointermove', { bubbles: true, clientY: y });
      Object.defineProperty(e, 'pointerType', { value: 'mouse' });
      page.dispatchEvent(e);
    });
    move(50);
    expect($('.nx-flow__insert')).toBeNull();
    move(110);
    expect($('.nx-flow__insert')).not.toBeNull();
    act(() => root.render(<Doc mode="read" />));
    expect($('.nx-flow__insert')).toBeNull();
  });
});

describe('NexFlow · movimiento editorial', () => {
  function Moving({ order, text = '' }: { order: string[]; text?: string }) {
    return (
      <NexFlow mode="edit" motion="fluid" onReorder={() => {}}>
        {order.map((id) => <NexEditorialBlock key={id} blockId={id} label={id}><p>{id}{text}</p></NexEditorialBlock>)}
      </NexFlow>
    );
  }
  const withAnimate = (run: (spy: ReturnType<typeof vi.fn>) => void) => {
    const spy = vi.fn();
    const original = HTMLElement.prototype.animate;
    HTMLElement.prototype.animate = spy as never;
    try { run(spy); } finally { HTMLElement.prototype.animate = original; }
  };

  it('cambio de estructura: FLIP de los que se mueven y emergencia de lo nuevo; escribir no anima nada', () => withAnimate((spy) => {
    act(() => root.render(<NexProvider reducedMotion="full"><Moving order={['a', 'b']} /></NexProvider>));
    $$('[data-nx-flow-item]').forEach((el) => { el.getBoundingClientRect = () => ({ top: el.dataset.nxFlowItem === 'a' ? 0 : 100 }) as DOMRect; });
    act(() => root.render(<NexProvider reducedMotion="full"><Moving order={['b', 'a', 'c']} /></NexProvider>));
    // b y a cambian de sitio (FLIP) y c emerge.
    expect(spy).toHaveBeenCalled();
    spy.mockClear();
    act(() => root.render(<NexProvider reducedMotion="full"><Moving order={['b', 'a', 'c']} text=" escrito" /></NexProvider>));
    expect(spy).not.toHaveBeenCalled();
  }));

  it('movimiento reducido: la estructura cambia en el acto', () => withAnimate((spy) => {
    act(() => root.render(<NexProvider reducedMotion="reduce"><Moving order={['a', 'b']} /></NexProvider>));
    act(() => root.render(<NexProvider reducedMotion="reduce"><Moving order={['b', 'a', 'c']} /></NexProvider>));
    expect(spy).not.toHaveBeenCalled();
  }));
});

describe('NexEditorialBlock · membrana y estados', () => {
  const RO = globalThis.ResizeObserver;
  beforeEach(() => { (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class { observe() {} disconnect() {} }; });
  afterEach(() => { (globalThis as { ResizeObserver?: unknown }).ResizeObserver = RO; });
  const enter = (el: Element, type: 'pointerover' | 'pointerout') => act(() => {
    const e = new MouseEvent(type, { bubbles: true, clientX: 5, clientY: 5 });
    el.dispatchEvent(e);
  });
  const svgs = () => $$('.nx-editorial-block > .nx-surface__shape').length;

  it('en reposo no hay membrana viva; aparece con el puntero o la selección y sólo en ese bloque', () => {
    act(() => root.render(<Doc />));
    expect(svgs()).toBe(0);
    enter($('[data-nx-flow-item="b"]'), 'pointerover');
    expect($('[data-nx-flow-item="b"]').dataset.nxState).toBe('attract');
    expect(svgs()).toBe(1);
    pointer($('[data-nx-flow-item="c"] textarea'), 'pointerdown');
    expect($('[data-nx-flow-item="c"] > .nx-surface__shape')).not.toBeNull();
  });

  it('en lectura no es interactivo: ni membrana ni estado al pasar el puntero', () => {
    act(() => root.render(<Doc mode="read" />));
    enter($('[data-nx-flow-item="b"]'), 'pointerover');
    expect($('[data-nx-flow-item="b"]').dataset.nxState).toBe('rest');
    expect(svgs()).toBe(0);
  });

  it('editar (foco dentro del seleccionado) calma la geometría; el foco dentro revela el contorno', () => {
    act(() => root.render(<Doc />));
    act(() => $<HTMLTextAreaElement>('[data-nx-flow-item="a"] textarea').focus());
    const a = $('[data-nx-flow-item="a"]');
    expect(a.dataset.nxBlockState).toBe('editing');
    expect(a.hasAttribute('data-nx-calm')).toBe(true);
    expect(a.dataset.nxState).toBe('attract');
  });

  it('ocupado, error y sólo lectura: estado explícito, ARIA y una marca que no es sólo color', () => {
    act(() => root.render(
      <NexFlow mode="edit">
        <NexEditorialBlock blockId="r" label="Código 1" busy><p>…</p></NexEditorialBlock>
        <NexEditorialBlock blockId="e" label="Código 2" error><p>…</p></NexEditorialBlock>
        <NexEditorialBlock blockId="o" label="Texto 3" readOnly><p>…</p></NexEditorialBlock>
      </NexFlow>,
    ));
    expect($('[data-nx-flow-item="r"]').dataset.nxBlockState).toBe('running');
    expect($('[data-nx-flow-item="r"]').getAttribute('aria-busy')).toBe('true');
    expect($('[data-nx-flow-item="e"]').dataset.nxBlockState).toBe('error');
    expect($('[data-nx-flow-item="e"]').getAttribute('aria-invalid')).toBe('true');
    expect($('[data-nx-flow-item="e"] .nx-editorial-block__mark')?.textContent).toBe('!');
    expect($('[data-nx-flow-item="o"]').dataset.nxBlockState).toBe('readonly');
  });

  it('presence="subtle" sólo se marca al editar; onFocusRequest añade «Expandir»', () => {
    const opened: string[] = [];
    const block = (mode: NexFlowMode) => (
      <NexFlow mode={mode}>
        <NexEditorialBlock blockId="c" label="Código 1" presence="subtle" onFocusRequest={() => opened.push('c')}><p>x</p></NexEditorialBlock>
      </NexFlow>
    );
    act(() => root.render(block('read')));
    expect($('[data-nx-flow-item="c"]').hasAttribute('data-nx-presence')).toBe(false);
    act(() => root.render(block('edit')));
    expect($('[data-nx-flow-item="c"]').dataset.nxPresence).toBe('subtle');
    act(() => $$('button').find((b) => b.getAttribute('aria-label') === 'Expandir Código 1')!.click());
    expect(opened).toEqual(['c']);
  });

  it('fuera de NexFlow funciona suelto con selected propio', async () => {
    act(() => root.render(<NexEditorialBlock blockId="x" label="Suelto" selected><p>texto</p></NexEditorialBlock>));
    expect($('[data-nx-flow-item="x"]').hasAttribute('data-nx-selected')).toBe(true);
    expect(await violations()).toEqual([]);
  });
});
