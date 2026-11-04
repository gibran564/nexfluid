import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NexPortal, type NexPortalConsoleEntry, type NexPortalStatus } from '@eclipsis/react';
import * as api from '@eclipsis/react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); vi.useRealTimers(); });
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const $$ = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)];
const frame = () => $<HTMLIFrameElement>('iframe');
const tokens = () => (frame().getAttribute('sandbox') ?? '').split(' ').filter(Boolean);
const button = (name: string) => $$('button').find((b) => b.getAttribute('aria-label') === name)!;
const type = (input: HTMLInputElement, value: string) => act(() => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
async function violations() {
  const r = await axe.run(container, { iframes: false, rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

describe('NexPortal · superficie web en el flujo', () => {
  it('es una región del layout con un iframe real: sin ancla, sin popover, sin capa superior', async () => {
    act(() => root.render(<div className="layout"><p>Antes</p><NexPortal label="Referencia" url="https://example.com" /><p>Después</p></div>));
    const region = $('section.nx-portal');
    expect(region.getAttribute('aria-label')).toBe('Referencia');
    expect(region.parentElement!.className).toBe('layout');
    expect(region.hasAttribute('popover')).toBe(false);
    expect(frame().getAttribute('src')).toBe('https://example.com/');
    expect(frame().getAttribute('title')).toBe('Referencia');
    expect(frame().getAttribute('allow')).toBe('');
    expect(await violations()).toEqual([]);
  });

  it('página de otro origen: sus scripts y su origen, sin navegación superior, modales ni descargas', () => {
    act(() => root.render(<NexPortal label="R" url="https://example.com" />));
    expect(tokens()).toEqual(expect.arrayContaining(['allow-scripts', 'allow-same-origin', 'allow-forms', 'allow-popups']));
    expect(tokens().some((t) => t.startsWith('allow-top-navigation') || t === 'allow-modals' || t === 'allow-downloads')).toBe(false);
  });

  it('mismo origen que la aplicación: sin allow-same-origin (no podría quitarse el sandbox)', () => {
    act(() => root.render(<NexPortal label="R" url={`${location.origin}/ref.html`} />));
    expect(tokens()).toContain('allow-scripts');
    expect(tokens()).not.toContain('allow-same-origin');
  });

  it('direcciones peligrosas o inválidas: no se cargan y el error se anuncia', () => {
    act(() => root.render(<NexPortal label="R" url="javascript:alert(1)" />));
    expect(frame().hasAttribute('src')).toBe(false);
    expect(frame().hidden).toBe(true);
    expect($('[role="status"]').textContent).toMatch(/http y https/);
    expect($('.nx-portal').dataset.phase).toBe('error');
  });

  it('estados: cargando (aria-busy) → terminado con load; lento sin afirmar bloqueo', () => {
    vi.useFakeTimers();
    const seen: NexPortalStatus['phase'][] = [];
    act(() => root.render(<NexPortal label="R" url="https://lento.example" slowAfter={1000} onStatusChange={(s) => seen.push(s.phase)} />));
    expect($('.nx-portal').getAttribute('aria-busy')).toBe('true');
    expect($('[role="status"]').textContent).toBe('Cargando lento.example…');
    act(() => { vi.advanceTimersByTime(1100); });
    const notice = $('.nx-portal__notice');
    expect(notice.textContent).toMatch(/tarda en responder/);
    expect(notice.textContent).not.toMatch(/bloquead/i);
    expect($$('.nx-portal__notice a').map((a) => a.getAttribute('rel'))).toEqual(['noopener noreferrer']);
    act(() => { frame().dispatchEvent(new Event('load')); });
    expect(seen.at(-1)).toBe('loaded');
    expect($('.nx-portal').hasAttribute('aria-busy')).toBe(false);
  });
});

describe('NexPortal · navegador', () => {
  it('la barra abre direcciones; atrás/adelante recorren SÓLO lo abierto desde ella', () => {
    const visited: string[] = [];
    act(() => root.render(<NexPortal label="Navegador" mode="browser" defaultUrl="https://a.example" onNavigate={(u) => visited.push(u)} />));
    const input = $<HTMLInputElement>('.nx-portal__address input');
    expect(button('Dirección anterior').hasAttribute('disabled')).toBe(true);
    type(input, 'b.example/docs');
    act(() => { input.form!.requestSubmit(); });
    expect(frame().getAttribute('src')).toBe('https://b.example/docs');
    act(() => button('Dirección anterior').click());
    expect(frame().getAttribute('src')).toBe('https://a.example/');
    expect(input.value).toBe('https://a.example/');
    act(() => button('Dirección siguiente').click());
    expect(frame().getAttribute('src')).toBe('https://b.example/docs');
    expect(visited).toEqual(['https://b.example/docs', 'https://a.example/', 'https://b.example/docs']);
  });

  it('una dirección peligrosa escrita en la barra no navega, se anuncia y NO descarga la página abierta', () => {
    act(() => root.render(<NexPortal label="N" mode="browser" defaultUrl="https://a.example" />));
    const input = $<HTMLInputElement>('.nx-portal__address input');
    type(input, 'javascript:alert(document.cookie)');
    act(() => { input.form!.requestSubmit(); });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect($('[role="status"]').textContent).toMatch(/http y https/);
    expect(frame().getAttribute('src')).toBe('https://a.example/');
    expect(frame().hidden).toBe(false);
    type(input, 'b.example');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('ampliar una referencia a navegador conserva el MISMO iframe (no recarga)', () => {
    act(() => root.render(<NexPortal label="Ref" url="https://example.com" />));
    const before = frame();
    expect($$('.nx-portal__bar')).toHaveLength(0);
    act(() => button('Ampliar a navegador').click());
    expect($('.nx-portal').dataset.mode).toBe('browser');
    expect($$('.nx-portal__bar')).toHaveLength(1);
    expect(frame()).toBe(before);
    act(() => button('Reducir a referencia').click());
    expect($('.nx-portal').dataset.mode).toBe('embedded');
    expect(frame()).toBe(before);
    expect(frame().getAttribute('src')).toBe('https://example.com/');
  });
});

describe('NexPortal · sandbox', () => {
  it('código propio en srcdoc, origen opaco y CSP sin red', () => {
    act(() => root.render(<NexPortal label="Resultado" mode="sandbox" html="<button>Pulsar</button>" javascript="console.log('hola')" />));
    expect(tokens()).toEqual(['allow-scripts']);
    expect(frame().hasAttribute('src')).toBe(false);
    const doc = frame().getAttribute('srcdoc')!;
    expect(doc).toContain('<button>Pulsar</button>');
    expect(doc).toContain("connect-src 'none'");
  });

  it('el puente sólo acepta mensajes del propio frame, con su token y su forma', () => {
    const logs: NexPortalConsoleEntry[] = [];
    act(() => root.render(<NexPortal label="R" mode="sandbox" html="<p>x</p>" onConsole={(e) => logs.push(e)} />));
    const token = /const token = "([^"]+)"/.exec(frame().getAttribute('srcdoc')!)![1]!;
    const own = frame().contentWindow;
    const send = (data: unknown, source: MessageEventSource | null) => act(() => { window.dispatchEvent(new MessageEvent('message', { data, source })); });
    send({ nexPortal: 1, token, type: 'console', level: 'log', text: 'válido' }, own);
    send({ nexPortal: 1, token, type: 'console', level: 'log', text: 'otro frame' }, window);
    send({ nexPortal: 1, token: 'falso', type: 'console', level: 'log', text: 'token falso' }, own);
    send({ nexPortal: 1, token, type: 'eval', level: 'log', text: 'tipo desconocido' }, own);
    expect(logs).toEqual([{ level: 'log', text: 'válido' }]);
  });

  it('cambiar el código cambia el documento aislado (y su token)', () => {
    function Live() { const [h, setH] = useState('<p>uno</p>'); return <><button type="button" onClick={() => setH('<p>dos</p>')}>cambiar</button><NexPortal label="R" mode="sandbox" html={h} /></>; }
    act(() => root.render(<Live />));
    const first = frame().getAttribute('srcdoc')!;
    act(() => $$('button').find((b) => b.textContent === 'cambiar')!.click());
    const second = frame().getAttribute('srcdoc')!;
    expect(second).toContain('<p>dos</p>');
    expect(/token = "([^"]+)"/.exec(first)![1]).not.toBe(/token = "([^"]+)"/.exec(second)![1]);
  });
});

describe('nombres públicos', () => {
  it('NexPortal (web) y NexAnchoredLayer (capas) son componentes distintos', () => {
    expect(api.NexPortal).not.toBe(api.NexAnchoredLayer);
    expect(typeof api.NexAnchoredLayer).toBe('function');
  });
});
