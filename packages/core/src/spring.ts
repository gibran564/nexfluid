/**
 * Resorte amortiguado resuelto de forma analítica.
 *
 * Integrar con Euler hace que el resultado dependa del framerate; la solución
 * cerrada del oscilador armónico amortiguado no: avanzar 1/60 s dos veces da
 * exactamente lo mismo que avanzar 1/30 s una vez. Por eso NexFluid no
 * necesita un paso fijo para los resortes.
 */

export interface SpringParams {
  /** Rigidez k (N/m en unidades normalizadas). Más alta, más rápida. */
  stiffness: number;
  /** Amortiguación c. Junto con k y m fija la razón de amortiguación ζ. */
  damping: number;
  /** Masa m. */
  mass: number;
}

export interface SpringState {
  value: number;
  velocity: number;
}

export function dampingRatio(p: SpringParams): number {
  return p.damping / (2 * Math.sqrt(p.stiffness * p.mass));
}

export function naturalFrequency(p: SpringParams): number {
  return Math.sqrt(p.stiffness / p.mass);
}

/** Amortiguación que produce la razón ζ pedida conservando k y m. */
export function dampingForRatio(ratio: number, stiffness: number, mass: number): number {
  return 2 * ratio * Math.sqrt(stiffness * mass);
}

const CRITICAL_EPSILON = 1e-4;

/**
 * Avanza el resorte `dt` segundos hacia `target`. Puro: no muta `state`.
 * `dt` puede ser cualquier valor ≥ 0; el resultado es exacto.
 */
export function stepSpring(state: SpringState, target: number, p: SpringParams, dt: number): SpringState {
  if (dt <= 0) return { value: state.value, velocity: state.velocity };
  const w0 = naturalFrequency(p);
  const zeta = dampingRatio(p);
  const x0 = state.value - target;
  const v0 = state.velocity;
  let x: number;
  let v: number;
  if (Math.abs(zeta - 1) < CRITICAL_EPSILON) {
    const b = v0 + w0 * x0;
    const e = Math.exp(-w0 * dt);
    x = (x0 + b * dt) * e;
    v = (v0 - w0 * b * dt) * e;
  } else if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const e = Math.exp(-zeta * w0 * dt);
    const c = Math.cos(wd * dt);
    const s = Math.sin(wd * dt);
    x = e * (x0 * c + ((v0 + zeta * w0 * x0) / wd) * s);
    v = e * (v0 * c - ((w0 * w0 * x0 + zeta * w0 * v0) / wd) * s);
  } else {
    const root = Math.sqrt(zeta * zeta - 1);
    const r1 = -w0 * (zeta - root);
    const r2 = -w0 * (zeta + root);
    const c2 = (v0 - r1 * x0) / (r2 - r1);
    const c1 = x0 - c2;
    const e1 = Math.exp(r1 * dt);
    const e2 = Math.exp(r2 * dt);
    x = c1 * e1 + c2 * e2;
    v = r1 * c1 * e1 + r2 * c2 * e2;
  }
  return { value: target + x, velocity: v };
}

export interface StepResponse {
  /** Sobrepaso máximo respecto a un salto unitario, en fracción (0.12 = 12 %). */
  overshoot: number;
  /** Tiempo hasta quedar dentro de ±tolerance del objetivo para siempre, en s. */
  settleTime: number;
  /** Muestras (t, valor) de la respuesta, útiles para dibujarla. */
  samples: Array<[number, number]>;
}

/**
 * Mide la respuesta a un salto 0 → 1. Es la base de las cifras documentadas
 * de cada preset: nada se describe como «rápido» sin un número detrás.
 */
export function measureStepResponse(p: SpringParams, { tolerance = 0.001, horizon = 5, sampleDt = 1 / 240 } = {}): StepResponse {
  let state: SpringState = { value: 0, velocity: 0 };
  let peak = 0;
  let lastOutside = 0;
  const samples: Array<[number, number]> = [[0, 0]];
  for (let t = sampleDt; t <= horizon + 1e-9; t += sampleDt) {
    state = stepSpring(state, 1, p, sampleDt);
    if (state.value > peak) peak = state.value;
    if (Math.abs(state.value - 1) > tolerance) lastOutside = t;
    samples.push([t, state.value]);
  }
  return { overshoot: Math.max(0, peak - 1), settleTime: lastOutside, samples };
}

/** Un valor animado por resorte, opcionalmente con viscosidad (ver `viscosity`). */
export class FluidValue {
  value: number;
  velocity = 0;
  target: number;
  /** Objetivo tras el filtro viscoso: lo que el resorte persigue de verdad. */
  private lagged: number;
  params: SpringParams;
  /**
   * Constante de tiempo τ (s) de un filtro de primer orden aplicado al
   * objetivo. 0 = sin viscosidad. Con τ > 0 el valor «arrastra» al objetivo,
   * como un cuerpo dentro de un líquido espeso.
   */
  viscosity: number;

  constructor(initial: number, params: SpringParams, viscosity = 0) {
    this.value = initial;
    this.target = initial;
    this.lagged = initial;
    this.params = params;
    this.viscosity = viscosity;
  }

  set(target: number): void {
    this.target = target;
  }

  /** Salta al valor sin animar (movimiento reducido, estado inicial). */
  jump(value: number): void {
    this.value = value;
    this.target = value;
    this.lagged = value;
    this.velocity = 0;
  }

  /**
   * Avanza `dt` segundos, también de forma exacta con viscosidad.
   *
   * El objetivo filtrado es L(t) = T + D·e^(−a·t), con a = 1/τ. La ecuación
   * m·x'' + c·x' + k·x = k·L(t) tiene la solución particular
   * x_p = T + A·e^(−a·t), con A = k·D / (m·a² − c·a + k); el resto es un
   * resorte libre hacia T, que ya sabemos resolver de forma cerrada.
   */
  step(dt: number): void {
    if (dt <= 0) return;
    const d = this.lagged - this.target;
    if (this.viscosity <= 0 || d === 0) {
      this.lagged = this.target;
      const next = stepSpring(this, this.target, this.params, dt);
      this.value = next.value;
      this.velocity = next.velocity;
      return;
    }
    const { stiffness: k, damping: c, mass: m } = this.params;
    let a = 1 / this.viscosity;
    // Resonancia exacta (a es raíz de la característica): desplazar a un 1e-6
    // relativo basta y el error resultante es inapreciable.
    if (Math.abs(m * a * a - c * a + k) < 1e-9 * k) a *= 1 + 1e-6;
    const amp = (k * d) / (m * a * a - c * a + k);
    const free = stepSpring({ value: this.value - amp, velocity: this.velocity + a * amp }, this.target, this.params, dt);
    const decay = Math.exp(-a * dt);
    this.value = free.value + amp * decay;
    this.velocity = free.velocity - a * amp * decay;
    this.lagged = this.target + d * decay;
  }

  atRest(epsilon = 1e-3): boolean {
    return (
      Math.abs(this.value - this.target) < epsilon &&
      Math.abs(this.velocity) < epsilon &&
      Math.abs(this.lagged - this.target) < epsilon
    );
  }
}
