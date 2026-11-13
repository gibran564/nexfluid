import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NexConsole, NexLiveConsole, type NexConsoleOutput } from '@nexfluid/react';
import { createSessionStore, fromNexBookOutputs, normalizeNexViewEvents, type NexSessionTransport } from '@nexfluid/components';
import { NexMarkdownField, renderRichText, richTextToMarkdown } from '@nexfluid/react/markdown';
import { NexDataView, sheetFromRows } from '@nexfluid/react/sheets';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
const $ = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T>(sel)!;
const $$ = (sel: string) => [...container.querySelectorAll<HTMLElement>(sel)];
const key = (el: Element, k: string) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
const type = (el: HTMLInputElement, value: string) => act(() => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
const view = (name: 'Consola' | 'NexView') => act(() => { $$('[role="radio"]').find((r) => r.textContent === name)!.click(); });
async function violations() {
  const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

const OUT: NexConsoleOutput[] = [
  { seq: 2, stream: 'stdout', text: 'Hola, Ana\n' },
  { seq: 0, stream: 'stdout', text: '¿Nombre? ' },
  { seq: 1, stream: 'input', text: 'Ana' },
  { seq: 3, stream: 'table', columns: ['a'], rows: [[1]], totalRows: 1 },
];

describe('NexConsole', () => {
  it('ordena por seq y conserva la entrada en su sitio; lo no textual queda marcado en su lugar', () => {
    act(() => root.render(<NexConsole outputs={OUT} state="completed" />));
    expect($('.nx-console__text').textContent).toBe('¿Nombre? Ana\nHola, Ana\n⟨tabla 1×1 · en NexView⟩\n');
    expect($('[data-stream="input"]').textContent).toBe('Ana');
  });

  it('cambiar de vista no vuelve a pedir la ejecución ni pierde la entrada pendiente', () => {
    const onRun = vi.fn();
    act(() => root.render(<NexConsole outputs={[{ seq: 0, stream: 'stdout', text: 'Edad: ' }]} state="waiting_for_input" onSubmitInput={() => true} onRun={onRun} />));
    type($<HTMLInputElement>('.nx-console__input'), '3');
    view('NexView');
    expect($<HTMLInputElement>('.nx-console__input').value).toBe('3');
    view('Consola');
    view('NexView');
    expect($<HTMLInputElement>('.nx-console__input').value).toBe('3');
    expect(onRun).not.toHaveBeenCalled();
  });

  it('Intro envía; el pegado multilínea va entero al programa; Ctrl+C interrumpe', () => {
    const sent: string[] = [];
    const stop = vi.fn();
    act(() => root.render(<NexConsole outputs={[]} state="waiting_for_input" onSubmitInput={(t) => { sent.push(t); return true; }} onInterrupt={stop} />));
    const input = $<HTMLInputElement>('.nx-console__input');
    type(input, 'uno');
    key(input, 'Enter');
    expect(sent).toEqual(['uno']);
    // jsdom no tiene DataTransfer: un evento de pegado con su portapapeles.
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', { value: { getData: () => 'dos\ntres\n' } });
    act(() => { input.dispatchEvent(paste); });
    expect(sent).toEqual(['uno', 'dos\ntres\n']);
    act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true })); });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('`fill` delega el alto en el contenedor e ignora `height`; sin `fill`, `height` se aplica', () => {
    act(() => root.render(<NexConsole outputs={OUT} state="completed" fill height={300} />));
    expect($('.nx-console').hasAttribute('data-nx-fill')).toBe(true);
    expect($('.nx-console__log').style.height).toBe('');
    act(() => root.render(<NexConsole outputs={OUT} state="completed" height={300} />));
    expect($('.nx-console').hasAttribute('data-nx-fill')).toBe(false);
    expect($('.nx-console__log').style.height).toBe('300px');
  });

  it('`interruptButton={false}` no pinta otro «Detener», pero Ctrl+C sigue interrumpiendo', () => {
    const onInterrupt = vi.fn();
    act(() => root.render(<NexConsole outputs={OUT} state="running" onInterrupt={onInterrupt} />));
    expect($('.nx-console__stop')).not.toBeNull();
    act(() => root.render(<NexConsole outputs={OUT} state="waiting_for_input" onSubmitInput={() => true} onInterrupt={onInterrupt} interruptButton={false} />));
    expect(container.querySelector('.nx-console__stop')).toBeNull();
    const input = $<HTMLInputElement>('.nx-console__input');
    act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true })); });
    expect(onInterrupt).toHaveBeenCalledOnce();
  });

  it('sin entrada que esperar no hay campo; desconectada, tampoco', () => {
    act(() => root.render(<NexConsole outputs={[]} state="running" onSubmitInput={() => true} />));
    expect($('.nx-console__input')).toBeNull();
    act(() => root.render(<NexConsole outputs={[]} state="waiting_for_input" connection="reconnecting" onSubmitInput={() => true} />));
    expect($('.nx-console__input')).toBeNull();
    expect($('[role="status"]').textContent).toContain('Reconectando');
  });

  it('NexView distingue lo confirmado por el runtime de lo reconocido en el texto, y diagnostica errores', async () => {
    act(() => root.render(<NexConsole state="failed" defaultView="nexview" outputs={[
      { seq: 0, stream: 'stdout', text: '[[1 2]\n [3 4]]\n' },
      { seq: 1, stream: 'table', columns: ['x'], rows: [[1]], totalRows: 1 },
      { seq: 2, stream: 'error', text: "Traceback (most recent call last):\nNameError: name 'medai' is not defined. Did you mean: 'media'?\n" },
    ]} />));
    expect($$('.nx-view__evidence').map((e) => e.textContent)).toEqual(['reconocido', 'runtime']);
    expect($('.nx-view__diag-title').textContent).toContain('medai');
    expect($('.nx-view__diag-meta').textContent).toContain('media');
    expect(await violations()).toEqual([]);
  });

  it('una imagen con javascript: no se pinta', () => {
    act(() => root.render(<NexConsole state="completed" defaultView="nexview" outputs={[{ seq: 0, stream: 'image', src: 'javascript:alert(1)', mimeType: 'image/png' }]} />));
    expect($('img')).toBeNull();
  });

  it('adaptador NexBook: imagen por asset, Plotly como figura; los datos no se tocan', () => {
    const outputs = fromNexBookOutputs([
      { seq: 0, stream: 'stdout', text: 'x' },
      { seq: 1, stream: 'image', assetId: 'a1', mimeType: 'image/png' },
      { seq: 2, stream: 'plotly', title: 'T', figure: { data: [] }, traces: 1 },
    ], { imageSrc: (id) => `blob:${id}` });
    expect(outputs[1]).toMatchObject({ stream: 'image', src: 'blob:a1', assetId: 'a1' });
    expect(outputs[2]).toMatchObject({ stream: 'figure', format: 'plotly', title: 'T' });
  });

  it('accesible en consola', async () => {
    act(() => root.render(<NexConsole outputs={OUT} state="waiting_for_input" onSubmitInput={() => true} onInterrupt={() => {}} onRun={() => {}} />));
    expect($('[role="log"]')).not.toBeNull();
    expect(await violations()).toEqual([]);
  });
});

