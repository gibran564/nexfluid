import { act, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NexInk, NexAnchoredLayer, matchesShortcut, type NexInkAdapter, type NexInkCommand, type NexInkState } from '@eclipsis/react';
import {
  NexMarkdownField, applyMarkdownCommand, createRichTextInkAdapter, createTextareaInkAdapter, markdownCommandState, renderRichText,
} from '@eclipsis/react/markdown';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const $$ = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)];
const key = (el: Element, k: string, init: KeyboardEventInit = {}) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })); });
const press = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true })); });
async function violations() {
  const r = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

function Demo({ log, nested = false, modal = false }: { log: string[]; nested?: boolean; modal?: boolean }) {
  const [open, setOpen] = useState(false);
  const [inner, setInner] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const innerAnchor = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={anchor} type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>Opciones</button>
      <button type="button">Fuera</button>
      <NexAnchoredLayer open={open} onOpenChange={(o, reason) => { log.push(`outer:${reason}`); setOpen(o); }} anchor={anchor} label="Opciones" modal={modal}>
        <button type="button">Primera</button>
        {nested && (
          <>
            <button ref={innerAnchor} type="button" onClick={() => setInner(true)}>Detalle</button>
            <NexAnchoredLayer open={inner} onOpenChange={(o, reason) => { log.push(`inner:${reason}`); setInner(o); }} anchor={innerAnchor} side="right" label="Detalle">
              <button type="button">Dentro</button>
            </NexAnchoredLayer>
          </>
        )}
      </NexAnchoredLayer>
    </>
  );
}

describe('NexAnchoredLayer', () => {
  it('no modal: diálogo con nombre, sin aria-modal; el foco entra y vuelve al ancla con Escape', async () => {
    const log: string[] = [];
    act(() => root.render(<Demo log={log} />));
    expect($$('.nx-anchored-layer')).toHaveLength(0);
    const trigger = $$('button').find((b) => b.textContent === 'Opciones')!;
    act(() => { trigger.focus(); trigger.click(); });
    const layer = $('.nx-anchored-layer');
    expect(layer.getAttribute('role')).toBe('dialog');
    expect(layer.getAttribute('aria-label')).toBe('Opciones');
    expect(layer.hasAttribute('aria-modal')).toBe(false);
    expect(document.activeElement?.textContent).toBe('Primera');
    expect(await violations()).toEqual([]);
    key(document.activeElement!, 'Escape');
    expect(log).toEqual(['outer:escape']);
    expect($$('.nx-anchored-layer')).toHaveLength(0);
    expect(document.activeElement).toBe(trigger);
  });

  it('clic fuera cierra; pulsar el ancla no cuenta como fuera', () => {
    const log: string[] = [];
    act(() => root.render(<Demo log={log} />));
    const trigger = $$('button').find((b) => b.textContent === 'Opciones')!;
    act(() => trigger.click());
    press(trigger);
    expect(log).toEqual([]);
    press($$('button').find((b) => b.textContent === 'Fuera')!);
    expect(log).toEqual(['outer:outside']);
  });

  it('capas anidadas: Escape cierra sólo la de arriba; un clic dentro de la hija no cierra la madre', () => {
    const log: string[] = [];
    act(() => root.render(<Demo log={log} nested />));
    act(() => $$('button').find((b) => b.textContent === 'Opciones')!.click());
    act(() => $$('button').find((b) => b.textContent === 'Detalle')!.click());
    expect($$('.nx-anchored-layer')).toHaveLength(2);
    press($$('button').find((b) => b.textContent === 'Dentro')!);
    expect(log).toEqual([]);
    key(document.body, 'Escape');
    expect(log).toEqual(['inner:escape']);
    expect($$('.nx-anchored-layer')).toHaveLength(1);
    key(document.body, 'Escape');
    expect(log).toEqual(['inner:escape', 'outer:escape']);
    expect($$('.nx-anchored-layer')).toHaveLength(0);
  });

  it('modal: un <dialog> (su rol es nativo) y Escape pasa por la misma pila', () => {
    const log: string[] = [];
    act(() => root.render(<Demo log={log} modal />));
    act(() => $$('button').find((b) => b.textContent === 'Opciones')!.click());
    const dialog = $('dialog.nx-anchored-layer');
    expect(dialog).toBeTruthy();
    expect(dialog.hasAttribute('role')).toBe(false);
    expect(dialog.hasAttribute('data-modal')).toBe(true);
    key(dialog, 'Escape');
    expect(log).toEqual(['outer:escape']);
  });

  it('dismiss configurable: sin Escape ni clic fuera, sigue abierta', () => {
    const log: string[] = [];
    function Sticky() {
      const a = useRef<HTMLButtonElement>(null);
      return (<><button ref={a} type="button">A</button>
        <NexAnchoredLayer open onOpenChange={(_, r) => log.push(r)} anchor={a} label="Fija" dismiss={{ escape: false, outside: false }} initialFocus="none"><p>Hola</p></NexAnchoredLayer></>);
    }
    act(() => root.render(<Sticky />));
    key(document.body, 'Escape');
    press(document.body);
    expect(log).toEqual([]);
    expect($('.nx-anchored-layer').textContent).toBe('Hola');
  });
});

