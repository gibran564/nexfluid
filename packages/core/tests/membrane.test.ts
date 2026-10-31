import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { liquidCapsule, MEMBRANE_POINTS, membraneOutline, membranePath, morphMembranes } from '../src/membrane.ts';
import { polygonArea } from '../src/shape.ts';

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b} (±${eps})`);

describe('membranas', () => {
  it('el número de puntos es fijo para cualquier tamaño (interpolables)', () => {
    for (const [w, h] of [[40, 40], [320, 180], [1200, 64], [12, 300]]) {
      assert.equal(membraneOutline(w!, h!, { radius: 18 }).length, MEMBRANE_POINTS());
    }
  });

  it('sin deformación queda dentro del rectángulo y lo llena casi entero', () => {
    const pts = membraneOutline(300, 200, { radius: 20, smoothing: 1 });
    for (const [x, y] of pts) assert.ok(x >= -1e-9 && x <= 300 + 1e-9 && y >= -1e-9 && y <= 200 + 1e-9);
    const area = polygonArea(pts);
    assert.ok(area > 300 * 200 * 0.97 && area < 300 * 200, `${area}`);
  });

  it('la superelipse llena más la esquina que el arco circular', () => {
    const round = polygonArea(membraneOutline(200, 200, { radius: 60, smoothing: 0, cornerPoints: 24 }));
    const squircle = polygonArea(membraneOutline(200, 200, { radius: 60, smoothing: 1, cornerPoints: 24 }));
    assert.ok(squircle > round);
  });

  it('el radio se limita a la mitad del lado menor: cápsula', () => {
    const pts = membraneOutline(200, 40, { radius: 999 });
    for (const [, y] of pts) assert.ok(y >= -1e-9 && y <= 40 + 1e-9);
  });

  it('la atracción abomba sólo cerca del foco y hacia fuera', () => {
    const rest = membraneOutline(300, 200, { radius: 20 });
    const pulled = membraneOutline(300, 200, { radius: 20, attract: { x: 150, y: -10, amount: 8, width: 30 } });
    const top = rest.findIndex(([x, y]) => Math.abs(x - 150) < 1 && y === 0);
    assert.ok(top >= 0);
    near(pulled[top]![1], -8 * Math.exp(-100 / 1800), 1e-6);
    const bottom = rest.findIndex(([, y]) => y === 200);
    near(pulled[bottom]![1], 200, 1e-3);
  });

  it('la presión conserva el área', () => {
    const a = polygonArea(membraneOutline(240, 120, { radius: 24 }));
    const b = polygonArea(membraneOutline(240, 120, { radius: 24, press: 0.05 }));
    near(b, a, a * 1e-9);
  });

  it('morphMembranes interpola tarjeta → panel con extremos exactos', () => {
    const a = membraneOutline(200, 120, { radius: 18 });
    const b = membraneOutline(600, 400, { radius: 28 });
    assert.equal(morphMembranes(a, b, 0), membranePath(200, 120, { radius: 18 }));
    assert.equal(morphMembranes(a, b, 1), membranePath(600, 400, { radius: 28 }));
  });
});

describe('gota líquida (indicador)', () => {
  it('sin pellizco es una cápsula cerrada entre start y end', () => {
    const d = liquidCapsule(10, 110, 32, 0);
    assert.match(d, /^M26 0C/);
    assert.ok(d.endsWith('Z'));
  });
  it('el pellizco estrecha el centro y nunca cruza los bordes', () => {
    const d = liquidCapsule(0, 200, 32, 1);
    const ys = [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[2]));
    assert.ok(Math.max(...ys) <= 32 && Math.min(...ys) >= 0);
    assert.ok(d.includes(' 100 '), 'pasa por el centro');
  });
  it('vertical intercambia ejes y acepta start > end', () => {
    assert.equal(liquidCapsule(50, 10, 20, 0, { vertical: true }).startsWith('M0 20'), true);
  });
});
