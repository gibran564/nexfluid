import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { edgeScrollStep, keyboardMove, moveItem, reorderSlot } from '../src/reorder.ts';

describe('reorderSlot (dónde cae un elemento arrastrado)', () => {
  const centers = [50, 150, 250];
  it('cuenta los centros por encima del puntero', () => {
    assert.equal(reorderSlot(centers, 0), 0);
    assert.equal(reorderSlot(centers, 100), 1);
    assert.equal(reorderSlot(centers, 249), 2);
    assert.equal(reorderSlot(centers, 999), 3);
  });
  it('sin otros elementos sólo hay un sitio', () => assert.equal(reorderSlot([], 120), 0));
});

describe('moveItem', () => {
  it('mueve hacia abajo y hacia arriba sin mutar la entrada', () => {
    const list = ['a', 'b', 'c', 'd'] as const;
    assert.deepEqual(moveItem(list, 0, 2), ['b', 'c', 'a', 'd']);
    assert.deepEqual(moveItem(list, 3, 0), ['d', 'a', 'b', 'c']);
    assert.deepEqual(list, ['a', 'b', 'c', 'd']);
  });
  it('recorta el destino y tolera un origen fuera de rango', () => {
    assert.deepEqual(moveItem(['a', 'b'], 0, 99), ['b', 'a']);
    assert.deepEqual(moveItem(['a', 'b'], 5, 0), ['a', 'b']);
  });
});

describe('edgeScrollStep', () => {
  it('0 lejos de los bordes; negativo arriba y positivo abajo', () => {
    assert.equal(edgeScrollStep(300, 0, 600), 0);
    assert.ok(edgeScrollStep(10, 0, 600) < 0);
    assert.ok(edgeScrollStep(590, 0, 600) > 0);
  });
  it('crece con la profundidad y no pasa del máximo', () => {
    assert.ok(Math.abs(edgeScrollStep(5, 0, 600)) > Math.abs(edgeScrollStep(40, 0, 600)));
    assert.equal(edgeScrollStep(0, 0, 600, 56, 18), -18);
  });
});

describe('keyboardMove (teclado del asa)', () => {
  it('↑/↓ un puesto, Inicio/Fin a los extremos', () => {
    assert.equal(keyboardMove('ArrowUp', 2, 4), 1);
    assert.equal(keyboardMove('ArrowDown', 2, 4), 3);
    assert.equal(keyboardMove('Home', 2, 4), 0);
    assert.equal(keyboardMove('End', 1, 4), 3);
  });
  it('sin destino en los extremos, en el mismo sitio o con otras teclas', () => {
    assert.equal(keyboardMove('ArrowUp', 0, 4), null);
    assert.equal(keyboardMove('ArrowDown', 3, 4), null);
    assert.equal(keyboardMove('Home', 0, 4), null);
    assert.equal(keyboardMove('Enter', 1, 4), null);
  });
});
