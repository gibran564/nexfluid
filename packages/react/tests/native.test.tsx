import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NexCard, NexFrame, NexIcon, NexNav, NexPanel, NexProvider, NexSegmented, NexSurface } from '@eclipsis/react';
import { NexMarkdown } from '@eclipsis/react/markdown';
import { NexExplorerWidget, NexInspectorWidget, NexPreviewWidget } from '@eclipsis/react/widgets';

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
  document.body.querySelectorAll('.nx-expansion').forEach((n) => n.remove());
});
const render = (node: ReactNode) => act(() => root.render(node));
const $ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = container) => scope.querySelector<T>(sel)!;
const $$ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = container) => Array.from(scope.querySelectorAll<T>(sel));
const key = (el: Element, k: string) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
const click = (el: Element) => act(() => { (el as HTMLElement).click(); });
const pointer = (el: Element, type: string) => act(() => { el.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, clientX: 10, clientY: 10 })); });
async function violations(node: Element = container) {
  const r = await axe.run(node, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

describe('NexSurface (membrana)', () => {
  it('estático por defecto: sin SVG si no es interactiva ni viva', () => {
    render(<NexSurface>Contenido</NexSurface>);
    expect($('.nx-surface').dataset.nxRole).toBe('surface');
    expect($('.nx-surface__shape')).toBeNull();
  });

  it('recorre rest → attract → deform → activate y vuelve', () => {
    render(<NexSurface interactive activatable as="button" type="button">Pulsar</NexSurface>);
    const s = $('.nx-surface');
    expect(s.dataset.nxState).toBe('rest');
    pointer(s, 'pointerover');
    act(() => { s.dispatchEvent(new PointerEvent('pointerenter', { clientX: 5, clientY: 5 })); });
    expect(s.dataset.nxState).toBe('attract');
    pointer(s, 'pointerdown');
    expect(s.dataset.nxState).toBe('deform');
    pointer(s, 'pointerup');
    expect(s.dataset.nxState).toBe('activate');
    // React sintetiza enter/leave a partir de pointerover/pointerout.
    act(() => { s.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, relatedTarget: document.body })); });
    expect(['settle', 'rest']).toContain(s.dataset.nxState);
  });

  it('teclado equivalente: Intro activa sin puntero', () => {
    render(<NexSurface interactive activatable as="button" type="button">Pulsar</NexSurface>);
    const s = $('.nx-surface');
    act(() => s.focus());
    key(s, 'Enter');
    expect(s.dataset.nxState).toBe('activate');
  });

  it('kind, shape y material se reflejan para el CSS', () => {
    render(<NexSurface kind="control" shape="capsule" material="ink" selected quiet>x</NexSurface>);
    const s = $('.nx-surface');
    expect([s.dataset.nxRole, s.dataset.nxShape, s.dataset.nxMaterial]).toEqual(['control', 'capsule', 'ink']);
    expect(s.hasAttribute('data-nx-selected')).toBe(true);
  });
});

describe('NexSegmented (selector)', () => {
  const options = [{ value: 'a', label: 'Uno' }, { value: 'b', label: 'Dos' }, { value: 'c', label: 'Tres', disabled: true }];
  it('es un radiogroup con roving tabindex y flechas', async () => {
    let value = '';
    render(<NexSegmented aria-label="Vista" options={options} onValueChange={(v) => (value = v)} />);
    const radios = $$('[role="radio"]');
    expect($('[role="radiogroup"]').getAttribute('aria-label')).toBe('Vista');
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1]);
    act(() => radios[0]!.focus());
    key(radios[0]!, 'ArrowRight');
    expect(value).toBe('b');
    expect(radios[1]!.getAttribute('aria-checked')).toBe('true');
    key(radios[1]!, 'ArrowRight');
    expect(value).toBe('a');
    expect(await violations()).toEqual([]);
  });
});

describe('NexNav (navegación)', () => {
  it('marca el actual con aria-current y agrupa con nombre', async () => {
    render(
      <NexNav aria-label="Documentación">
        <NexNav.Group label="Componentes">
          <NexNav.Item href="#a" current>Botón</NexNav.Item>
          <NexNav.Item href="#b">Tarjeta</NexNav.Item>
        </NexNav.Group>
      </NexNav>,
    );
    expect($('a[aria-current="page"]').textContent).toBe('Botón');
    expect($('.nx-nav__sublist').getAttribute('aria-labelledby')).toBe($('.nx-nav__group').id);
    expect($('.nx-liquid').getAttribute('aria-hidden')).toBe('true');
    expect(await violations()).toEqual([]);
  });
});

