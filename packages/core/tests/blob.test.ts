import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { JSDOM } from 'jsdom';
import { FluidClock, type ClockHost } from '../src/clock.ts';
import { createMotionPreference, type MotionPreference } from '../src/motion-preference.ts';
import type { createFluidBlob as CreateFluidBlob } from '../src/fluid-blob.ts';

let dom: JSDOM;
let createFluidBlob: typeof CreateFluidBlob;

before(async () => {
  dom = new JSDOM('<!doctype html><div id="host"></div>');
  const g = globalThis as Record<string, unknown>;
  g.document = dom.window.document;
  g.HTMLElement = dom.window.HTMLElement;
  ({ createFluidBlob } = await import('../src/fluid-blob.ts'));
});
after(() => dom.window.close());

/** Reloj sin requestAnimationFrame: sólo avanza con clock.advance(). */
const idleHost: ClockHost = { requestFrame: () => 1, cancelFrame: () => {} };

function setup(mode: 'full' | 'reduce' = 'full') {
  const host = document.createElement('div');
  document.body.append(host);
  const clock = new FluidClock({ host: idleHost });
  const motionPreference: MotionPreference = createMotionPreference(mode, null);
  return { host, clock, motionPreference };
}

const settle = (clock: FluidClock, seconds = 3) => {
  for (let t = 0; t < seconds; t += 1 / 60) clock.advance(1 / 60);
};

describe('FluidBlob', () => {
  it('monta un SVG decorativo por defecto y nombrado si recibe label', () => {
    const { host, clock, motionPreference } = setup();
    const blob = createFluidBlob(host, { clock, motionPreference });
    assert.equal(blob.element.getAttribute('aria-hidden'), 'true');
    assert.equal(blob.element.getAttribute('focusable'), 'false');
    blob.update({ label: 'Estado del proyecto' });
    assert.equal(blob.element.getAttribute('role'), 'img');
    assert.equal(blob.element.getAttribute('aria-label'), 'Estado del proyecto');
    assert.equal(blob.element.hasAttribute('aria-hidden'), false);
    blob.destroy();
  });

  it('sin ambiente se duerme en reposo: no consume el reloj', () => {
    const { host, clock, motionPreference } = setup();
    const blob = createFluidBlob(host, { clock, motionPreference, ambient: false });
    blob.press();
    assert.ok(blob.awake);
    clock.advance(0.05);
    const pressed = blob.path;
    blob.release();
    settle(clock);
    assert.equal(blob.awake, false);
    assert.equal(clock.size, 0);
    assert.notEqual(blob.path, pressed);
    blob.destroy();
  });

  it('presionar y soltar recupera exactamente la forma inicial (sin ambiente)', () => {
    const { host, clock, motionPreference } = setup();
    const blob = createFluidBlob(host, { clock, motionPreference, ambient: false, motion: 'elastic' });
    const initial = blob.path;
    blob.press();
    blob.attract(1.2, 1);
    settle(clock, 0.4);
    assert.notEqual(blob.path, initial);
    blob.release();
    blob.attract(0, 0);
    settle(clock);
    assert.equal(blob.path, initial);
    blob.destroy();
  });

  it('con ambiente sigue suscrito y la forma cambia con el tiempo', () => {
    const { host, clock, motionPreference } = setup();
    const blob = createFluidBlob(host, { clock, motionPreference, motion: 'ambient' });
    const first = blob.path;
    settle(clock, 2);
    assert.ok(blob.awake);
    assert.notEqual(blob.path, first);
    blob.pause();
    assert.equal(blob.awake, false);
    blob.resume();
    assert.ok(blob.awake);
    blob.destroy();
  });

  it('movimiento reducido: sin ambiente, sin suscripción y cambios instantáneos', () => {
    const { host, clock, motionPreference } = setup('reduce');
    const blob = createFluidBlob(host, { clock, motionPreference, motion: 'ambient' });
    assert.equal(blob.awake, false);
    const still = blob.path;
    blob.attract(0, 1);
    assert.equal(blob.path, still, 'la atracción no deforma en modo reducido');
    blob.press();
    assert.equal(blob.awake, false);
    assert.notEqual(blob.path, still, 'la presión sigue dando retroalimentación, sin animar');
    blob.release();
    assert.equal(blob.path, still);
    blob.destroy();
  });

  it('cambiar a reducido en caliente detiene la animación', () => {
    const { host, clock, motionPreference } = setup('full');
    const blob = createFluidBlob(host, { clock, motionPreference, motion: 'ambient' });
    assert.ok(blob.awake);
    motionPreference.mode = 'reduce';
    assert.equal(blob.awake, false);
    assert.equal(clock.size, 0);
    motionPreference.mode = 'full';
    assert.ok(blob.awake);
    blob.destroy();
  });

  it('destroy limpia DOM, reloj, preferencia y listeners de puntero', () => {
    const { host, clock, motionPreference } = setup('full');
    const blob = createFluidBlob(host, { clock, motionPreference });
    blob.destroy();
    blob.destroy();
    assert.equal(host.querySelector('svg'), null);
    assert.equal(clock.size, 0);
    motionPreference.mode = 'reduce';
    motionPreference.mode = 'full';
    assert.equal(clock.size, 0, 'una preferencia que cambia no resucita un blob destruido');
    host.dispatchEvent(new dom.window.MouseEvent('pointerdown', { button: 0 }));
    assert.equal(clock.size, 0, 'el puntero ya no lo despierta');
  });

  it('la misma semilla produce la misma forma en dos instancias', () => {
    const a = setup();
    const b = setup();
    const x = createFluidBlob(a.host, { clock: a.clock, motionPreference: a.motionPreference, seed: 3, motion: 'morph' });
    const y = createFluidBlob(b.host, { clock: b.clock, motionPreference: b.motionPreference, seed: 3, motion: 'morph' });
    settle(a.clock, 1);
    settle(b.clock, 1);
    assert.equal(x.path, y.path);
    x.destroy();
    y.destroy();
  });
});
