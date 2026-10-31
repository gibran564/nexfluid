import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FluidClock, type ClockHost } from '../src/clock.ts';
import { createMotionPreference } from '../src/motion-preference.ts';
import { MOTION_PRESETS, resolveMotion, type MotionPresetName } from '../src/presets.ts';
import { dampingRatio, FluidValue, measureStepResponse, stepSpring, type SpringParams } from '../src/spring.ts';

const near = (a: number, b: number, eps: number, msg?: string) => assert.ok(Math.abs(a - b) <= eps, msg ?? `${a} ≉ ${b} (±${eps})`);

describe('resorte analítico', () => {
  const cases: Array<[string, SpringParams]> = [
    ['subamortiguado', { stiffness: 300, damping: 10, mass: 1 }],
    ['crítico', { stiffness: 100, damping: 20, mass: 1 }],
    ['sobreamortiguado', { stiffness: 100, damping: 40, mass: 1 }],
  ];

  for (const [name, p] of cases) {
    it(`${name}: independiente del framerate (30, 60, 144 Hz e irregular)`, () => {
      const run = (dts: number[]) => dts.reduce((s, dt) => stepSpring(s, 1, p, dt), { value: 0, velocity: 0 });
      const total = 0.5;
      const at30 = run(Array(15).fill(total / 15));
      const at60 = run(Array(30).fill(total / 30));
      const at144 = run(Array(72).fill(total / 72));
      const irregular = run([0.003, 0.05, 0.017, 0.1, 0.03, 0.2, 0.1]);
      for (const s of [at60, at144, irregular]) {
        near(s.value, at30.value, 1e-9);
        near(s.velocity, at30.velocity, 1e-8);
      }
    });

    it(`${name}: coincide con una integración numérica fina`, () => {
      let x = 0;
      let v = 0;
      const h = 1e-5;
      for (let t = 0; t < 0.3; t += h) {
        const a = (-p.stiffness * (x - 1) - p.damping * v) / p.mass;
        v += a * h;
        x += v * h;
      }
      near(stepSpring({ value: 0, velocity: 0 }, 1, p, 0.3).value, x, 2e-3);
    });
  }

  it('dt = 0 no cambia el estado', () => {
    assert.deepEqual(stepSpring({ value: 0.3, velocity: 2 }, 1, MOTION_PRESETS.flow.spring, 0), { value: 0.3, velocity: 2 });
  });

  it('acaba en reposo en el objetivo', () => {
    const s = stepSpring({ value: -4, velocity: 30 }, 2, MOTION_PRESETS.elastic.spring, 10);
    near(s.value, 2, 1e-6);
    near(s.velocity, 0, 1e-6);
  });
});

describe('viscosidad (FluidValue)', () => {
  it('es independiente del framerate (solución exacta)', () => {
    const run = (dts: number[]) => {
      const v = new FluidValue(0, MOTION_PRESETS.viscous.spring, MOTION_PRESETS.viscous.viscosity);
      v.set(1);
      for (const dt of dts) v.step(dt);
      return v;
    };
    const at30 = run(Array(18).fill(0.6 / 18));
    for (const other of [run(Array(86).fill(0.6 / 86)), run([0.01, 0.2, 0.033, 0.157, 0.2])]) {
      near(other.value, at30.value, 1e-9);
      near(other.velocity, at30.velocity, 1e-8);
    }
  });

  it('coincide con una integración numérica fina del filtro + resorte', () => {
    const p = MOTION_PRESETS.viscous.spring;
    const tau = 0.18;
    let x = 0;
    let v = 0;
    let l = 0;
    const h = 1e-5;
    for (let t = 0; t < 0.5; t += h) {
      l += ((1 - l) / tau) * h;
      v += ((-p.stiffness * (x - l) - p.damping * v) / p.mass) * h;
      x += v * h;
    }
    const fv = new FluidValue(0, p, tau);
    fv.set(1);
    fv.step(0.5);
    near(fv.value, x, 2e-3);
  });

  it('resonancia exacta (1/τ raíz de la característica) no produce NaN', () => {
    // k = 100, c = 25, m = 1: raíces 5 y 20 → τ = 0.2 resuena con a = 5.
    const fv = new FluidValue(0, { stiffness: 100, damping: 25, mass: 1 }, 0.2);
    fv.set(1);
    fv.step(0.3);
    assert.ok(Number.isFinite(fv.value) && fv.value > 0 && fv.value < 1);
  });

  it('retrasa la llegada: con τ > 0 va por detrás del mismo resorte sin viscosidad', () => {
    const thick = new FluidValue(0, MOTION_PRESETS.flow.spring, 0.2);
    const thin = new FluidValue(0, MOTION_PRESETS.flow.spring, 0);
    thick.set(1);
    thin.set(1);
    thick.step(0.15);
    thin.step(0.15);
    assert.ok(thick.value < thin.value);
  });

  it('jump() deja el valor en reposo inmediatamente', () => {
    const v = new FluidValue(0, MOTION_PRESETS.flow.spring, 0.1);
    v.set(1);
    v.step(0.016);
    v.jump(0.5);
    assert.ok(v.atRest());
    assert.equal(v.value, 0.5);
  });
});

