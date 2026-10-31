/**
 * FluidBlob — entidad fluida con comportamiento dinámico.
 *
 * Primitiva visual, no un control: por defecto es decorativa (aria-hidden) y
 * no recibe foco. Un componente interactivo (FluidButton, fase 2) la usa como
 * piel y es él quien aporta rol, foco y teclado.
 *
 * Contrato independiente de framework: `createFluidBlob(host, opciones)`
 * devuelve un manejador con `update`, `destroy`, etc. Los adaptadores para
 * React u otros frameworks sólo llaman a estas funciones.
 */
import { FluidClock, sharedClock, type Tick } from './clock.ts';
import { sharedMotionPreference, type MotionPreference } from './motion-preference.ts';
import { resolveMotion, type MotionOverrides, type MotionPreset, type MotionPresetName } from './presets.ts';
import { makeHarmonics, sampleContour, toSmoothPath, type BaseGeometry, type Harmonic } from './shape.ts';
import { FluidValue } from './spring.ts';

export interface FluidBlobOptions {
  motion: MotionPresetName | MotionPreset;
  overrides: MotionOverrides;
  base: BaseGeometry;
  /** Puntos del contorno (suavidad). 16–32 es suficiente para tamaños de UI. */
  points: number;
  /** Semilla de la forma ambiental: misma semilla, mismo carácter. */
  seed: number;
  /** Movimiento ambiental. Se detiene solo con movimiento reducido. */
  ambient: boolean;
  /** Reacciona al puntero dentro del host (atracción y presión). */
  interactive: boolean;
  /** Si se da, el blob es una imagen con nombre; si no, es decorativo. */
  label: string | null;
  /** Tensión del trazado (token `curvature`). */
  curvature: number;
  clock: FluidClock;
  motionPreference: MotionPreference;
}

