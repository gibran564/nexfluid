import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { baseRadius, makeHarmonics, mixContours, polygonArea, sampleContour, toSmoothPath } from '../src/shape.ts';

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b} (±${eps})`);

describe('geometría base', () => {
  it('superelipse: n = 2 es un círculo y n alto se acerca al cuadrado', () => {
    for (let t = 0; t < Math.PI * 2; t += 0.3) near(baseRadius({ kind: 'superellipse', exponent: 2 }, t), 1, 1e-12);
    near(baseRadius({ kind: 'superellipse', exponent: 40 }, Math.PI / 4), Math.SQRT2, 0.03);
  });

  it('elipse con aspect 2 mide 2 en horizontal y 1 en vertical', () => {
    near(baseRadius({ kind: 'ellipse', aspect: 2 }, 0), 2, 1e-12);
    near(baseRadius({ kind: 'ellipse', aspect: 2 }, Math.PI / 2), 1, 1e-12);
  });
});

describe('contorno orgánico', () => {
  const harmonics = makeHarmonics(7);

  it('es determinista: misma semilla y fase, mismo trazado', () => {
    const a = toSmoothPath(sampleContour({ points: 24, base: { kind: 'circle' }, harmonics, ambient: 0.05, phase: 1.3 }));
    const b = toSmoothPath(sampleContour({ points: 24, base: { kind: 'circle' }, harmonics: makeHarmonics(7), ambient: 0.05, phase: 1.3 }));
    assert.equal(a, b);
    assert.notEqual(a, toSmoothPath(sampleContour({ points: 24, base: { kind: 'circle' }, harmonics: makeHarmonics(8), ambient: 0.05, phase: 1.3 })));
  });

  it('conserva el área (volumen de la materia) bajo deformación', () => {
    const ref = polygonArea(sampleContour({ points: 48, base: { kind: 'circle' } }));
    const deformed = sampleContour({
      points: 48,
      base: { kind: 'circle' },
      harmonics,
      ambient: 0.08,
      phase: 0.4,
      deformation: { bulge: { angle: 1, amount: 0.15 }, squash: { angle: 0.3, amount: 0.2 } },
      preserveArea: true,
    });
    near(polygonArea(deformed), ref, ref * 1e-9);
  });

  it('el aplastamiento por sí solo ya conserva el área', () => {
    const ref = polygonArea(sampleContour({ points: 64, base: { kind: 'circle' } }));
    near(polygonArea(sampleContour({ points: 64, base: { kind: 'circle' }, deformation: { squash: { angle: 0.7, amount: 0.3 } } })), ref, ref * 1e-9);
  });

  it('el abultamiento estira hacia el ángulo pedido', () => {
    const pts = sampleContour({ points: 32, base: { kind: 'circle' }, deformation: { bulge: { angle: 0, amount: 0.2 } } });
    near(pts[0]![0], 1.2, 1e-9);
    near(Math.hypot(...pts[16]!), 1, 0.01);
  });

  it('la deformación ambiental queda acotada por su amplitud', () => {
    for (let phase = 0; phase < 5; phase += 0.37) {
      for (const [x, y] of sampleContour({ points: 32, base: { kind: 'circle' }, harmonics, ambient: 0.05, phase })) {
        const r = Math.hypot(x, y);
        assert.ok(r >= 0.95 - 1e-9 && r <= 1.05 + 1e-9, `r = ${r}`);
      }
    }
  });

  it('mixContours interpola extremos exactos y rechaza contornos incompatibles', () => {
    const a = sampleContour({ points: 16, base: { kind: 'circle' } });
    const b = sampleContour({ points: 16, base: { kind: 'superellipse', exponent: 5 } });
    assert.deepEqual(mixContours(a, b, 0), a);
    assert.deepEqual(mixContours(a, b, 1), b);
    assert.throws(() => mixContours(a, sampleContour({ points: 12, base: { kind: 'circle' } }), 0.5), RangeError);
  });

  it('toSmoothPath: un comando C por punto, cerrado y con precisión fija', () => {
    const d = toSmoothPath(sampleContour({ points: 12, base: { kind: 'circle' } }), { scale: 72 });
    assert.match(d, /^M72 0C/);
    assert.equal(d.match(/C/g)!.length, 12);
    assert.ok(d.endsWith('Z'));
    assert.doesNotMatch(d, /\d\.\d{3}/);
    assert.doesNotMatch(d, /-0[ C]/);
  });
});
