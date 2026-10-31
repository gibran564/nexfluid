/**
 * Un único bucle de animación compartido.
 *
 * Todas las animaciones de NexFluid se suscriben al mismo reloj: un solo
 * requestAnimationFrame por documento, que se detiene cuando nadie lo
 * necesita y cuando la pestaña está oculta. Los componentes se dan de baja
 * en cuanto están en reposo, así que una interfaz quieta no consume CPU.
 */

export type Tick = (dt: number, time: number) => void;

export interface ClockHost {
  requestFrame(cb: (now: number) => void): number;
  cancelFrame(id: number): void;
  /** Devuelve una función que deja de escuchar. */
  onVisibilityChange?(cb: (hidden: boolean) => void): () => void;
}

export interface FluidClockOptions {
  host?: ClockHost;
  /** Salto máximo por fotograma (s). Evita teletransportes tras un bloqueo. */
  maxDelta?: number;
}

function browserHost(): ClockHost {
  return {
    requestFrame: (cb) => requestAnimationFrame(cb),
    cancelFrame: (id) => cancelAnimationFrame(id),
    onVisibilityChange(cb) {
      const listener = () => cb(document.hidden);
      document.addEventListener('visibilitychange', listener);
      return () => document.removeEventListener('visibilitychange', listener);
    },
  };
}

export class FluidClock {
  /** Multiplicador global del tiempo (control de velocidad del Playground). */
  timeScale = 1;
  /** Tiempo acumulado de animación en segundos (ya escalado). */
  time = 0;
  private readonly host: ClockHost;
  private readonly maxDelta: number;
  private readonly tasks = new Set<Tick>();
  private frame: number | null = null;
  private last: number | null = null;
  private paused = false;
  private hidden = false;
  private ticking = false;
  private stopVisibility: (() => void) | null = null;

  constructor({ host, maxDelta = 0.1 }: FluidClockOptions = {}) {
    this.host = host ?? browserHost();
    this.maxDelta = maxDelta;
  }

  /** Suscribe una tarea. Devuelve la función que la da de baja. */
  add(task: Tick): () => void {
    this.tasks.add(task);
    if (this.tasks.size === 1 && this.host.onVisibilityChange && !this.stopVisibility) {
      this.stopVisibility = this.host.onVisibilityChange((hidden) => {
        this.hidden = hidden;
        this.sync();
      });
    }
    this.sync();
    return () => this.remove(task);
  }

  remove(task: Tick): void {
    this.tasks.delete(task);
    if (this.tasks.size === 0) {
      this.stopVisibility?.();
      this.stopVisibility = null;
    }
    this.sync();
  }

  has(task: Tick): boolean {
    return this.tasks.has(task);
  }

  get running(): boolean {
    return this.frame !== null;
  }

  get size(): number {
    return this.tasks.size;
  }

  pause(): void {
    this.paused = true;
    this.sync();
  }

  resume(): void {
    this.paused = false;
    this.sync();
  }

  /** Avanza manualmente (pruebas, capturas deterministas). */
  advance(dt: number): void {
    const scaled = Math.min(dt, this.maxDelta) * this.timeScale;
    this.time += scaled;
    for (const task of [...this.tasks]) task(scaled, this.time);
  }

  private sync(): void {
    if (this.ticking) return;
    const shouldRun = this.tasks.size > 0 && !this.paused && !this.hidden;
    if (shouldRun && this.frame === null) {
      this.last = null;
      this.frame = this.host.requestFrame(this.loop);
    } else if (!shouldRun && this.frame !== null) {
      this.host.cancelFrame(this.frame);
      this.frame = null;
      this.last = null;
    }
  }

  private readonly loop = (now: number): void => {
    // Mientras corren las tareas, sync() no programa: altas y bajas dentro de
    // un tick se resuelven aquí al final, sin perder el tiempo del fotograma.
    this.ticking = true;
    this.frame = null;
    const dt = this.last === null ? 0 : (now - this.last) / 1000;
    this.last = now;
    try {
      if (dt > 0) this.advance(dt);
    } finally {
      this.ticking = false;
    }
    if (this.tasks.size > 0 && !this.paused && !this.hidden) {
      this.frame = this.host.requestFrame(this.loop);
    } else {
      this.last = null;
    }
  };
}

let shared: FluidClock | null = null;

/** Reloj por defecto del documento. Se crea al primer uso. */
export function sharedClock(): FluidClock {
  shared ??= new FluidClock();
  return shared;
}