describe('presets de movimiento', () => {
  const names = Object.keys(MOTION_PRESETS) as MotionPresetName[];

  it('existen los ocho presets pedidos', () => {
    assert.deepEqual(names.sort(), ['ambient', 'calm', 'elastic', 'flow', 'magnetic', 'morph', 'spring', 'viscous']);
  });

  it('calm, viscous y ambient no sobrepasan el objetivo', () => {
    for (const n of ['calm', 'viscous', 'ambient'] as const) {
      assert.ok(dampingRatio(MOTION_PRESETS[n].spring) >= 1, n);
      assert.equal(measureStepResponse(MOTION_PRESETS[n].spring).overshoot, 0, n);
    }
  });

  it('elastic es el más elástico y spring el siguiente', () => {
    const over = (n: MotionPresetName) => measureStepResponse(MOTION_PRESETS[n].spring).overshoot;
    assert.ok(over('elastic') > over('spring'));
    assert.ok(over('spring') > over('flow'));
  });

  it('los presets de interfaz se asientan (±0.1 %) en menos de 1.6 s; ambient, en menos de 2.5 s', () => {
    for (const n of names) assert.ok(measureStepResponse(MOTION_PRESETS[n].spring).settleTime < (n === 'ambient' ? 2.5 : 1.6), n);
  });

  it('ningún preset supera el 25 % de sobrepaso (no gelatinoso)', () => {
    for (const n of names) assert.ok(measureStepResponse(MOTION_PRESETS[n].spring).overshoot < 0.25, n);
  });

  it('resolveMotion aplica ζ e intensidad sin mutar el preset', () => {
    const before = JSON.stringify(MOTION_PRESETS.flow);
    const m = resolveMotion('flow', { dampingRatio: 1, intensity: 1, viscosity: 0.5 });
    near(dampingRatio(m.spring), 1, 1e-12);
    near(m.deform, MOTION_PRESETS.flow.deform * 2, 1e-12);
    assert.equal(m.viscosity, 0.5);
    assert.equal(resolveMotion('flow', { intensity: 0 }).deform, 0);
    assert.equal(JSON.stringify(MOTION_PRESETS.flow), before);
  });
});

/** Host de reloj manual: los fotogramas sólo ocurren cuando la prueba lo pide. */
function manualHost() {
  let next = 1;
  const pending = new Map<number, (now: number) => void>();
  let visibility: ((hidden: boolean) => void) | null = null;
  let now = 0;
  const host: ClockHost = {
    requestFrame(cb) {
      pending.set(next, cb);
      return next++;
    },
    cancelFrame(id) {
      pending.delete(id);
    },
    onVisibilityChange(cb) {
      visibility = cb;
      return () => {
        visibility = null;
      };
    },
  };
  return {
    host,
    get pending() {
      return pending.size;
    },
    get listening() {
      return visibility !== null;
    },
    frame(ms = 1000 / 60) {
      now += ms;
      const cbs = [...pending.values()];
      pending.clear();
      for (const cb of cbs) cb(now);
    },
    setHidden(hidden: boolean) {
      visibility?.(hidden);
    },
  };
}

