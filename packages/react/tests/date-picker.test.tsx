import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NexDatePicker, fromIsoDate, toIsoDate } from '@nexfluid/react';

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
const render = (node: ReactNode) => act(() => root.render(node));
const abrir = () => act(() => container.querySelector<HTMLButtonElement>('.nx-select__trigger')!.click());
const tecla = (key: string) =>
  act(() => { document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });
const enfocado = () => document.activeElement?.getAttribute('data-date');

describe('NexDatePicker', () => {
  it('convierte fechas sin zonas horarias', () => {
    expect(toIsoDate(fromIsoDate('2026-03-08')!)).toBe('2026-03-08');
    expect(fromIsoDate('2026-02-30')).toBeNull();
    expect(fromIsoDate('ayer')).toBeNull();
  });

  it('elige con el teclado y respeta los días deshabilitados', () => {
    const elegidos: string[] = [];
    render(
      <NexDatePicker
        label="Día"
        locale="es-MX"
        value="2026-11-20"
        max="2026-11-24"
        isDateDisabled={(d) => d === '2026-11-21'}
        isDateMarked={(d) => d === '2026-11-19'}
        onValueChange={(d) => elegidos.push(d)}
      />,
    );
    abrir();
    expect(enfocado()).toBe('2026-11-20');
    expect(document.querySelector('[data-date="2026-11-19"]')!.hasAttribute('data-marked')).toBe(true);
    expect(document.querySelector('[data-date="2026-11-25"]')!.getAttribute('aria-disabled')).toBe('true');
    tecla('ArrowRight');
    expect(enfocado()).toBe('2026-11-21');
    tecla('Enter');
    expect(elegidos).toEqual([]);
    tecla('ArrowRight');
    tecla('Enter');
    expect(elegidos).toEqual(['2026-11-22']);
    expect(document.querySelector('.nx-date__grid')).toBeNull();
  });

  it('pasa de mes sin saltarse los meses cortos', () => {
    render(<NexDatePicker label="Día" defaultValue="2026-01-31" />);
    abrir();
    tecla('PageDown');
    expect(enfocado()).toBe('2026-02-28');
    tecla('Escape');
    expect(document.querySelector('.nx-date__grid')).toBeNull();
  });
});
