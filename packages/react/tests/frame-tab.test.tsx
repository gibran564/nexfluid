import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NexFrame, NexProvider } from '@nexfluid/react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

const inspectorControls = () => Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-controls]'))
  .filter((b) => /inspector/.test(b.getAttribute('aria-controls')!) && !b.closest('[data-collapsed] .nx-frame__rail:not([data-tab])'));

describe('NexFrame · inspectorControl="tab"', () => {
  it('un único control (la pestaña), siempre presente, que abre y recoge el panel', async () => {
    act(() => root.render(
      <NexProvider reducedMotion="reduce">
        <NexFrame nested height={500} inspectorControl="tab" inspectorLabel="Propiedades" inspector={<p>Panel</p>} actions={<button type="button">Acción</button>}>
          <p>Lienzo</p>
        </NexFrame>
      </NexProvider>,
    ));
    // Ningún botón del inspector en la barra superior.
    expect(container.querySelector('.nx-frame__top [data-region="inspector"]')).toBeNull();
    const controls = inspectorControls();
    expect(controls).toHaveLength(1);
    const tab = controls[0]!;
    expect(tab.className).toContain('nx-frame__tab');
    expect(tab.getAttribute('aria-expanded')).toBe('true');
    const panel = document.getElementById(tab.getAttribute('aria-controls')!)!;
    expect(panel.textContent).toBe('Panel');
    expect(tab.getAttribute('aria-label')).toBe('Ocultar propiedades');

    act(() => tab.click());
    expect(tab.isConnected).toBe(true); // la pestaña sigue ahí, cerrada
    expect(tab.getAttribute('aria-expanded')).toBe('false');
    expect(tab.getAttribute('aria-label')).toBe('Mostrar propiedades');
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(inspectorControls()).toHaveLength(1);

    act(() => tab.click());
    expect(tab.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hasAttribute('inert')).toBe(false);

    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it('sin la opción, se conserva el botón de la barra (compatibilidad)', () => {
    act(() => root.render(<NexFrame nested height={500} inspector={<p>Panel</p>}><p>Lienzo</p></NexFrame>));
    expect(container.querySelector('.nx-frame__top [data-region="inspector"]')).not.toBeNull();
    expect(container.querySelector('.nx-frame__tab')).toBeNull();
  });
});

describe('NexFrame anidado dentro de un marco con pestaña', () => {
  it('el marco interior conserva sus propios controles (botón en su barra, sin pestaña)', () => {
    act(() => root.render(
      <NexFrame height={600} inspectorControl="tab" inspectorLabel="Propiedades" inspector={<p>Props del catálogo</p>}>
        <NexFrame nested height={400} inspector={<p>Inspector del laboratorio</p>}><p>Lienzo</p></NexFrame>
      </NexFrame>,
    ));
    const [outer, inner] = Array.from(container.querySelectorAll<HTMLElement>('.nx-frame'));
    const own = (frame: HTMLElement, sel: string) => Array.from(frame.querySelectorAll(sel)).filter((el) => el.closest('.nx-frame') === frame);
    expect(outer!.dataset.inspectorControl).toBe('tab');
    expect(own(outer!, '.nx-frame__tab')).toHaveLength(1);
    expect(own(outer!, '.nx-frame__top [data-region="inspector"]')).toHaveLength(0);
    expect(inner!.dataset.inspectorControl).toBe('toolbar');
    expect(own(inner!, '.nx-frame__tab')).toHaveLength(0);
    expect(own(inner!, '.nx-frame__top [data-region="inspector"]')).toHaveLength(1);
  });
});
