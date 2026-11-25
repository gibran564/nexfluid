import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NexCheckbox, NexCombobox, NexInput, NexProvider, NexSelect, useNex, type NexComboboxOption, type NexComboboxProps, type NexSelectOption } from '@nexfluid/react';
import { NexMarkdown } from '@nexfluid/react/markdown';

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
  it('un clic en la membrana enfoca con el cursor al final; los controles de los adornos conservan su clic', () => {
    let borrado = 0;
    const ref = { current: null as HTMLInputElement | null };
    act(() => root.render(
      <NexInput ref={ref} label="Producto" defaultValue="blusa basica" leading="$"
        trailing={<button type="button" onClick={() => { borrado++; }}>Borrar</button>} />,
    ));
    const input = $<HTMLInputElement>('input');
    expect(ref.current).toBe(input);
    const down = (el: Element) => {
      const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, clientX: 999 });
      act(() => { el.dispatchEvent(e); });
      return e;
    };
    expect(down($('.nx-input')).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([12, 12]);
    act(() => input.blur());
    down($('.nx-input__adorn[data-side="leading"]'));
    expect(document.activeElement).toBe(input);
    act(() => input.blur());
    const boton = $('button');
    expect(down(boton).defaultPrevented).toBe(false);
    expect(document.activeElement).not.toBe(input);
    act(() => boton.click());
    expect(borrado).toBe(1);
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

  it('la gota vuelve a estar lista al reabrir (la lista es un elemento nuevo cada vez)', () => {
    act(() => root.render(<Host />));
    const trigger = $<HTMLButtonElement>('[role="combobox"]');
    for (let vez = 0; vez < 3; vez++) {
      act(() => trigger.click());
      const list = $('[role="listbox"]');
      expect(list.hasAttribute('data-nx-ready')).toBe(true);
      key(trigger, 'Escape');
      expect(container.querySelector('[role="listbox"]')).toBeNull();
    }
  });

  it('opciones con imagen y detalle; sin violaciones de axe abierto', async () => {
    act(() => root.render(<Host />));
    act(() => $<HTMLButtonElement>('[role="combobox"]').click());
    expect(container.querySelector('[role="option"] img[alt="Motor"]')).not.toBeNull();
    expect(container.querySelector('[role="option"][aria-disabled="true"]')?.textContent).toContain('C++');
    expect(await violations()).toEqual([]);
  });
});