describe('NexLiveSession', () => {
  it('un fragmento ACTUALIZA la región activa (lo anterior conserva su identidad); una salida la cierra y AÑADE', () => {
    const store = createSessionStore({ id: 's', kind: 'interactive' });
    store.apply([{ type: 'output', output: { stream: 'stdout', text: 'inicio\n' } }, { type: 'chunk', stream: 'stdout', text: 'carg' }]);
    const first = store.getSnapshot().outputs[0];
    store.apply({ type: 'chunk', stream: 'stdout', text: 'ando' });
    const s = store.getSnapshot();
    expect(s.outputs).toHaveLength(2);
    expect(s.outputs[0]).toBe(first);
    expect(s.outputs[1]).toMatchObject({ text: 'cargando', open: true });
    store.apply({ type: 'output', output: { stream: 'table', columns: [], rows: [], totalRows: 0 } });
    expect(store.getSnapshot().outputs[1]).not.toHaveProperty('open', true);
    expect(store.getSnapshot().outputs.map((o) => o.seq)).toEqual([0, 1, 2]);
  });

  it('una región abierta nunca se interpreta como estructura; al cerrarse, sí', () => {
    const open = normalizeNexViewEvents([{ seq: 0, stream: 'stdout', text: '[[1 2]\n [3 4]]', open: true }], 'ok');
    const closed = normalizeNexViewEvents([{ seq: 0, stream: 'stdout', text: '[[1 2]\n [3 4]]' }], 'ok');
    expect(open.map((e) => e.kind)).toEqual(['text']);
    expect(closed.map((e) => e.kind)).toContain('printed');
  });

  it('límite de memoria: descarta lo más antiguo y lo cuenta; los bytes de un PTY no se interpretan', () => {
    const store = createSessionStore({ id: 'p', kind: 'pty', maxOutputs: 3 });
    for (let i = 0; i < 5; i++) store.apply({ type: 'output', output: { stream: 'stdout', text: `${i}\n` } });
    expect(store.getSnapshot().outputs.map((o) => (o as { text: string }).text)).toEqual(['2\n', '3\n', '4\n']);
    expect(store.getSnapshot().dropped).toBe(2);
    store.apply({ type: 'bytes', data: '\u001b[2J\u001b[Hhola' });
    expect(store.takeBytes(0).data).toBe('\u001b[2J\u001b[Hhola');
    expect(store.getSnapshot().outputs).toHaveLength(3);
  });

  it('NexLiveConsole ofrece sólo lo que la clase de sesión admite y envía por el transporte', () => {
    const sent: string[] = [];
    const transport: NexSessionTransport = { send: (d) => { sent.push(d); return true; }, interrupt: vi.fn(), close: vi.fn() };
    const store = createSessionStore({ id: 'i', kind: 'interactive' });
    store.apply([{ type: 'connection', connection: 'connected' }, { type: 'state', state: 'waiting_for_input' }, { type: 'chunk', stream: 'stdout', text: '> ' }]);
    act(() => root.render(<NexLiveConsole session={store} transport={transport} />));
    expect($$('button').map((b) => b.textContent)).toEqual(expect.arrayContaining(['Cerrar sesión', 'Detener']));
    expect($$('button').some((b) => b.textContent === 'Reconectar')).toBe(false);
    const input = $<HTMLInputElement>('.nx-console__input');
    type(input, 'ayuda');
    key(input, 'Enter');
    expect(sent).toEqual(['ayuda']);
    act(() => store.apply({ type: 'chunk', stream: 'stdout', text: 'ok' }));
    expect($('.nx-console__text').textContent).toContain('> ok');
  });

  it('una sesión PTY sin emulador lo dice en lugar de pintar los bytes como texto', () => {
    const store = createSessionStore({ id: 'p', kind: 'pty' });
    store.apply([{ type: 'state', state: 'running' }, { type: 'bytes', data: '\u001b[31mrojo' }]);
    act(() => root.render(<NexLiveConsole session={store} transport={{ send: () => true }} />));
    expect(container.textContent).toContain('emulador');
    expect(container.textContent).not.toContain('rojo');
  });
});