describe('reloj compartido', () => {
  it('un solo fotograma pendiente para cualquier número de tareas', () => {
    const h = manualHost();
    const clock = new FluidClock({ host: h.host });
    clock.add(() => {});
    clock.add(() => {});
    clock.add(() => {});
    assert.equal(h.pending, 1);
  });

  it('se detiene y suelta el listener de visibilidad cuando no quedan tareas', () => {
    const h = manualHost();
    const clock = new FluidClock({ host: h.host });
    const off = clock.add(() => {});
    assert.ok(h.listening);
    off();
    assert.equal(h.pending, 0);
    assert.equal(clock.running, false);
    assert.equal(h.listening, false);
  });

  it('entrega dt real, escalado por timeScale y limitado por maxDelta', () => {
    const h = manualHost();
    const clock = new FluidClock({ host: h.host, maxDelta: 0.1 });
    const seen: number[] = [];
    clock.add((dt) => seen.push(dt));
    h.frame(16); // primer fotograma: sólo fija la referencia
    h.frame(20);
    clock.timeScale = 0.5;
    h.frame(20);
    h.frame(5000);
    near(seen[0]!, 0.02, 1e-9);
    near(seen[1]!, 0.01, 1e-9);
    near(seen[2]!, 0.05, 1e-9);
  });

  it('una tarea que se da de baja dentro del tick no rompe el bucle de las demás', () => {
    const h = manualHost();
    const clock = new FluidClock({ host: h.host });
    let a = 0;
    let b = 0;
    const offA = clock.add(() => {
      a++;
      offA();
    });
    clock.add(() => b++);
    h.frame();
    h.frame();
    h.frame();
    assert.equal(a, 1);
    assert.equal(b, 2);
    assert.equal(h.pending, 1);
  });

  it('pausa por pestaña oculta y por pause(); reanuda al volver', () => {
    const h = manualHost();
    const clock = new FluidClock({ host: h.host });
    clock.add(() => {});
    h.setHidden(true);
    assert.equal(h.pending, 0);
    h.setHidden(false);
    assert.equal(h.pending, 1);
    clock.pause();
    assert.equal(h.pending, 0);
    clock.resume();
    assert.equal(h.pending, 1);
  });
});

describe('preferencia de movimiento', () => {
  function fakeMedia(matches: boolean) {
    const listeners = new Set<() => void>();
    const media = {
      matches,
      addEventListener: (_: string, l: () => void) => listeners.add(l),
      removeEventListener: (_: string, l: () => void) => listeners.delete(l),
    };
    return {
      media: media as unknown as MediaQueryList,
      flip(value: boolean) {
        media.matches = value;
        for (const l of listeners) l();
      },
      get listeners() {
        return listeners.size;
      },
    };
  }

  it('sigue al sistema en modo system y notifica cambios', () => {
    const m = fakeMedia(false);
    const pref = createMotionPreference('system', m.media);
    const seen: boolean[] = [];
    pref.subscribe((r) => seen.push(r));
    m.flip(true);
    assert.equal(pref.reduced, true);
    assert.deepEqual(seen, [true]);
  });

  it('reduce y full prevalecen sobre el sistema; dispose suelta el listener', () => {
    const m = fakeMedia(true);
    const pref = createMotionPreference('system', m.media);
    pref.mode = 'full';
    assert.equal(pref.reduced, false);
    pref.mode = 'reduce';
    m.flip(false);
    assert.equal(pref.reduced, true);
    pref.dispose();
    assert.equal(m.listeners, 0);
  });
});
