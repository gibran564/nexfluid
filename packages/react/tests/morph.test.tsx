import { StrictMode, act, createRef, useRef, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  NexActionButton, NexCard, NexDock, NexIcon, NexMorph, NexProvider, NexTab, NexTabs, type NexMorphController,
} from '@nexfluid/react';

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
const $ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document.body) => scope.querySelector<T>(sel)!;
const click = (el: Element) => act(() => { (el as HTMLElement).click(); });
const key = (el: Element, k: string) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
async function violations(node: Element) {
  const r = await axe.run(node, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

function Workspace({ controller }: { controller?: React.Ref<NexMorphController> }) {
  const stage = useRef<HTMLDivElement>(null);
  return (
    <div ref={stage}>
      <NexMorph physics="morph" controller={controller}>
        <NexMorph.Source>
          <NexCard>
            <NexCard.Title>Colas</NexCard.Title>
            <NexMorph.Trigger>Abrir</NexMorph.Trigger>
          </NexCard>
        </NexMorph.Source>
        <NexMorph.Target container={stage}>
          <NexMorph.Title>Colas</NexMorph.Title>
          <NexMorph.Close />
          <p>Detalle</p>
        </NexMorph.Target>
      </NexMorph>
    </div>
  );
}

describe('NexMorph (React)', () => {
  it('origen → destino con trigger accesible, región con nombre y vuelta del foco', () => {
    render(<NexProvider reducedMotion="reduce"><Workspace /></NexProvider>);
    const trigger = $('.nx-morph-trigger');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    act(() => trigger.focus());
    click(trigger);
    const region = $('[role="region"].nx-morph__panel');
    expect(region).not.toBeNull();
    expect(trigger.getAttribute('aria-controls')).toBe(region.id);
    expect($(`#${region.getAttribute('aria-labelledby')}`).textContent).toBe('Colas');
    // El origen cede su sitio: oculto e inerte mientras está transformado.
    expect($('[data-nx-morph-source]').hasAttribute('data-nx-morph-hidden')).toBe(true);
    // El contenido entrante está marcado; el título compartido no.
    expect($('.nx-morph__content p').hasAttribute('data-nx-morph-in')).toBe(true);
    expect($('.nx-morph__content [data-nx-morph-shared="title"]').hasAttribute('data-nx-morph-in')).toBe(false);
    // La tarjeta se clona (sin ids) como contenido saliente, oculta a la accesibilidad.
    expect($('.nx-morph__outgoing').getAttribute('aria-hidden')).toBe('true');
    expect($('.nx-morph__outgoing [id]')).toBeNull();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Cerrar');
    key(region, 'Escape');
    expect($('.nx-morph__panel')).toBeNull();
    expect($('[data-nx-morph-source]').hasAttribute('data-nx-morph-hidden')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('controlador: abrir, pausar, seek y cerrar', () => {
    const controller = createRef<NexMorphController>();
    render(<NexProvider reducedMotion="reduce"><Workspace controller={controller} /></NexProvider>);
    act(() => controller.current!.open());
    expect(controller.current!.isOpen).toBe(true);
    expect(controller.current!.frame()?.state).toBe('open');
    act(() => controller.current!.pause());
    expect(controller.current!.paused).toBe(true);
    act(() => controller.current!.seek(0.5));
    expect(controller.current!.frame()!.size).toBeGreaterThan(0.3);
    act(() => { controller.current!.resume(); controller.current!.close(); });
    expect($('.nx-morph__panel')).toBeNull();
  });

  it('NexCard: la expansión conserva su API y puede abrirse en un contenedor', () => {
    function Host() {
      const stage = useRef<HTMLDivElement>(null);
      return (
        <div ref={stage}>
          <NexCard expansion={<p>Detalle</p>} expansionContainer={stage}>
            <NexCard.Header><NexCard.Title>Proyecto</NexCard.Title></NexCard.Header>
          </NexCard>
        </div>
      );
    }
    render(<NexProvider reducedMotion="reduce"><Host /></NexProvider>);
    click($('button[aria-label="Ampliar"]'));
    const panel = $('.nx-morph__panel');
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.closest('.nx-morph')!.parentElement!.querySelector(':scope > .nx-card')).not.toBeNull();
    expect(panel.textContent).toContain('Detalle');
  });

  it('sin violaciones de axe con el panel abierto', async () => {
    render(<NexProvider reducedMotion="reduce"><Workspace /></NexProvider>);
    click($('.nx-morph-trigger'));
    expect(await violations(container)).toEqual([]);
  });
});

describe('NexActionButton', () => {
  it('sigue la promesa real: pendiente → éxito, con aria-busy y anuncio', async () => {
    let resolve!: () => void;
    render(<NexActionButton action={() => new Promise<void>((r) => { resolve = r; })} successLabel="Publicado">Publicar</NexActionButton>);
    const button = $<HTMLButtonElement>('.nx-action');
    click(button);
    expect(button.dataset.nxStatus).toBe('pending');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect($('[role="status"]').textContent).toBe('Procesando');
    click(button); // ignorado mientras está pendiente
    await act(async () => { resolve(); });
    expect(button.dataset.nxStatus).toBe('success');
    expect($('[role="status"]').textContent).toBe('Publicado');
    // El nombre accesible es la etiqueta de reposo; las demás capas están ocultas.
    expect($('[data-layer="idle"]').getAttribute('aria-hidden')).toBeNull();
  });

  it('funciona en StrictMode (montaje doble)', () => {
    render(<StrictMode><NexActionButton action={() => new Promise(() => {})}>Publicar</NexActionButton></StrictMode>);
    click($('.nx-action'));
    expect($('.nx-action').dataset.nxStatus).toBe('pending');
  });

  it('NexMorph funciona en StrictMode', () => {
    render(<StrictMode><NexProvider reducedMotion="reduce"><Workspace /></NexProvider></StrictMode>);
    click($('.nx-morph-trigger'));
    expect($('.nx-morph__panel')).not.toBeNull();
    key($('.nx-morph__panel'), 'Escape');
    expect($('.nx-morph__panel')).toBeNull();
  });

  it('una promesa rechazada lleva a error', async () => {
    render(<NexActionButton action={() => Promise.reject(new Error('x'))}>Publicar</NexActionButton>);
    const button = $<HTMLButtonElement>('.nx-action');
    await act(async () => { button.click(); });
    expect(button.dataset.nxStatus).toBe('error');
  });

  it('controlado por la aplicación', () => {
    function Host() {
      const [s, setS] = useState<'idle' | 'pending'>('idle');
      return <><NexActionButton status={s}>Guardar</NexActionButton><button type="button" id="go" onClick={() => setS('pending')}>go</button></>;
    }
    render(<Host />);
    click($('#go'));
    expect($('.nx-action').dataset.nxStatus).toBe('pending');
  });
});

describe('NexDock', () => {
  const items = [
    { id: 'files', label: 'Archivos', icon: <NexIcon name="folder" />, panel: <p>Lista</p> },
    { id: 'run', label: 'Ejecutar', icon: <NexIcon name="play" />, panel: <p>Salida</p> },
    { id: 'help', label: 'Ayuda', icon: <NexIcon name="info" />, onSelect: () => {} },
  ];

  it('barra con roving tabindex, panel que nace del botón y Escape que devuelve el foco', async () => {
    render(<NexProvider reducedMotion="reduce"><NexDock label="Herramientas" items={items} /></NexProvider>);
    const toolbar = $('[role="toolbar"]');
    expect(toolbar.getAttribute('aria-label')).toBe('Herramientas');
    const [files, run] = Array.from(toolbar.querySelectorAll<HTMLButtonElement>('.nx-dock__item'));
    expect(files!.tabIndex).toBe(0);
    expect(run!.tabIndex).toBe(-1);
    act(() => files!.focus());
    key(files!, 'ArrowRight');
    expect(document.activeElement).toBe(run);
    expect(run!.tabIndex).toBe(0);
    click(run!);
    expect(run!.getAttribute('aria-expanded')).toBe('true');
    const panel = $('.nx-morph__panel');
    expect(run!.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.textContent).toContain('Salida');
    // El botón no se oculta: es un control que permanece.
    expect(run!.hasAttribute('data-nx-morph-hidden')).toBe(false);
    expect(await violations(container)).toEqual([]);
    key(panel, 'Escape');
    expect($('.nx-morph__panel')).toBeNull();
    expect(document.activeElement).toBe(run);
  });

  it('cambiar de herramienta cierra una y abre la otra', () => {
    render(<NexProvider reducedMotion="reduce"><NexDock label="Herramientas" items={items} /></NexProvider>);
    const [files, run] = Array.from(document.querySelectorAll<HTMLButtonElement>('.nx-dock__item'));
    click(files!);
    click(run!);
    expect(files!.getAttribute('aria-expanded')).toBe('false');
    expect(run!.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelectorAll('.nx-morph__panel')).toHaveLength(1);
  });
});

describe('NexTabs · gota líquida', () => {
  it('cambios rápidos consecutivos dejan una sola pestaña seleccionada y el indicador pintado', () => {
    render(
      <NexTabs defaultValue="a" motion="fluid">
        <NexTabs.List aria-label="Secciones">
          {['a', 'b', 'c', 'd'].map((v) => <NexTab key={v} value={v}>{v}</NexTab>)}
        </NexTabs.List>
      </NexTabs>,
    );
    const tabs = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'));
    for (const i of [1, 3, 0, 2, 1, 3]) click(tabs[i]!);
    expect(tabs.filter((t) => t.getAttribute('aria-selected') === 'true').map((t) => t.dataset.value)).toEqual(['d']);
    expect($('.nx-liquid__drop').getAttribute('d')).toMatch(/^M/);
  });
});
