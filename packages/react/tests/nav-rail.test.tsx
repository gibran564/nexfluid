import { act, forwardRef, type AnchorHTMLAttributes } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ICONS } from '@nexfluid/foundation';
import { NexButton, NexIcon, NexIconButton, NexNav, NexTooltip } from '@nexfluid/react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
const $ = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T>(sel)!;
async function violations() {
  const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

// Un enlace de enrutador mínimo, como el `Link` de Next.js.
const RouterLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(function RouterLink(props, ref) {
  return <a {...props} ref={ref} data-router="" />;
});

function Rail({ compact = false, landmark = true }: { compact?: boolean; landmark?: boolean }) {
  return (
    <NexNav aria-label="Secciones" compact={compact} landmark={landmark} density="compact">
      <NexNav.Group label="Principal">
        <NexNav.Item href="/" as={RouterLink} current icon={<NexIcon name="home" />}>Inicio</NexNav.Item>
        <NexNav.Item href="/aula" as={RouterLink} icon={<NexIcon name="academic" />} trailing={<span>3</span>}>Aula</NexNav.Item>
      </NexNav.Group>
      <NexNav.Group label="Gestión">
        <NexNav.Item href="/admin" as={RouterLink} icon={<NexIcon name="shield" />}>Administración</NexNav.Item>
      </NexNav.Group>
    </NexNav>
  );
}

describe('iconos de navegación', () => {
  it('existen los destinos de una aplicación', () => {
    for (const name of ['home', 'academic', 'compass', 'chart', 'bell', 'shield', 'user'] as const) expect(ICONS[name].length).toBeGreaterThan(0);
  });
});

describe('NexNav · riel compacto', () => {
  it('expandido: etiquetas visibles, el mismo icono, densidad compacta, enlace del enrutador', async () => {
    act(() => root.render(<Rail />));
    const nav = $('nav');
    expect(nav.getAttribute('aria-label')).toBe('Secciones');
    expect(nav.dataset.nxDensity).toBe('compact');
    expect(nav.hasAttribute('data-nx-compact')).toBe(false);
    const inicio = $<HTMLAnchorElement>('a[href="/"]');
    expect(inicio.dataset.router).toBe('');
    expect(inicio.getAttribute('aria-current')).toBe('page');
    expect(inicio.querySelector('[data-nx-icon="home"]')).not.toBeNull();
    expect(inicio.querySelector('.nx-nav__label')!.textContent).toBe('Inicio');
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    expect(await violations()).toEqual([]);
  });

  it('compacto: mismo icono, etiqueta como nombre accesible oculto y títulos de grupo ocultos pero válidos', async () => {
    act(() => root.render(<Rail compact />));
    const nav = $('nav');
    expect(nav.hasAttribute('data-nx-compact')).toBe(true);
    const aula = $<HTMLAnchorElement>('a[href="/aula"]');
    expect(aula.querySelector('[data-nx-icon="academic"]')).not.toBeNull();
    expect(aula.querySelector('.nx-visually-hidden')!.textContent).toBe('Aula');
    expect(aula.textContent).toContain('Aula');
    const group = container.querySelector('.nx-nav__group')!;
    expect(group.classList.contains('nx-visually-hidden')).toBe(true);
    expect(document.getElementById(container.querySelector('.nx-nav__sublist')!.getAttribute('aria-labelledby')!)!.textContent).toBe('Principal');
    expect(await violations()).toEqual([]);
  });

  it('compacto: el rótulo aparece con el puntero, es decorativo (no repite el nombre) y Escape lo descarta', () => {
    act(() => root.render(<Rail compact />));
    const aula = $<HTMLAnchorElement>('a[href="/aula"]');
    act(() => { aula.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })); });
    const tip = $('[role="tooltip"]');
    expect(tip.textContent).toBe('Aula');
    expect(tip.getAttribute('aria-hidden')).toBe('true');
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('landmark={false}: un grupo con nombre, para no anidar navegaciones', async () => {
    act(() => root.render(<nav aria-label="Principal"><Rail landmark={false} /></nav>));
    expect(container.querySelectorAll('nav')).toHaveLength(1);
    const group = $('.nx-nav');
    expect(group.tagName).toBe('DIV');
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Secciones');
    expect(await violations()).toEqual([]);
  });

  it('SSR e hidratación sin diferencias, compacto y expandido', () => {
    for (const compact of [false, true]) {
      const html = renderToString(<Rail compact={compact} />);
      const host = document.createElement('div');
      host.innerHTML = html;
      document.body.append(host);
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let hydrated!: Root;
      act(() => { hydrated = hydrateRoot(host, <Rail compact={compact} />); });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
      act(() => hydrated.unmount());
      host.remove();
    }
  });
});

describe('NexButton · contentAlign', () => {
  it('start: marca la alineación y lleva iconEnd al extremo; por defecto no cambia nada', () => {
    act(() => root.render(<><NexButton contentAlign="start" iconEnd={<NexIcon name="arrow-right" />}>Mi estudio</NexButton><NexButton iconEnd={<NexIcon name="arrow-right" />}>Abrir</NexButton></>));
    const [start, normal] = container.querySelectorAll('button');
    expect(start!.dataset.nxAlign).toBe('start');
    expect(start!.querySelector('.nx-button__end [data-nx-icon="arrow-right"]')).not.toBeNull();
    expect(normal!.hasAttribute('data-nx-align')).toBe(false);
    expect(normal!.querySelector('.nx-button__end')).toBeNull();
  });
});

describe('NexTooltip', () => {
  it('envuelve sin añadir caja; con foco de ratón no aparece, con el de teclado sí', () => {
    act(() => root.render(<NexTooltip label="Buscar" side="right"><NexIconButton label="Buscar" icon={<NexIcon name="search" />} /></NexTooltip>));
    const wrap = $('.nx-tooltip-anchor');
    const button = $<HTMLButtonElement>('button');
    expect(wrap.firstElementChild).toBe(button);
    // jsdom no calcula :focus-visible; se simula la coincidencia para el teclado.
    const matches = vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
      return selector === ':focus-visible' ? false : HTMLElement.prototype.matches.call(this, selector);
    });
    act(() => button.focus());
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    act(() => button.blur());
    matches.mockImplementation(function (this: Element, selector: string) { return selector === ':focus-visible' ? true : false; });
    act(() => button.focus());
    expect($('[role="tooltip"]').textContent).toBe('Buscar');
    matches.mockRestore();
    act(() => button.blur());
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('describe: el rótulo es una descripción unida con aria-describedby', async () => {
    act(() => root.render(<NexTooltip label="Atajo: Ctrl K" describe><button type="button">Buscar</button></NexTooltip>));
    const button = $('button');
    const id = button.getAttribute('aria-describedby')!;
    expect(document.getElementById(id)!.textContent).toBe('Atajo: Ctrl K');
    expect(document.getElementById(id)!.hasAttribute('aria-hidden')).toBe(false);
    expect(await violations()).toEqual([]);
  });

  it('disabled: pinta el hijo tal cual', () => {
    act(() => root.render(<NexTooltip label="Inicio" disabled><a href="/">Inicio</a></NexTooltip>));
    expect(container.querySelector('.nx-tooltip-anchor')).toBeNull();
    expect($('a').textContent).toBe('Inicio');
  });
});