describe('NexCombobox', () => {
  const PRODUCTOS: NexComboboxOption[] = [
    { value: '1', label: 'blusa básica' },
    { value: '2', label: 'blusa de licra' },
    { value: '3', label: 'mayón faja', description: '$200' },
    { value: '4', label: 'blusa agotada', disabled: true },
  ];
  const escribir = (el: HTMLInputElement, texto: string) => act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, texto);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const visibles = () => Array.from(container.querySelectorAll('[role="option"]')).map((o) => o.textContent);
  const activa = (input: HTMLInputElement) => document.getElementById(input.getAttribute('aria-activedescendant') ?? '')?.textContent ?? null;

  function Host(props: Partial<NexComboboxProps>) {
    const [v, setV] = useState('');
    const [elegida, setElegida] = useState('');
    const [teclas, setTeclas] = useState<string[]>([]);
    return (
      <>
        <NexCombobox label="Producto" options={PRODUCTOS} value={v} onValueChange={setV}
          onOptionSelect={(o) => setElegida(o.value)} onKeyDown={(e) => setTeclas((t) => [...t, e.key])} {...props} />
        <output id="valor">{v}</output><output id="elegida">{elegida}</output><output id="teclas">{teclas.join(',')}</output>
      </>
    );
  }

  it('tabSelects: Tab elige la activa (o la primera); sin él, cierra sin elegir', () => {
    act(() => root.render(<Host tabSelects />));
    const input = $<HTMLInputElement>('input[role="combobox"]');
    act(() => input.focus());
    escribir(input, 'blusa');
    key(input, 'ArrowDown');
    key(input, 'Tab');
    expect($('#elegida').textContent).toBe('2');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    escribir(input, 'faja');
    key(input, 'Tab');
    expect($('#elegida').textContent).toBe('3');
    act(() => root.render(<Host key="b" />));
    const otro = $<HTMLInputElement>('input[role="combobox"]');
    act(() => otro.focus());
    escribir(otro, 'blusa');
    key(otro, 'Tab');
    expect($('#elegida').textContent).toBe('');
    expect(otro.getAttribute('aria-expanded')).toBe('false');
  });

  it('escribir abre y filtra sin acentos; Intro elige la primera, cierra y no reabre', () => {
    act(() => root.render(<Host />));
    const input = $<HTMLInputElement>('input[role="combobox"]');
    act(() => input.focus());
    expect(input.getAttribute('aria-expanded')).toBe('false');
    escribir(input, 'basica');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(visibles()).toEqual(['blusa básica']);
    escribir(input, 'blusa');
    expect(visibles()).toEqual(['blusa básica', 'blusa de licra', 'blusa agotada']);
    expect(activa(input)).toBe('blusa básica');
    expect(input.getAttribute('aria-controls')).toBe($('[role="listbox"]').id);
    key(input, 'ArrowDown');
    expect(activa(input)).toBe('blusa de licra');
    key(input, 'ArrowDown'); // salta la deshabilitada y da la vuelta
    expect(activa(input)).toBe('blusa básica');
    key(input, 'ArrowUp');
    expect(activa(input)).toBe('blusa de licra');
    key(input, 'Enter');
    expect($('#valor').textContent).toBe('blusa de licra');
    expect($('#elegida').textContent).toBe('2');
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(document.activeElement).toBe(input);
    expect($('#teclas').textContent).toBe(''); // las teclas usadas no llegan a la aplicación
  });

  it('con la lista cerrada, Intro y Escape llegan a onKeyDown; Escape primero cierra', () => {
    act(() => root.render(<Host />));
    const input = $<HTMLInputElement>('input[role="combobox"]');
    act(() => input.focus());
    key(input, 'Enter');
    expect($('#teclas').textContent).toBe('Enter');
    escribir(input, 'faja');
    key(input, 'Escape');
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect($('#valor').textContent).toBe('faja'); // Escape no borra lo escrito
    expect($('#teclas').textContent).toBe('Enter');
    key(input, 'Escape');
    expect($('#teclas').textContent).toBe('Enter,Escape');
    key(input, 'ArrowDown'); // ↓ reabre
    expect(visibles()).toEqual(['mayón faja$200']);
    key(input, 'Tab'); // Tab cierra sin elegir
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect($('#elegida').textContent).toBe('');
  });

  it('texto libre: sin sugerencias se cierra, vaciar cierra, y emptyMessage avisa', () => {
    act(() => root.render(<Host />));
    const input = $<HTMLInputElement>('input[role="combobox"]');
    act(() => input.focus());
    escribir(input, 'pantalón');
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    key(input, 'Enter');
    expect($('#valor').textContent).toBe('pantalón');
    expect($('#teclas').textContent).toBe('Enter');
    escribir(input, 'blusa');
    escribir(input, '');
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    act(() => root.render(<Host emptyMessage="Producto nuevo" />));
    escribir(input, 'pantalón');
    expect($('[role="status"]').textContent).toBe('Producto nuevo');
  });

  it('filter={false} muestra las sugerencias tal cual; el puntero activa y el clic elige', () => {
    act(() => root.render(<Host filter={false} options={PRODUCTOS.slice(0, 2)} />));
    const input = $<HTMLInputElement>('input[role="combobox"]');
    act(() => input.focus());
    escribir(input, 'zzz');
    expect(visibles()).toEqual(['blusa básica', 'blusa de licra']);
    const [, segunda] = Array.from(container.querySelectorAll<HTMLElement>('[role="option"]'));
    act(() => { segunda!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true })); });
    expect(activa(input)).toBe('blusa de licra');
    const down = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
    act(() => { segunda!.dispatchEvent(down); });
    expect(down.defaultPrevented).toBe(true); // el foco no sale del campo
    act(() => segunda!.click());
    expect($('#valor').textContent).toBe('blusa de licra');
    expect(document.activeElement).toBe(input);
  });

  it('la gota está lista en cada apertura; sin violaciones de axe abierto', async () => {
    act(() => root.render(<Host />));
    const input = $<HTMLInputElement>('input[role="combobox"]');
    act(() => input.focus());
    for (let vez = 0; vez < 3; vez++) {
      escribir(input, vez % 2 ? 'blusa' : 'faja');
      expect($('[role="listbox"]').hasAttribute('data-nx-ready')).toBe(true);
      key(input, 'Escape');
    }
    escribir(input, 'blusa');
    expect(await violations()).toEqual([]);
  });
});

describe('NexProvider · liquid', () => {
  it('por defecto no declara forma (la gota es la original); se hereda y se puede volver a cambiar', () => {
    function Forma({ id }: { id: string }) {
      return <output id={id}>{useNex().liquid ?? 'original'}</output>;
    }
    act(() => root.render(
      <>
        <NexProvider><Forma id="sin" /></NexProvider>
        <NexProvider liquid="symmetric">
          <Forma id="sim" />
          <NexProvider theme="editorial-dark"><Forma id="heredada" /></NexProvider>
          <NexProvider liquid="spring"><Forma id="anulada" /></NexProvider>
        </NexProvider>
      </>,
    ));
    expect(['sin', 'sim', 'heredada', 'anulada'].map((id) => $(`#${id}`).textContent)).toEqual(['original', 'symmetric', 'symmetric', 'spring']);
  });
});

describe('NexProvider · radius y corner', () => {
  it('fijan los tokens de los controles en el subárbol; sin ellos no se toca nada', () => {
    act(() => root.render(
      <>
        <NexProvider><NexInput label="Original" /></NexProvider>
        <NexProvider radius="md" corner="squircle"><NexInput label="Ajustado" /></NexProvider>
        <NexProvider radius="none"><NexInput label="Recto" /></NexProvider>
      </>,
    ));
    const [original, ajustado, recto] = Array.from(container.querySelectorAll<HTMLElement>('.nx-root'));
    expect(original!.style.getPropertyValue('--nx-control-radius')).toBe('');
    expect([ajustado!.style.getPropertyValue('--nx-control-radius'), ajustado!.style.getPropertyValue('--nx-control-corner')]).toEqual(['10px', 'squircle']);
    expect(Number(ajustado!.style.getPropertyValue('--nx-control-smoothing'))).toBeCloseTo(2 / 3);
    expect([recto!.style.getPropertyValue('--nx-control-radius'), recto!.style.getPropertyValue('--nx-control-corner')]).toEqual(['0px', '']);
  });
});
