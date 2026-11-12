import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clampSpan, gridGapValue, gridKeyboardMove, gridReorderSlot, gridResizeStep, gridRowsOf, normalizeGridLayout, NEX_GRID_LIMITS } from '../src/grid.ts';

describe('normalizeGridLayout (contrato serializable)', () => {
  it('acota columnas, anchos, filas y separación; descarta ids inválidos o repetidos', () => {
    const result = normalizeGridLayout({ columns: 40, gap: 'enorme', items: [
      { id: 'code', span: 30, rowSpan: 9 }, { id: 'code', span: 3 }, { id: '1bad', span: 2 }, { id: 'out', span: 0, spanCompact: 99 }, 'x',
    ] });
    assert.ok(result);
    assert.deepEqual(result.layout, { version: 1, columns: 12, gap: 'medium', items: [{ id: 'code', span: 12, rowSpan: 6 }, { id: 'out', span: 1, spanCompact: 12 }] });
    assert.ok(result.corrections.length >= 4);
    assert.equal(normalizeGridLayout('no'), null);
    assert.equal(normalizeGridLayout([]), null);
  });
  it('limita el número de elementos', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: `i${i}`, span: 1 }));
    assert.equal(normalizeGridLayout({ columns: 12, items })!.layout.items.length, NEX_GRID_LIMITS.maxItems);
  });
});

describe('colocación y teclado', () => {
  const spans = [12, 7, 5, 4, 4, 4];
  it('agrupa en filas por colocación automática', () => assert.deepEqual(gridRowsOf(spans, 12), [[0], [1, 2], [3, 4, 5]]));
  it('←/→ en orden de lectura; ↑/↓ a la fila vecina más cercana en columna', () => {
    assert.equal(gridKeyboardMove('ArrowRight', 1, spans, 12), 2);
    assert.equal(gridKeyboardMove('ArrowLeft', 0, spans, 12), null);
    assert.equal(gridKeyboardMove('ArrowDown', 2, spans, 12), 5);
    assert.equal(gridKeyboardMove('ArrowDown', 1, spans, 12), 3);
    assert.equal(gridKeyboardMove('ArrowUp', 1, spans, 12), 0);
    assert.equal(gridKeyboardMove('End', 0, spans, 12), 5);
    assert.equal(gridKeyboardMove('Enter', 0, spans, 12), null);
  });
  it('Mayús+flechas cambia el ancho dentro de 1..columnas', () => {
    assert.equal(gridResizeStep('ArrowRight', 6, 12), 7);
    assert.equal(gridResizeStep('ArrowLeft', 1, 12), null);
    assert.equal(gridResizeStep('ArrowRight', 12, 12), null);
    assert.equal(clampSpan(99, 6), 6);
  });
  it('destino 2D de un arrastre', () => {
    const rects = [{ left: 0, top: 0, width: 100, height: 50 }, { left: 110, top: 0, width: 100, height: 50 }, { left: 0, top: 60, width: 210, height: 50 }];
    assert.equal(gridReorderSlot(rects, { x: 5, y: 10 }), 0);
    assert.equal(gridReorderSlot(rects, { x: 80, y: 10 }), 1);
    assert.equal(gridReorderSlot(rects, { x: 200, y: 25 }), 2);
    assert.equal(gridReorderSlot(rects, { x: 50, y: 200 }), 3);
  });
  it('la separación sale de los tokens de espacio', () => assert.match(gridGapValue('compact'), /--nx-space-3/));
});
