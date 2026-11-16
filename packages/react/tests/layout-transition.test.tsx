import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NexProvider, layoutKeyframes, useNexLayoutTransition } from '@nexfluid/react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * useNexLayoutTransition: FLIP sin reescalar. Se simulan las cajas (jsdom no
 * maqueta) y `Element.animate` (jsdom no anima): lo que se comprueba es QUÉ se
 * pide al compositor y CUÁNDO no se pide nada.
 */

let container: HTMLDivElement;
let root: Root;
let boxes: Record<string, DOMRect>;
let animate: ReturnType<typeof vi.fn>;

const rect = (x: number, y: number, width: number, height: number) => ({ x, y, left: x, top: y, width, height, right: x + width, bottom: y + height, toJSON: () => ({}) }) as DOMRect;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  boxes = {};
  animate = vi.fn(() => {
    const target = new EventTarget() as EventTarget & { cancel: () => void };
    target.cancel = vi.fn();
    return target;
  });
  HTMLElement.prototype.animate = animate as unknown as HTMLElement['animate'];
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const id = this.getAttribute('data-nx-layout-id') ?? (this.dataset.testRoot !== undefined ? 'root' : '');
    return boxes[id] ?? rect(0, 0, 0, 0);
  });
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function Stage({ mode }: { mode: 'code' | 'split' }) {
  const ref = useRef<HTMLDivElement>(null);
  useNexLayoutTransition(ref, mode);
  return (
    <div ref={ref} data-test-root="">
      <section data-nx-layout-id="editor" />
      {mode === 'split' && <section data-nx-layout-id="results" />}
    </div>
  );
}

describe('useNexLayoutTransition', () => {
  it('una superficie que encoge se desplaza; una que llega emerge; el contenido no se reescala', () => {
    boxes = { root: rect(0, 0, 1000, 600), editor: rect(0, 0, 1000, 600) };
    act(() => root.render(<NexProvider reducedMotion="full"><Stage mode="code" /></NexProvider>));
    expect(animate).not.toHaveBeenCalled();
    boxes = { root: rect(0, 0, 1000, 600), editor: rect(0, 0, 500, 600), results: rect(506, 0, 494, 600) };
    act(() => root.render(<NexProvider reducedMotion="full"><Stage mode="split" /></NexProvider>));
    expect(animate).toHaveBeenCalledTimes(1);
    const [frames] = animate.mock.calls[0]!;
    expect(frames[0].opacity).toBe(0);
    // El editor no cambió de origen y encogió: nada que animar (no se reescala).
    expect(JSON.stringify(animate.mock.calls)).not.toContain('scale');
  });

  it('una superficie que crece se descubre con un recorte desde su tamaño anterior', () => {
    expect(layoutKeyframes({ x: 0, y: 0, width: 500, height: 600 }, { x: 0, y: 0, width: 1000, height: 600 }, '10px')).toEqual([
      { transform: 'translate(0px, 0px)', clipPath: 'inset(0px 500px 0px 0px round 10px)' },
      { transform: 'translate(0px, 0px)', clipPath: 'inset(0px 0px 0px 0px round 10px)' },
    ]);
    expect(layoutKeyframes({ x: 300, y: 0, width: 700, height: 600 }, { x: 0, y: 0, width: 1000, height: 600 })![0]!.transform).toBe('translate(300px, 0px)');
    expect(layoutKeyframes({ x: 0, y: 0, width: 10, height: 10 }, { x: 0.2, y: 0, width: 10, height: 10 })).toBeNull();
  });

  it('movimiento reducido: inmediato, sin pedir nada al compositor', () => {
    boxes = { root: rect(0, 0, 1000, 600), editor: rect(0, 0, 1000, 600) };
    act(() => root.render(<NexProvider reducedMotion="reduce"><Stage mode="code" /></NexProvider>));
    boxes = { root: rect(0, 0, 1000, 600), editor: rect(0, 0, 500, 600), results: rect(506, 0, 494, 600) };
    act(() => root.render(<NexProvider reducedMotion="reduce"><Stage mode="split" /></NexProvider>));
    expect(animate).not.toHaveBeenCalled();
  });

  it('un cambio hecho con el teclado es inmediato', () => {
    boxes = { root: rect(0, 0, 1000, 600), editor: rect(0, 0, 1000, 600) };
    container.dataset.nxInput = 'keyboard';
    act(() => root.render(<NexProvider reducedMotion="full"><Stage mode="code" /></NexProvider>));
    boxes = { root: rect(0, 0, 1000, 600), editor: rect(0, 0, 500, 600), results: rect(506, 0, 494, 600) };
    act(() => root.render(<NexProvider reducedMotion="full"><Stage mode="split" /></NexProvider>));
    expect(animate).not.toHaveBeenCalled();
  });

  it('interrumpible: un cambio nuevo cancela el anterior y parte de la última disposición', () => {
    boxes = { root: rect(0, 0, 1000, 600), editor: rect(0, 0, 500, 600), results: rect(506, 0, 494, 600) };
    act(() => root.render(<NexProvider reducedMotion="full"><Stage mode="split" /></NexProvider>));
    boxes = { root: rect(0, 0, 1000, 600), editor: rect(0, 0, 1000, 600) };
    act(() => root.render(<NexProvider reducedMotion="full"><Stage mode="code" /></NexProvider>));
    const growing = animate.mock.results[0]!.value as { cancel: () => void };
    expect(animate.mock.calls[0]![0][0].clipPath).toContain('inset(0px 500px');
    boxes = { root: rect(0, 0, 1000, 600), editor: rect(0, 0, 500, 600), results: rect(506, 0, 494, 600) };
    act(() => root.render(<NexProvider reducedMotion="full"><Stage mode="split" /></NexProvider>));
    expect(growing.cancel).toHaveBeenCalled();
  });
});