// ---- NexInk con un adaptador de prueba (sin editor real: el contrato basta) ----------

type Cmd = 'bold' | 'italic' | 'link' | 'quote';
function fakeAdapter(log: string[], states: Partial<Record<Cmd, NexInkState>> = {}, collapsed = false) {
  const el = document.createElement('div');
  el.tabIndex = 0;
  document.body.append(el);
  let listener = () => {};
  const adapter: NexInkAdapter<Cmd> & { collapse(c: boolean): void } = {
    element: () => el,
    selection: () => ({ collapsed, anchor: { getBoundingClientRect: () => ({ left: 10, top: 10, width: 40, height: 16 }), contextElement: el } }),
    state: (c) => states[c] ?? false,
    run: (c, v) => log.push(v === undefined ? c : `${c}=${v}`),
    bookmark: () => 'mark',
    restore: (m) => log.push(`restore:${String(m)}`),
    subscribe: (l) => { listener = l; return () => { listener = () => {}; }; },
    collapse(c) { collapsed = c; act(() => listener()); },
  };
  return { adapter, el };
}
const COMMANDS: NexInkCommand<Cmd>[] = [
  { id: 'bold', label: 'Negrita', icon: 'B', shortcut: 'Mod+B' },
  { id: 'italic', label: 'Cursiva', icon: 'I' },
  { id: 'link', label: 'Enlace', icon: '↗', input: { label: 'Dirección del enlace' } },
  { id: 'quote', label: 'Cita', icon: '“', tier: 'more' },
];