describe('NexMarkdownField · ida y vuelta', () => {
  it('lo editable vuelve igual; lo que no, queda como isla con su fuente exacta', () => {
    const md = '# Título\n\nTexto **fuerte**, *cursiva*, `código` y [enlace](https://ejemplo.org).\n\n- uno\n- dos\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```py\nx = 1\n```\n\nsnake_case_name y 3. no es lista';
    const el = document.createElement('div');
    const islands = renderRichText(el, md);
    expect(islands.map((i) => i.source)).toEqual(['| a | b |\n|---|---|\n| 1 | 2 |', '```py\nx = 1\n```']);
    expect(richTextToMarkdown(el)).toBe(md);
  });
  it('los bloques que no se tocan conservan su forma (`__x__` no pasa a `**x**`)', () => {
    const el = document.createElement('div');
    renderRichText(el, '__negrita__ intacta\n\nOtro párrafo');
    el.querySelectorAll('p')[1]!.textContent = 'Otro párrafo editado';
    expect(richTextToMarkdown(el)).toBe('__negrita__ intacta\n\nOtro párrafo editado');
  });
  it('un enlace javascript: no se vuelve editable (queda como isla)', () => {
    const el = document.createElement('div');
    renderRichText(el, '[x](javascript:alert(1))');
    expect(el.querySelector('a')).toBeNull();
    expect(richTextToMarkdown(el)).toBe('[x](javascript:alert(1))');
  });
  it('cambiar a Markdown muestra la fuente y la edición la devuelve', () => {
    function Field() { const [v, setV] = useState('Hola **mundo**'); return <NexMarkdownField label="Texto" value={v} onChange={setV} />; }
    act(() => root.render(<Field />));
    expect($('[role="textbox"]').querySelector('strong')?.textContent).toBe('mundo');
    view('Markdown' as never);
    expect($<HTMLTextAreaElement>('textarea').value).toBe('Hola **mundo**');
  });
});

