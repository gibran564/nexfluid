import { act, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { createRoot, type Root } from 'react-dom/client';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NexEditorialBlock, NexFlow, NexGrid, NexGridItem, NexProvider } from '@nexfluid/react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
const $$ = (sel: string) => [...container.querySelectorAll<HTMLElement>(sel)];
const key = (el: Element, k: string, init: KeyboardEventInit = {}) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })); });

function Editable({ onMove }: { onMove?: (order: string[]) => void }) {
  const [items, setItems] = useState([{ id: 'code', span: 8 }, { id: 'output', span: 4 }, { id: 'debug', span: 12 }]);
  return (
    <NexGrid
      columns={12}
      gap="medium"
      onReorder={(from, to) => setItems((current) => { const next = [...current]; const [m] = next.splice(from, 1); next.splice(to, 0, m!); onMove?.(next.map((i) => i.id)); return next; })}
      onResize={(id, span) => setItems((current) => current.map((i) => (i.id === id ? { ...i, span } : i)))}
    >
      {items.map((item) => <NexGridItem key={item.id} itemId={item.id} span={item.span} label={item.id}><p>{item.id}</p></NexGridItem>)}
    </NexGrid>
  );
}

describe('NexGrid', () => {
  it('renders spans and gap through variables, without editing chrome in read mode', () => {
    act(() => root.render(<NexGrid columns={12} gap="compact"><NexGridItem itemId="a" span={8}>A</NexGridItem><NexGridItem itemId="b" span={40} rowSpan={2} spanCompact={6}>B</NexGridItem></NexGrid>));
    const grid = container.querySelector<HTMLElement>('.nx-grid')!;
    expect(grid.style.getPropertyValue('--nx-grid-columns')).toBe('12');
    expect(grid.style.getPropertyValue('--nx-grid-gap')).toContain('--nx-space-3');
    const [a, b] = $$('[data-nx-grid-item]');
    expect(a!.style.getPropertyValue('--nx-grid-span')).toBe('8');
    expect(b!.style.getPropertyValue('--nx-grid-span')).toBe('12');
    expect(b!.style.getPropertyValue('--nx-grid-row-span')).toBe('2');
    expect(b!.style.getPropertyValue('--nx-grid-span-compact')).toBe('6');
    expect($$('[data-nx-grid-handle]')).toHaveLength(0);
  });

  it('reorders with arrows and resizes with Shift+arrows, announcing each change', () => {
    const moves: string[][] = [];
    act(() => root.render(<Editable onMove={(order) => moves.push(order)} />));
    const handle = () => container.querySelector('[data-nx-grid-item="code"] > [data-nx-grid-handle]')!;
    key(handle(), 'ArrowRight');
    expect(moves.at(-1)).toEqual(['output', 'code', 'debug']);
    expect(container.querySelector('[role="status"]')!.textContent).toBe('code: posición 2 de 3');
    expect(document.activeElement).toBe(handle());
    key(handle(), 'ArrowLeft', { shiftKey: true });
    expect(container.querySelector<HTMLElement>('[data-nx-grid-item="code"]')!.style.getPropertyValue('--nx-grid-span')).toBe('7');
    expect(container.querySelector('[role="status"]')!.textContent).toBe('code: 7 de 12 columnas');
    key(handle(), 'ArrowDown');
    expect(moves.at(-1)).toEqual(['output', 'debug', 'code']);
  });

  it('has no axe violations in edit mode and exposes accessible handles', async () => {
    act(() => root.render(<Editable />));
    const labels = $$('[data-nx-grid-handle]').map((h) => h.getAttribute('aria-label'));
    expect(labels[0]).toMatch(/^code: 8 de 12 columnas\. flechas para mover; Mayús/);
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });

  it('does not animate when motion is reduced', () => {
    const animate = vi.fn();
    const original = HTMLElement.prototype.animate;
    HTMLElement.prototype.animate = animate as never;
    act(() => root.render(<NexProvider reducedMotion="reduce"><Editable /></NexProvider>));
    key(container.querySelector('[data-nx-grid-handle]')!, 'ArrowRight');
    expect(animate).not.toHaveBeenCalled();
    HTMLElement.prototype.animate = original;
  });

  it('caps nesting depth: the third level stacks in one column', () => {
    act(() => root.render(
      <NexGrid><NexGridItem itemId="a"><NexGrid columns={6}><NexGridItem itemId="b"><NexGrid columns={4}><NexGridItem itemId="c" span={2}>C</NexGridItem></NexGrid></NexGridItem></NexGrid></NexGridItem></NexGrid>
    ));
    const grids = $$('.nx-grid');
    expect(grids.map((g) => g.dataset.nxDepth)).toEqual(['1', '2', '3']);
    expect(grids[2]!.hasAttribute('data-nx-depth-capped')).toBe(true);
    expect(grids[2]!.style.getPropertyValue('--nx-grid-columns')).toBe('1');
  });

  it('renders on the server (SSR) without browser APIs', () => {
    const html = renderToString(<NexGrid columns={12}><NexGridItem itemId="x" span={6}>X</NexGridItem></NexGrid>);
    expect(html).toContain('nx-grid__track');
    expect(html).toContain('--nx-grid-span:6');
  });

  it('lives inside a NexFlow block without competing for order', () => {
    const flowMoves: number[] = [];
    act(() => root.render(
      <NexFlow mode="edit" onReorder={(from, to) => flowMoves.push(from, to)}>
        <NexEditorialBlock blockId="intro" label="Intro"><p>Intro</p></NexEditorialBlock>
        <NexEditorialBlock blockId="layout" label="Composición"><Editable /></NexEditorialBlock>
      </NexFlow>
    ));
    key(container.querySelector('[data-nx-grid-item="code"] > [data-nx-grid-handle]')!, 'ArrowRight');
    expect(flowMoves).toEqual([]);
    expect($$('[data-nx-grid-item]').map((el) => el.dataset.nxGridItem)).toEqual(['output', 'code', 'debug']);
    expect($$('[data-nx-flow-item]').map((el) => el.dataset.nxFlowItem)).toEqual(['intro', 'layout']);
  });
});