describe('NexInk', () => {
  it('inline: barra con nombre, estados (incluido mixto) y comandos que ejecuta el adaptador', async () => {
    const log: string[] = [];
    const { adapter, el } = fakeAdapter(log, { bold: true, italic: 'mixed' });
    act(() => root.render(<NexInk adapter={adapter} commands={COMMANDS} presentation="inline" label="Formato" />));
    const bar = $('[role="toolbar"]');
    expect(bar.getAttribute('aria-label')).toBe('Formato');
    const [bold, italic] = $$('.nx-ink__cmd');
    expect(bold!.getAttribute('aria-pressed')).toBe('true');
    expect(italic!.getAttribute('aria-pressed')).toBe('mixed');
    expect(bold!.getAttribute('aria-keyshortcuts')).toMatch(/^(Control|Meta)\+B$/);
    act(() => bold!.click());
    expect(log).toEqual(['bold']);
    expect(await violations()).toEqual([]);
    el.remove();
  });

  it('teclado: una sola parada de Tab, flechas recorren, Escape vuelve al texto restaurando la selección', () => {
    const log: string[] = [];
    const { adapter, el } = fakeAdapter(log);
    act(() => root.render(<NexInk adapter={adapter} commands={COMMANDS} presentation="inline" />));
    const buttons = $$('.nx-ink__cmd');
    expect(buttons.filter((b) => b.tabIndex === 0)).toHaveLength(1);
    act(() => buttons[0]!.focus());
    key(buttons[0]!, 'ArrowRight');
    expect(document.activeElement).toBe(buttons[1]);
    key(buttons[1]!, 'End');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Más formatos');
    key(document.activeElement!, 'Escape');
    expect(log).toEqual(['restore:mark']);
    el.remove();
  });

  it('revelación progresiva: «Más» muestra el resto en su sitio (aria-expanded)', () => {
    const { adapter, el } = fakeAdapter([]);
    act(() => root.render(<NexInk adapter={adapter} commands={COMMANDS} presentation="inline" />));
    const more = $$('.nx-ink__cmd').find((b) => b.getAttribute('aria-label') === 'Más formatos')!;
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect($$('.nx-ink__cmd').some((b) => b.getAttribute('aria-label') === 'Cita')).toBe(false);
    act(() => more.click());
    expect($$('.nx-ink__cmd').some((b) => b.getAttribute('aria-label') === 'Cita')).toBe(true);
    expect($(`#${more.getAttribute('aria-controls')}`).getAttribute('role')).toBe('group');
    el.remove();
  });

  it('un comando con valor pide el dato, restaura la selección y lo ejecuta con él', () => {
    const log: string[] = [];
    const { adapter, el } = fakeAdapter(log);
    act(() => root.render(<NexInk adapter={adapter} commands={COMMANDS} presentation="inline" />));
    act(() => $$('.nx-ink__cmd').find((b) => b.getAttribute('aria-label') === 'Enlace')!.click());
    const input = $<HTMLInputElement>('input[aria-label="Dirección del enlace"]');
    expect(document.activeElement).toBe(input);
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'https://nex.org');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => input.form!.requestSubmit());
    expect(log).toEqual(['restore:mark', 'link=https://nex.org']);
    el.remove();
  });

  it('contextual: aparece con una selección, se va sin ella; Escape la despide; atajos sobre el editor', () => {
    const log: string[] = [];
    const { adapter, el } = fakeAdapter(log, {}, true);
    act(() => root.render(<NexInk adapter={adapter} commands={COMMANDS} />));
    expect($$('[role="toolbar"]')).toHaveLength(0);
    adapter.collapse(false);
    const layer = $('.nx-anchored-layer[role="toolbar"]');
    expect(layer.getAttribute('aria-label')).toBe('Formato');
    expect(layer.dataset.nxSurface).toBe('ink');
    key(el, 'b', { ctrlKey: !/Mac/.test(navigator.platform), metaKey: /Mac/.test(navigator.platform) });
    expect(log).toEqual(['bold']);
    key(el, 'Escape');
    expect($$('[role="toolbar"]')).toHaveLength(0);
    adapter.collapse(false); // otra selección: vuelve
    expect($$('[role="toolbar"]')).toHaveLength(1);
    adapter.collapse(true);
    expect($$('[role="toolbar"]')).toHaveLength(0);
    el.remove();
  });

  it('matchesShortcut distingue Mod, Shift y Alt', () => {
    const ev = (k: string, m: Partial<KeyboardEvent> = {}) => ({ key: k, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...m });
    expect(matchesShortcut(ev('b', { ctrlKey: true }), 'Mod+B', false)).toBe(true);
    expect(matchesShortcut(ev('b', { metaKey: true }), 'Mod+B', true)).toBe(true);
    expect(matchesShortcut(ev('B', { ctrlKey: true, shiftKey: true }), 'Mod+B', false)).toBe(false);
    expect(matchesShortcut(ev('x', { ctrlKey: true, shiftKey: true }), 'Mod+Shift+X', false)).toBe(true);
  });
});

describe('Comandos Markdown (texto puro)', () => {
  const apply = (text: string, s: number, e: number, c: Parameters<typeof applyMarkdownCommand>[3], url?: string) => applyMarkdownCommand(text, s, e, c, url);
  it('negrita y cursiva alternan sin confundirse (`*` frente a `**`)', () => {
    const on = apply('hola mundo', 5, 10, 'bold');
    expect(on).toEqual({ text: 'hola **mundo**', start: 7, end: 12 });
    expect(markdownCommandState(on.text, on.start, on.end, 'bold')).toBe(true);
    expect(markdownCommandState(on.text, on.start, on.end, 'italic')).toBe(false);
    expect(apply(on.text, on.start, on.end, 'bold')).toEqual({ text: 'hola mundo', start: 5, end: 10 });
    const both = apply(on.text, on.start, on.end, 'italic');
    expect(both.text).toBe('hola ***mundo***');
    expect(markdownCommandState(both.text, both.start, both.end, 'bold')).toBe(true);
    expect(markdownCommandState(both.text, both.start, both.end, 'italic')).toBe(true);
    // Con los delimitadores seleccionados también se reconocen.
    expect(apply('a **b** c', 2, 7, 'bold').text).toBe('a b c');
  });
  it('enlace: sólo URL seguras; repetir lo quita', () => {
    expect(apply('ver esto', 4, 8, 'link', 'javascript:alert(1)').text).toBe('ver [esto](https://)');
    const on = apply('ver esto', 4, 8, 'link', 'https://nex.org');
    expect(on.text).toBe('ver [esto](https://nex.org)');
    expect(markdownCommandState(on.text, on.start, on.end, 'link')).toBe(true);
    expect(apply(on.text, on.start, on.end, 'link').text).toBe('ver esto');
  });
  it('líneas: mixto, listas que se excluyen, título que sustituye a otro nivel', () => {
    const text = '- uno\ndos\n\ntres';
    expect(markdownCommandState(text, 0, 9, 'list')).toBe('mixed');
    expect(apply(text, 0, 9, 'list').text).toBe('- uno\n- dos\n\ntres');
    expect(apply('- uno\n- dos', 0, 11, 'ordered').text).toBe('1. uno\n2. dos');
    expect(apply('1. uno\n2. dos', 0, 13, 'ordered').text).toBe('uno\ndos');
    expect(apply('# Título', 2, 4, 'heading').text).toBe('Título');
    expect(apply('Título', 0, 6, 'heading').text).toBe('## Título');
    expect(apply('> cita', 0, 6, 'quote').text).toBe('cita');
  });
});