describe('NexDataView', () => {
  const sheet = () => { const s = sheetFromRows('h', [['Servicio', 'Min'], ['A', 2], ['B', 3], ['Total', '=SUMA(B2:B3)']]); return { rows: s.rows, columns: s.columns, cells: s.cells }; };
  it('evalúa fórmulas en la tabla y el gráfico resume los valores', () => {
    act(() => root.render(<NexDataView title="Esperas" sheet={sheet()} />));
    expect($$('tbody tr').at(-1)!.textContent).toBe('Total5');
    act(() => root.render(<NexDataView title="Esperas" sheet={sheet()} view="chart" />));
    expect($('svg[role="img"]').getAttribute('aria-label')).toContain('Total: Min 5');
  });
  it('onOpenSheets delega el editor con el dato y un commit', () => {
    let request: { commit: (s: ReturnType<typeof sheet>) => void; title: string } | null = null;
    const changes: unknown[] = [];
    act(() => root.render(<NexDataView title="Esperas" sheet={sheet()} onChange={(s) => changes.push(s)} onOpenSheets={(r) => { request = r; }} />));
    act(() => { $$('button').find((b) => b.textContent?.includes('Abrir en NexSheets'))!.click(); });
    expect(request!.title).toBe('Esperas');
    request!.commit(sheet());
    expect(changes).toHaveLength(1);
  });
});

describe('NexView compuesto', () => {
  it('regresión (matriz, aviso, tabla, imagen, gráfica): nada desaparece, el aviso queda en su sitio y Ampliar delega', () => {
    const focused: string[] = [];
    act(() => root.render(<NexConsole state="completed" defaultView="nexview" onFocusOutput={(o) => focused.push(o.stream)}
      renderers={{ figure: () => <svg aria-label="gráfica" /> }} outputs={[
        { seq: 0, stream: 'stdout', text: 'Matriz de transición:\n[[0.5 0.5]\n [0.2 0.8]]\n' },
        { seq: 1, stream: 'stderr', text: 'main.py:7: UserWarning: muestra pequeña\n' },
        { seq: 2, stream: 'table', columns: ['k', 'P(k)'], rows: [[0, 0.3]], totalRows: 1 },
        { seq: 3, stream: 'image', src: 'data:image/png;base64,AA==', mimeType: 'image/png', width: 320, height: 120, alt: 'Curva' },
        { seq: 4, stream: 'figure', format: 'barras', title: 'Llegadas por minuto', data: [1] },
      ]} />));
    const kids = [...container.querySelector('.nx-view')!.children].map((c) => (c as HTMLElement).dataset.role ?? c.className);
    expect(kids[1]).toBe('notice');
    expect(container.querySelectorAll('[data-nx-view-item]')).toHaveLength(5);
    expect(container.querySelector('img[alt="Curva"]')).not.toBeNull();
    expect(container.querySelector('svg[aria-label="gráfica"]')).not.toBeNull();
    act(() => { container.querySelector<HTMLButtonElement>('[aria-label^="Ampliar figura"]')!.click(); });
    expect(focused).toEqual(['figure']);
  });
});