describe('NexPanel', () => {
  it('se pliega con aria-expanded y vuelve inerte su cuerpo', async () => {
    render(<NexPanel title="Geometría" collapsible><button type="button">dentro</button></NexPanel>);
    const toggle = $('.nx-panel__toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect($('.nx-panel').hasAttribute('data-nx-collapsed')).toBe(true);
    expect($('.nx-panel__body').hasAttribute('inert')).toBe(true);
    expect($('section.nx-panel').getAttribute('aria-labelledby')).toBe($('.nx-panel__title').id);
    expect(await violations()).toEqual([]);
  });
});

describe('NexCard → panel (expansión)', () => {
  it('abre un diálogo con nombre, lo cierra con Escape y devuelve el foco', () => {
    render(
      <NexProvider reducedMotion="reduce">
        <NexCard expansion={<p>Detalle completo</p>}>
          <NexCard.Header><NexCard.Title>Proyecto</NexCard.Title></NexCard.Header>
        </NexCard>
      </NexProvider>,
    );
    const expand = $('button[aria-label="Ampliar"]');
    act(() => expand.focus());
    click(expand);
    const dialog = $('[role="dialog"]', document.body);
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect($(`#${dialog.getAttribute('aria-labelledby')}`, document.body).textContent).toBe('Proyecto');
    expect(dialog.textContent).toContain('Detalle completo');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Cerrar');
    key(dialog, 'Escape');
    expect($('[role="dialog"]', document.body)).toBeNull();
    expect(document.activeElement).toBe(expand);
  });
});

describe('NexFrame: espacio como sistema', () => {
  it('layout focus retrae explorador e inspector a rieles; un riel los expande', () => {
    render(<NexFrame height={500} canvasAs="div" layout="focus" explorer={<p>Archivos</p>} inspector={<p>Props</p>}>Lienzo</NexFrame>);
    const exp = $('[data-nexframe-region="explorer"]');
    expect(exp.hasAttribute('data-collapsed')).toBe(true);
    expect($('[data-nexframe-region="inspector"]').hasAttribute('data-collapsed')).toBe(true);
    click(exp.querySelector('.nx-frame__rail button')!);
    expect(exp.hasAttribute('data-collapsed')).toBe(false);
  });

  it('calcula columnas sólo para las regiones presentes', () => {
    render(<NexFrame height={500} canvasAs="div" inspector={<p>P</p>}>X</NexFrame>);
    const layout = $('.nx-frame__layout');
    expect(layout.style.getPropertyValue('--nx-frame-cols')).toBe('minmax(0, 1fr) 300px');
    expect(layout.style.getPropertyValue('--nx-frame-areas')).toContain("'canvas inspector'");
  });
});

describe('NexMarkdown: contenido como lenguaje', () => {
  it('convierte avisos GFM en membranas con nombre y numera secciones', async () => {
    render(<NexMarkdown numbered source={'## Uno\n\n> [!WARNING]\n> Cuidado con **esto**.\n\n> Cita normal'} />);
    const callout = $('.nx-callout[role="note"]');
    expect(callout.dataset.nxKind).toBe('warning');
    expect(callout.getAttribute('aria-label')).toBe('Advertencia');
    expect(callout.textContent).toContain('Cuidado con esto.');
    expect(callout.textContent).not.toContain('[!WARNING]');
    expect($('blockquote').textContent?.trim()).toBe('Cita normal');
    expect($('.nx-markdown').hasAttribute('data-nx-numbered')).toBe(true);
    expect(await violations()).toEqual([]);
  });
});

describe('NexWidgets nativos', () => {
  it('NexExplorerWidget: ramas con aria-expanded y selección con aria-current', async () => {
    render(
      <NexExplorerWidget
        aria-label="Archivos"
        nodes={[{ id: 'src', label: 'src', children: [{ id: 'a', label: 'a.ts', icon: <NexIcon name="file" /> }] }, { id: 'r', label: 'README.md' }]}
      />,
    );
    const branch = $('button[aria-expanded]');
    expect(branch.getAttribute('aria-expanded')).toBe('false');
    click(branch);
    expect(branch.getAttribute('aria-expanded')).toBe('true');
    click($$('.nx-nav__item').find((b) => b.textContent === 'a.ts')!);
    expect($('[aria-current="true"]').textContent).toBe('a.ts');
    expect(await violations()).toEqual([]);
  });

  it('NexInspectorWidget: secciones plegables independientes', () => {
    render(<NexInspectorWidget sections={[{ id: 'g', title: 'Geometría', groups: [{ items: [{ label: 'Radio', value: '20 px' }] }] }, { id: 'm', title: 'Movimiento', defaultOpen: false, content: <p>Física</p> }]} />);
    const toggles = $$('.nx-panel__toggle');
    expect(toggles.map((t) => t.getAttribute('aria-expanded'))).toEqual(['true', 'false']);
    expect($('dt').textContent).toBe('Radio');
  });

  it('NexPreviewWidget: selector de dispositivo como radiogroup', async () => {
    render(<NexPreviewWidget title="Vista"><p>Hola</p></NexPreviewWidget>);
    expect($$('[role="radio"]').map((r) => r.textContent)).toEqual(['Fluido', 'Tableta', 'Móvil']);
    expect(await violations()).toEqual([]);
  });
});