describe('Adaptadores Markdown', () => {
  it('textarea: el comando cambia el valor por el camino de onChange y deja seleccionado lo mismo', () => {
    const values: string[] = [];
    function Source() {
      const [v, setV] = useState('hola mundo');
      return <textarea aria-label="Fuente" value={v} onChange={(e) => { values.push(e.target.value); setV(e.target.value); }} />;
    }
    act(() => root.render(<Source />));
    const area = $<HTMLTextAreaElement>('textarea');
    const adapter = createTextareaInkAdapter(area);
    act(() => { area.focus(); area.setSelectionRange(5, 10); });
    expect(adapter.selection()?.collapsed).toBe(false);
    act(() => adapter.run('bold'));
    expect(values.at(-1)).toBe('hola **mundo**');
    expect(area.value.slice(area.selectionStart, area.selectionEnd)).toBe('mundo');
    expect(adapter.state('bold')).toBe(true);
  });

  it('visual: el estado se lee de los nodos del rango (activo, mixto, inactivo) y las islas no cuentan', () => {
    const el = document.createElement('div');
    el.contentEditable = 'true';
    document.body.append(el);
    renderRichText(el, 'uno **dos** tres\n\n| a |\n|---|\n| 1 |');
    const adapter = createRichTextInkAdapter(el);
    const strong = el.querySelector('strong')!;
    const p = el.querySelector('p')!;
    const select = (range: Range) => { el.focus(); const s = getSelection()!; s.removeAllRanges(); s.addRange(range); };
    const r = document.createRange();
    r.selectNodeContents(strong);
    select(r);
    expect(adapter.state('bold')).toBe(true);
    const all = document.createRange();
    all.selectNodeContents(p);
    select(all);
    expect(adapter.state('bold')).toBe('mixed');
    expect(adapter.state('italic')).toBe(false);
    const whole = document.createRange();
    whole.selectNodeContents(el);
    select(whole);
    expect(adapter.state('bold')).toBe('mixed'); // la tabla (isla) no se recorre
    el.remove();
  });
});

describe('NexMarkdownField · perspectivas', () => {
  it('Visual → Markdown → Vista → Visual conserva el valor byte a byte (tablas, fórmulas, código)', () => {
    const md = '# Plan\n\nTexto **fuerte** y $x^2$.\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```py\nx = 1\n```\n\n> [!NOTE]\n> Aviso';
    const seen: string[] = [];
    function Field() { const [v, setV] = useState(md); seen.push(v); return <NexMarkdownField label="Plan" value={v} onChange={setV} />; }
    act(() => root.render(<Field />));
    const go = (name: string) => act(() => { $$('[role="radio"]').find((r) => r.textContent === name)!.click(); });
    go('Markdown');
    expect($<HTMLTextAreaElement>('textarea').value).toBe(md);
    go('Vista');
    expect($('[role="document"]').querySelector('table')).toBeTruthy();
    expect($$('[role="textbox"]')).toHaveLength(0);
    go('Visual');
    expect($('[role="textbox"]').querySelector('strong')?.textContent).toBe('fuerte');
    expect(new Set(seen)).toEqual(new Set([md]));
  });
});
