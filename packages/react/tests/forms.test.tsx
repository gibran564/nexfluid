import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NexCheckbox, NexInput, NexSelect, type NexSelectOption } from '@eclipsis/react';
import { NexMarkdown } from '@eclipsis/react/markdown';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
const $ = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T>(sel)!;
const key = (el: Element, k: string, o: KeyboardEventInit = {}) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o })); });
async function violations() {
  const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

const LANGS: NexSelectOption[] = [
  { value: 'python', label: 'Python', description: 'Ejecución local · Pyodide' },
  { value: 'r', label: 'R', description: 'Ejecución local · webR' },
  { value: 'cpp', label: 'C++', disabled: true },
  { value: 'java', label: 'Java', description: <>Java 17 · Powered by <img src="data:," alt="Motor" /></>, keywords: 'powered' },
];

describe('NexMarkdown · fórmulas', () => {
  it('$…$ en línea y $$…$$ en bloque con KaTeX (y MathML); un $ de precio es texto', () => {
    act(() => root.render(<NexMarkdown source={'Sea $x^2$ y\n\n$$\ny = 3\n$$\n\nCuesta $5 y luego $10.'} />));
    const inline = container.querySelectorAll('.katex:not(.katex-display .katex)');
    expect(container.querySelector('.katex-display')).not.toBeNull();
    expect(inline.length).toBeGreaterThanOrEqual(1);
    expect(container.querySelector('math')).not.toBeNull();
    expect(container.textContent).toContain('Cuesta $5 y luego $10.');
  });
  it('trust: false — \\href no produce enlaces; un error no rompe el bloque', () => {
    act(() => root.render(<NexMarkdown source={'$\\href{javascript:alert(1)}{x}$ y $\\frac{1}{$ fin'} />));
    expect(container.querySelector('a[href^="javascript"]')).toBeNull();
    expect(container.textContent).toContain('fin');
  });
  it('math={false} deja los $ como texto', () => {
    act(() => root.render(<NexMarkdown math={false} source={'$x$'} />));
    expect(container.querySelector('.katex')).toBeNull();
  });
});

describe('NexInput y NexCheckbox', () => {
  it('etiqueta, ayuda y error cableados', async () => {
    act(() => root.render(<NexInput label="Título" description="Ayuda" error="Vacío" defaultValue="" />));
    const input = $<HTMLInputElement>('input');
    expect(input.labels?.[0]?.textContent).toBe('Título');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')!.split(' ').map((id) => document.getElementById(id)!.textContent)).toEqual(['Ayuda', 'Vacío']);
    expect(await violations()).toEqual([]);
  });
  it('casilla nativa con estado mixto real', async () => {
    function Host() {
      const [on, setOn] = useState(false);
      return <NexCheckbox label="Todas" checked={on} indeterminate={!on} onChange={(e) => setOn(e.target.checked)} />;
    }
    act(() => root.render(<Host />));
    const box = $<HTMLInputElement>('input[type="checkbox"]');
    expect(box.indeterminate).toBe(true);
    act(() => box.click());
    expect(box.checked).toBe(true);
    expect(box.indeterminate).toBe(false);
    expect(await violations()).toEqual([]);
  });
});

describe('NexSelect', () => {
  function Host({ searchable }: { searchable?: boolean }) {
    const [v, setV] = useState<string | null>('python');
    return <><NexSelect label="Lenguaje" options={LANGS} value={v} onValueChange={setV} searchable={searchable} name="lang" /><output>{v}</output></>;
  }

  it('combobox: abre con ↓, salta las deshabilitadas, Intro elige y devuelve el foco', () => {
    act(() => root.render(<Host />));
    const trigger = $<HTMLButtonElement>('[role="combobox"]');
    act(() => trigger.focus());
    key(trigger, 'ArrowDown');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const list = $('[role="listbox"]');
    expect(trigger.getAttribute('aria-controls')).toBe(list.id);
    expect(document.getElementById(trigger.getAttribute('aria-activedescendant')!)!.textContent).toContain('Python');
    key(trigger, 'ArrowDown');
    key(trigger, 'ArrowDown'); // salta C++ (deshabilitada)
    expect(document.getElementById(trigger.getAttribute('aria-activedescendant')!)!.textContent).toContain('Java');
    key(trigger, 'Enter');
    expect($('output').textContent).toBe('java');
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect($<HTMLInputElement>('input[type="hidden"]').value).toBe('java');
  });

  it('Escape cierra sin cambiar; escribir salta por la inicial', () => {
    act(() => root.render(<Host />));
    const trigger = $<HTMLButtonElement>('[role="combobox"]');
    key(trigger, 'Enter');
    key(trigger, 'r');
    expect(document.getElementById(trigger.getAttribute('aria-activedescendant')!)!.textContent).toContain('R');
    key(trigger, 'Escape');
    expect($('output').textContent).toBe('python');
  });

  it('con búsqueda filtra por detalle y palabras clave, sin acentos', async () => {
    act(() => root.render(<Host searchable />));
    act(() => $<HTMLButtonElement>('[role="combobox"]').click());
    const search = $<HTMLInputElement>('input[aria-autocomplete="list"]');
    expect(document.activeElement).toBe(search);
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, 'webr');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(Array.from(container.querySelectorAll('[role="option"]')).map((o) => o.textContent)).toEqual([expect.stringContaining('R')]);
    expect(await violations()).toEqual([]);
    key(search, 'Enter');
    expect($('output').textContent).toBe('r');
  });

  it('opciones con imagen y detalle; sin violaciones de axe abierto', async () => {
    act(() => root.render(<Host />));
    act(() => $<HTMLButtonElement>('[role="combobox"]').click());
    expect(container.querySelector('[role="option"] img[alt="Motor"]')).not.toBeNull();
    expect(container.querySelector('[role="option"][aria-disabled="true"]')?.textContent).toContain('C++');
    expect(await violations()).toEqual([]);
  });
});
