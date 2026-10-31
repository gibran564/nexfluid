import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FluidClock } from '../src/clock.ts';
import { membraneOutline } from '../src/membrane.ts';
import { polygonArea, type Point } from '../src/shape.ts';
import {
  MORPH_PHYSICS, MorphTransition, alignContours, dampingForOvershoot, deformContour, metaballPath, morphRect,
  morphTimeline, morphTiming, overshootOf, resampleContour, resolveMorphPhysics, type MorphFrame, type MorphTransitionOptions,
} from '../src/morph.ts';

const manualClock = () => new FluidClock({ host: { requestFrame: () => 1, cancelFrame: () => {} } });
const card = { rect: { x: 40, y: 300, width: 240, height: 160 }, radius: 22 };
const panel = { rect: { x: 400, y: 40, width: 720, height: 560 }, radius: 28 };

function run(clock: FluidClock, seconds: number, dt = 1 / 60) {
  for (let t = 0; t < seconds; t += dt) clock.advance(dt);
}

describe('NexMorph · física', () => {
  it('duraciones percibidas: micro 150–300 ms, mayores 300–550 ms', () => {
    for (const name of ['precision', 'flow'] as const) {
      const { visual } = morphTiming(MORPH_PHYSICS[name]);
      assert.ok(visual >= 0.15 && visual <= 0.3, `${name}: ${visual}`);
    }
    for (const name of ['viscous', 'morph', 'spatial'] as const) {
      const { visual } = morphTiming(MORPH_PHYSICS[name]);
      assert.ok(visual >= 0.3 && visual <= 0.55, `${name}: ${visual}`);
    }
  });

  it('sin rebote exagerado: sobrepaso ≤ 4 % en todas las familias', () => {
    for (const p of Object.values(MORPH_PHYSICS)) assert.ok(morphTiming(p).overshoot <= 0.04);
  });

  it('el sobrepaso pedido se cumple (analítico)', () => {
    const d = dampingForOvershoot(0.1, 300, 1);
    assert.ok(Math.abs(overshootOf({ mass: 1, stiffness: 300, damping: d }) - 0.1) < 1e-9);
    const p = resolveMorphPhysics('morph', { overshoot: 0.05 });
    assert.ok(Math.abs(overshootOf(p) - 0.05) < 1e-9);
    assert.equal(MORPH_PHYSICS.morph.damping, 25, 'la familia no se muta');
  });

  it('coreografía: el contenido entra después de la superficie y sale antes', () => {
    const open = morphTimeline(MORPH_PHYSICS.morph, 1);
    const firstContent = open.samples.find((s) => s.content > 0.01)!;
    assert.ok(firstContent.size >= 0.6, `contenido con size=${firstContent.size}`);
    const close = morphTimeline(MORPH_PHYSICS.morph, 0);
    const firstMove = close.samples.find((s) => s.size < 0.99)!;
    assert.ok(firstMove.content <= 0.36, `superficie se mueve con contenido=${firstMove.content}`);
  });

  it('la línea de tiempo es determinista y casi independiente del paso', () => {
    const a = morphTimeline(MORPH_PHYSICS.viscous, 1, { dt: 1 / 240 });
    const b = morphTimeline(MORPH_PHYSICS.viscous, 1, { dt: 1 / 240 });
    assert.deepEqual(a.samples.at(-1), b.samples.at(-1));
    const c = morphTimeline(MORPH_PHYSICS.viscous, 1, { dt: 1 / 60 });
    assert.ok(Math.abs(a.surface - c.surface) < 0.03);
  });
});

describe('NexMorph · geometría', () => {
  it('la caja crece desde el centro del origen', () => {
    assert.deepEqual(morphRect(card.rect, panel.rect, 0, 0), card.rect);
    const moved = morphRect(card.rect, panel.rect, 1, 0);
    assert.equal(moved.width, 240);
    assert.equal(moved.x + moved.width / 2, 400 + 360);
  });

  it('la deformación por velocidad conserva el área y estira en la dirección del movimiento', () => {
    const base = membraneOutline(200, 120, { radius: 20 });
    const moved = deformContour(base, [3000, 0], { deformation: 0.12, tension: 0 });
    assert.ok(Math.abs(polygonArea(moved) / polygonArea(base) - 1) < 1e-9);
    const width = (pts: Point[]) => Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));
    const height = (pts: Point[]) => Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]));
    assert.ok(width(moved) > width(base) && height(moved) < height(base));
    // El borde delantero avanza más de lo que retrocede el trasero.
    const lead = Math.max(...moved.map((p) => p[0])) - 200;
    const trail = -Math.min(...moved.map((p) => p[0]));
    assert.ok(lead > trail);
  });

  it('la tensión superficial reduce la deformación; en reposo no hay', () => {
    const base = membraneOutline(200, 120, { radius: 20 });
    const loose = deformContour(base, [3000, 0], { deformation: 0.12, tension: 0 });
    const tight = deformContour(base, [3000, 0], { deformation: 0.12, tension: 1 });
    const spread = (pts: Point[]) => Math.max(...pts.map((p) => p[0]));
    assert.ok(spread(loose) > spread(tight));
    assert.deepEqual(deformContour(base, [0, 0], { deformation: 0.12 }), base);
  });

  it('remuestreo por longitud de arco y correspondencia de puntos', () => {
    const square: Point[] = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const r = resampleContour(square, 8);
    assert.equal(r.length, 8);
    assert.deepEqual(r[1], [5, 0]);
    const rotated = [...r.slice(3), ...r.slice(0, 3)];
    assert.deepEqual(alignContours(r, rotated), r);
    assert.deepEqual(alignContours(r, [...r].reverse()), r);
  });

  it('metaball: cuello entre círculos cercanos, nada si están lejos o contenidos', () => {
    assert.match(metaballPath({ x: 0, y: 0, r: 20 }, { x: 50, y: 0, r: 16 }) ?? '', /^M.*A16 16.*Z$/);
    assert.equal(metaballPath({ x: 0, y: 0, r: 20 }, { x: 500, y: 0, r: 16 }, { maxDistance: 120 }), null);
    assert.equal(metaballPath({ x: 0, y: 0, r: 40 }, { x: 5, y: 0, r: 10 }), null);
  });
});