export interface FluidBlobHandle {
  readonly element: SVGSVGElement;
  /** Trazado actual; útil para pruebas visuales y capturas deterministas. */
  readonly path: string;
  /** true mientras está suscrito al reloj. */
  readonly awake: boolean;
  update(options: Partial<FluidBlobOptions>): void;
  /** Atracción hacia un ángulo (rad), fuerza 0–1. Movimiento relacional. */
  attract(angle: number, strength: number): void;
  press(): void;
  release(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Radio nominal dentro de un viewBox de 200: deja margen para deformarse sin recortarse. */
const RADIUS = 72;

export function createFluidBlob(host: HTMLElement, options: Partial<FluidBlobOptions> = {}): FluidBlobHandle {
  let opts: FluidBlobOptions = {
    motion: 'flow',
    overrides: {},
    base: { kind: 'circle' },
    points: 24,
    seed: 7,
    ambient: true,
    interactive: true,
    label: null,
    curvature: 1,
    clock: options.clock ?? sharedClock(),
    motionPreference: options.motionPreference ?? sharedMotionPreference(),
    ...options,
  };

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '-100 -100 200 200');
  svg.setAttribute('class', 'nf-blob');
  svg.setAttribute('focusable', 'false');
  const shape = document.createElementNS(SVG_NS, 'path');
  shape.setAttribute('class', 'nf-blob__shape');
  svg.append(shape);
  host.append(svg);

  let motion = resolveMotion(opts.motion, opts.overrides);
  let harmonics: Harmonic[] = makeHarmonics(opts.seed);
  const make = () => new FluidValue(0, motion.spring, motion.viscosity);
  const bulgeX = make();
  const bulgeY = make();
  const squash = make();
  const scale = new FluidValue(1, motion.spring, motion.viscosity);
  const values = [bulgeX, bulgeY, squash, scale];

  let phase = 0;
  let pressed = false;
  let paused = false;
  let visible = true;
  let destroyed = false;
  let subscribed = false;
  let path = '';

  const reduced = () => opts.motionPreference.reduced;
  const ambientActive = () => opts.ambient && !reduced() && motion.ambient.amplitude > 0 && motion.ambient.speed > 0;

  function applyA11y(): void {
    if (opts.label) {
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', opts.label);
      svg.removeAttribute('aria-hidden');
    } else {
      svg.removeAttribute('role');
      svg.removeAttribute('aria-label');
      svg.setAttribute('aria-hidden', 'true');
    }
  }

  function render(): void {
    const bx = bulgeX.value;
    const by = bulgeY.value;
    const contour = sampleContour({
      points: opts.points,
      base: opts.base,
      harmonics,
      ambient: reduced() ? 0 : motion.ambient.amplitude,
      phase,
      deformation: {
        bulge: { angle: Math.atan2(by, bx), amount: Math.hypot(bx, by) },
        squash: { angle: 0, amount: squash.value },
      },
      preserveArea: true,
    });
    path = toSmoothPath(contour, { scale: RADIUS * scale.value, tension: opts.curvature });
    shape.setAttribute('d', path);
  }

  const tick: Tick = (dt) => {
    for (const v of values) v.step(dt);
    const ambientOn = ambientActive();
    if (ambientOn) phase += dt * motion.ambient.speed;
    const resting = values.every((v) => v.atRest());
    // En reposo se fija el estado final exacto: soltar siempre devuelve la
    // misma forma, sin residuos por debajo del umbral.
    if (resting) for (const v of values) v.jump(v.target);
    render();
    if (resting && !ambientOn) sleep();
  };

  function wake(): void {
    if (subscribed || destroyed || paused || !visible) return;
    if (reduced()) {
      for (const v of values) v.jump(v.target);
      render();
      return;
    }
    subscribed = true;
    opts.clock.add(tick);
  }

  function sleep(): void {
    if (!subscribed) return;
    subscribed = false;
    opts.clock.remove(tick);
  }

  function retarget(): void {
    motion = resolveMotion(opts.motion, opts.overrides);
    for (const v of values) {
      v.params = motion.spring;
      v.viscosity = motion.viscosity;
    }
  }

  // --------------------------------------------------------------- entrada
  function onPointerMove(e: PointerEvent): void {
    if (pressed && e.pointerType !== 'mouse') return;
    const rect = host.getBoundingClientRect();
    const half = Math.min(rect.width, rect.height) / 2 || 1;
    const dx = (e.clientX - (rect.left + rect.width / 2)) / half;
    const dy = (e.clientY - (rect.top + rect.height / 2)) / half;
    const dist = Math.hypot(dx, dy);
    handle.attract(Math.atan2(dy, dx), Math.min(1, dist));
  }
  function onPointerLeave(): void {
    handle.attract(0, 0);
    if (pressed) handle.release();
  }
  function onPointerDown(e: PointerEvent): void {
    if (e.button === 0) handle.press();
  }
  function onPointerUp(): void {
    if (pressed) handle.release();
  }
  function listen(on: boolean): void {
    const method = on ? 'addEventListener' : 'removeEventListener';
    host[method]('pointermove', onPointerMove as EventListener);
    host[method]('pointerleave', onPointerLeave);
    host[method]('pointerdown', onPointerDown as EventListener);
    host[method]('pointerup', onPointerUp);
    host[method]('pointercancel', onPointerLeave);
  }

  const observer =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          if (visible) wake();
          else sleep();
        })
      : null;
  observer?.observe(svg);

  const stopReduced = opts.motionPreference.subscribe(() => {
    sleep();
    if (reduced()) {
      for (const v of values) v.jump(v.target);
      render();
    } else {
      wake();
    }
  });

  const handle: FluidBlobHandle = {
    element: svg,
    get path() {
      return path;
    },
    get awake() {
      return subscribed;
    },
    update(next) {
      const prev = opts;
      opts = { ...opts, ...next };
      if (next.seed !== undefined && next.seed !== prev.seed) harmonics = makeHarmonics(opts.seed);
      if (next.motion !== undefined || next.overrides !== undefined) retarget();
      if (next.interactive !== undefined && next.interactive !== prev.interactive) listen(opts.interactive);
      if (next.label !== undefined) applyA11y();
      if (next.clock !== undefined && next.clock !== prev.clock && subscribed) {
        prev.clock.remove(tick);
        opts.clock.add(tick);
      }
      render();
      wake();
    },
    attract(angle, strength) {
      if (reduced()) return;
      const amount = motion.deform * Math.min(1, Math.max(0, strength));
      bulgeX.set(Math.cos(angle) * amount);
      bulgeY.set(Math.sin(angle) * amount);
      wake();
    },
    press() {
      pressed = true;
      if (reduced()) {
        scale.jump(0.97);
        render();
        return;
      }
      squash.set(motion.deform * 1.2);
      scale.set(1 - motion.deform * 0.5);
      wake();
    },
    release() {
      pressed = false;
      squash.set(0);
      scale.set(1);
      if (reduced()) {
        squash.jump(0);
        scale.jump(1);
        render();
        return;
      }
      wake();
    },
    pause() {
      paused = true;
      sleep();
    },
    resume() {
      paused = false;
      wake();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      sleep();
      listen(false);
      observer?.disconnect();
      stopReduced();
      svg.remove();
    },
  };

  applyA11y();
  if (opts.interactive) listen(true);
  render();
  wake();
  return handle;
}
