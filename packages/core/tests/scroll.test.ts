import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { activeSection, markerPosition, offsetForThumb, scrollThumb, scrollThumbPath, type ScrollMetrics } from '../src/scroll.ts';

const doc: ScrollMetrics = { offset: 0, viewport: 400, content: 2000, track: 380 };
const extent = (d: string, axis: 0 | 1) => {
  const n = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const v = n.filter((_, i) => i % 2 === axis);
  return [Math.min(...v), Math.max(...v)] as const;
};

describe('NexScroll · geometría', () => {
  it('el pulgar es exacto: longitud = fracción visible, posición = scroll real', () => {
    const g = scrollThumb({ ...doc, offset: 800 });
    assert.equal(g.overflow, true);
    assert.equal(g.max, 1600);
    assert.equal(g.length, 76); // 380 · 400 / 2000
    assert.equal(g.progress, 0.5);
    assert.equal(g.start, (380 - 76) / 2);
    assert.equal(scrollThumb({ ...doc, offset: 1600 }).start + 76, 380); // al final toca el extremo
  });

  it('longitud mínima en documentos muy largos, sin perder los extremos', () => {
    const g = scrollThumb({ offset: 0, viewport: 400, content: 400_000, track: 380 }, 28);
    assert.equal(g.length, 28);
    assert.equal(scrollThumb({ offset: 399_600, viewport: 400, content: 400_000, track: 380 }, 28).start, 352);
  });

  it('sin desbordamiento no hay pulgar ni progreso', () => {
    const g = scrollThumb({ offset: 0, viewport: 400, content: 400, track: 380 });
    assert.equal(g.overflow, false);
    assert.equal(g.progress, 0);
  });

  it('el desbordamiento no depende de que el riel ya esté medido', () => {
    assert.equal(scrollThumb({ ...doc, track: 0 }).overflow, true);
  });

  it('arrastrar es la inversa exacta de la posición', () => {
    for (const offset of [0, 123, 800, 1599, 1600]) {
      const g = scrollThumb({ ...doc, offset });
      assert.ok(Math.abs(offsetForThumb(doc, g.start) - offset) < 1e-9);
    }
    assert.equal(offsetForThumb(doc, -50), 0);
    assert.equal(offsetForThumb(doc, 9999), 1600);
  });

  it('marcadores: centro del pulgar cuando la sección queda arriba (las del final se recortan al máximo)', () => {
    assert.equal(markerPosition(doc, 0), 38);
    assert.equal(markerPosition(doc, 800), (380 - 76) / 2 + 38);
    assert.equal(markerPosition(doc, 1900), 380 - 38);
  });

  it('sección activa por línea de lectura; al final, la última', () => {
    const offsets = [0, 500, 1000, 1500, 1900];
    assert.equal(activeSection(offsets, { offset: 0, viewport: 400, content: 2000 }), 0);
    assert.equal(activeSection(offsets, { offset: 400, viewport: 400, content: 2000 }, 0.3), 1); // 400 + 120 ≥ 500
    assert.equal(activeSection(offsets, { offset: 300, viewport: 400, content: 2000 }, 0.3), 0);
    assert.equal(activeSection(offsets, { offset: 1600, viewport: 400, content: 2000 }), 4);
    assert.equal(activeSection([], { offset: 0, viewport: 400, content: 2000 }), -1);
  });

  it('la deformación nunca falsea la posición: el contorno cubre siempre el pulgar real', () => {
    const g = scrollThumb({ ...doc, offset: 640 });
    const rest = scrollThumbPath(g, { stretch: 0, thickness: 4, orientation: 'vertical', cross: 5 });
    const [s0, e0] = extent(rest, 1);
    assert.ok(Math.abs(s0 - g.start) < 0.01 && Math.abs(e0 - (g.start + g.length)) < 0.01, 'en reposo es exacto');
    for (const stretch of [-20, -6, 6, 20]) {
      const [s, e] = extent(scrollThumbPath(g, { stretch, thickness: 4, orientation: 'vertical', cross: 5 }), 1);
      assert.ok(s <= g.start + 0.01 && e >= g.start + g.length - 0.01, `cubre con estiramiento ${stretch}`);
      // Tensión direccional: el borde que avanza se adelanta más que lo que se retrasa el otro.
      const lead = stretch > 0 ? e - (g.start + g.length) : g.start - s;
      const trail = stretch > 0 ? g.start - s : e - (g.start + g.length);
      assert.ok(lead > trail);
    }
  });

  it('al estirarse adelgaza (volumen) y en horizontal el eje es x', () => {
    const g = scrollThumb({ ...doc, offset: 640 });
    const [c0, c1] = extent(scrollThumbPath(g, { stretch: 24, thickness: 8, orientation: 'vertical', cross: 0 }), 0);
    assert.ok(c1 - c0 < 8 && c1 - c0 >= 8 * 0.72 - 0.01);
    const [x0, x1] = extent(scrollThumbPath(g, { stretch: 0, thickness: 4, orientation: 'horizontal', cross: 2 }), 0);
    assert.ok(Math.abs(x0 - g.start) < 0.01 && Math.abs(x1 - g.start - g.length) < 0.01);
  });
});
