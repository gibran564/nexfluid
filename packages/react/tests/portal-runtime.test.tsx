import { act, createRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NexPortal, type NexPortalHandle } from '@nexfluid/react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
const frame = () => container.querySelector('iframe')!;
const send = (data: unknown, source: MessageEventSource | null) => act(() => { window.dispatchEvent(new MessageEvent('message', { data, source })); });

describe('NexPortal · sandbox para runtimes', () => {
  it('canal de datos: sólo del propio frame y con el token; post espera a la carga', () => {
    const received: unknown[] = [];
    const ref = createRef<NexPortalHandle>();
    act(() => root.render(
      <NexPortal
        ref={ref}
        label="Runtime"
        mode="sandbox"
        chrome={false}
        permissions={{ scripts: true, workers: true, wasm: true }}
        resources={{ scripts: ['https://app.test/runtime/'], connect: ['https://app.test/runtime/'] }}
        javascript="nexPortal.onMessage(() => {})"
        onMessage={(data) => received.push(data)}
      />
    ));
    expect(frame().getAttribute('sandbox')).toBe('allow-scripts');
    const doc = frame().getAttribute('srcdoc')!;
    expect(doc).toContain('worker-src data:');
    expect(doc).toContain("'wasm-unsafe-eval' https://app.test/runtime/");
    expect(container.querySelectorAll('.nx-portal__chrome')).toHaveLength(0);
    const token = /const token = "([^"]+)"/.exec(doc)![1]!;
    const own = frame().contentWindow!;
    send({ nexPortal: 1, token, type: 'message', data: { ok: 1 } }, own);
    send({ nexPortal: 1, token, type: 'message', data: 'ajeno' }, window);
    send({ nexPortal: 1, token: 'x', type: 'message', data: 'falso' }, own);
    expect(received).toEqual([{ ok: 1 }]);

    const posted = vi.spyOn(own, 'postMessage');
    expect(ref.current!.post({ run: 1 })).toBe(true);
    expect(posted).not.toHaveBeenCalled();
    act(() => { frame().dispatchEvent(new Event('load')); });
    expect(posted).toHaveBeenCalledWith({ nexPortal: 1, token, type: 'host', data: { run: 1 } }, '*');
    ref.current!.post({ run: 2 });
    expect(posted).toHaveBeenLastCalledWith({ nexPortal: 1, token, type: 'host', data: { run: 2 } }, '*');
  });

  it('el mismo arreglo de recursos (por contenido) no recrea el documento', () => {
    function Live() {
      const [n, setN] = useState(0);
      return <><button type="button" onClick={() => setN(n + 1)}>otra</button><NexPortal label="R" mode="sandbox" resources={{ connect: ['https://app.test/runtime/'] }} html="<p>x</p>" /></>;
    }
    act(() => root.render(<Live />));
    const first = frame().getAttribute('srcdoc');
    act(() => container.querySelector('button')!.click());
    expect(frame().getAttribute('srcdoc')).toBe(first);
  });

  it('fuera de sandbox, post no entrega nada', () => {
    const ref = createRef<NexPortalHandle>();
    act(() => root.render(<NexPortal ref={ref} label="Ref" url="https://example.com" />));
    expect(ref.current!.post('x')).toBe(false);
  });
});
