import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { anchorClipped, placeFloating, spaceAround } from '../src/anchor.ts';

const viewport = { left: 0, top: 0, width: 400, height: 300 };
const floating = { width: 120, height: 60 };

describe('placeFloating (colocar junto a un ancla)', () => {
  it('debajo y centrado por defecto, separado por gap', () => {
    const p = placeFloating({ anchor: { left: 140, top: 50, width: 40, height: 20 }, floating, viewport });
    assert.deepEqual([p.x, p.y, p.side, p.flipped, p.shift], [100, 76, 'bottom', false, 0]);
    assert.equal(p.arrow, 60);
  });

  it('flip: se da la vuelta si abajo no cabe y arriba sí', () => {
    const p = placeFloating({ anchor: { left: 140, top: 260, width: 40, height: 20 }, floating, viewport });
    assert.equal(p.side, 'top');
    assert.equal(p.flipped, true);
    assert.equal(p.y, 260 - 6 - 60);
  });

  it('sin sitio en ningún lado: el mayor, con maxHeight que lo mantiene dentro', () => {
    const p = placeFloating({ anchor: { left: 140, top: 120, width: 40, height: 20 }, floating: { width: 120, height: 400 }, viewport });
    assert.equal(p.side, 'bottom'); // 146 abajo frente a 106 arriba
    assert.equal(p.maxHeight, 300 - 140 - 6 - 8);
    assert.ok(p.y + Math.min(400, p.maxHeight) <= 300 - 8);
  });

  it('shift: se desliza dentro del margen seguro y lo informa', () => {
    const p = placeFloating({ anchor: { left: 2, top: 50, width: 10, height: 20 }, floating, viewport });
    assert.equal(p.x, 8);
    assert.ok(p.shift > 0);
    assert.equal(p.arrow, 0); // el centro del ancla queda en el borde izquierdo de la superficie
    const right = placeFloating({ anchor: { left: 390, top: 50, width: 10, height: 20 }, floating, viewport });
    assert.equal(right.x, 400 - 8 - 120);
  });

  it('alineación lógica: start es la derecha en RTL', () => {
    const anchor = { left: 200, top: 50, width: 60, height: 20 };
    assert.equal(placeFloating({ anchor, floating, viewport, align: 'start' }).x, 200);
    assert.equal(placeFloating({ anchor, floating, viewport, align: 'start', dir: 'rtl' }).x, 260 - 120);
  });

  it('lados horizontales y viewport visual desplazado (teclado en pantalla, zoom)', () => {
    const vv = { left: 0, top: 500, width: 400, height: 200 };
    const p = placeFloating({ anchor: { left: 20, top: 560, width: 30, height: 20 }, floating, viewport: vv, side: 'right' });
    assert.equal(p.side, 'right');
    assert.equal(p.x, 56);
    assert.ok(p.y >= 508 && p.y + 60 <= 692);
    // Un ancla de anchura 0 (un cursor) también sirve.
    const caret = placeFloating({ anchor: { left: 200, top: 100, width: 0, height: 18 }, floating, viewport, side: 'top' });
    assert.equal(caret.x, 140);
  });

  it('sin flip ni shift respeta lo pedido aunque se salga', () => {
    const p = placeFloating({ anchor: { left: 2, top: 260, width: 10, height: 20 }, floating, viewport, flip: false, shift: false });
    assert.equal(p.side, 'bottom');
    assert.equal(p.x, 2 + 5 - 60);
  });

  it('spaceAround y anchorClipped', () => {
    assert.deepEqual(spaceAround({ left: 100, top: 100, width: 10, height: 10 }, viewport, 0, 0), { top: 100, bottom: 190, left: 100, right: 290 });
    assert.equal(anchorClipped({ left: 10, top: -40, width: 10, height: 20 }, [viewport]), true);
    assert.equal(anchorClipped({ left: 10, top: -10, width: 10, height: 20 }, [viewport]), false);
  });
});