describe('NexMorph · MorphTransition', () => {
  const make = (extra: Partial<MorphTransitionOptions> = {}) => {
    const clock = manualClock();
    const frames: MorphFrame[] = [];
    const rests: string[] = [];
    let from = card;
    const t = new MorphTransition({
      physics: 'morph', clock, from: () => from, to: () => panel,
      onFrame: (f) => frames.push(f), onRest: (s) => rests.push(s), ...extra,
    });
    return { t, clock, frames, rests, moveSource: (x: number) => { from = { ...card, rect: { ...card.rect, x } }; } };
  };

  it('abre desde el origen, llega al destino y se duerme', () => {
    const { t, clock, frames, rests } = make();
    t.open();
    run(clock, 0.016);
    assert.ok(Math.abs(frames[0]!.rect.width - card.rect.width) < 20, 'empieza con el tamaño de la tarjeta');
    run(clock, 2);
    const last = frames.at(-1)!;
    assert.deepEqual(last.rect, panel.rect);
    assert.equal(last.radius, 28);
    assert.equal(last.incoming, 1);
    assert.equal(last.outgoing, 0);
    assert.deepEqual(rests, ['open']);
    assert.equal(t.state, 'open');
    assert.equal(clock.size, 0, 'sin tareas en reposo');
  });

  it('sin saltos: interrumpir y alternar rápido parte del estado visual actual', () => {
    const { t, clock, frames } = make();
    t.open();
    run(clock, 0.15);
    const before = frames.at(-1)!;
    t.close();
    clock.advance(1 / 60);
    let prev = frames.at(-1)!.rect.width;
    assert.ok(Math.abs(prev - before.rect.width) < 40, `${before.rect.width} → ${prev}`);
    for (let i = 0; i < 12; i++) {
      if (i % 2) t.open();
      else t.close();
      for (let k = 0; k < 4; k++) {
        clock.advance(1 / 60);
        const w = frames.at(-1)!.rect.width;
        assert.ok(Math.abs(w - prev) < 60, `salto ${prev} → ${w}`);
        prev = w;
      }
    }
  });

  it('el regreso va a la posición actual del origen aunque el layout cambie', () => {
    const { t, clock, frames, moveSource, rests } = make();
    t.open();
    run(clock, 2);
    moveSource(600);
    t.close();
    run(clock, 2);
    assert.equal(frames.at(-1)!.rect.x, 600);
    assert.deepEqual(rests, ['open', 'closed']);
    assert.equal(t.state, 'closed');
  });

  it('pausa, seek y reanudación (scrubber)', () => {
    const { t, clock, frames } = make();
    t.open();
    t.seek(0.5);
    const mid = frames.at(-1)!;
    assert.ok(mid.size > 0.3 && mid.size < 1.05, `${mid.size}`);
    assert.equal(t.paused, true);
    run(clock, 0.5);
    assert.equal(frames.at(-1), mid, 'en pausa no avanza');
    t.seek(0);
    assert.deepEqual(frames.at(-1)!.rect, card.rect);
    t.resume();
    run(clock, 2);
    assert.deepEqual(frames.at(-1)!.rect, panel.rect);
  });

  it('movimiento reducido: inmediato, sin reloj', () => {
    const { t, clock, frames, rests } = make({ reduced: () => true });
    t.open();
    assert.equal(clock.size, 0);
    assert.deepEqual(frames.at(-1)!.rect, panel.rect);
    assert.deepEqual(rests, ['open']);
  });

  it('dispose libera el reloj', () => {
    const { t, clock } = make();
    t.open();
    assert.equal(clock.size, 1);
    t.dispose();
    assert.equal(clock.size, 0);
  });
});
