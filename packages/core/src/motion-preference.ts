/**
 * Preferencia de movimiento efectiva = sistema (`prefers-reduced-motion`)
 * combinada con una decisión explícita de la aplicación.
 *
 * `reduce` nunca puede ser anulado por un componente: sólo la aplicación
 * (por ejemplo, un ajuste de accesibilidad de la persona) puede forzar `full`.
 */

export type MotionMode = 'system' | 'reduce' | 'full';

export interface MotionPreference {
  readonly reduced: boolean;
  mode: MotionMode;
  subscribe(listener: (reduced: boolean) => void): () => void;
  dispose(): void;
}

export function createMotionPreference(initial: MotionMode = 'system', media?: MediaQueryList | null): MotionPreference {
  const query =
    media === undefined
      ? typeof matchMedia === 'function'
        ? matchMedia('(prefers-reduced-motion: reduce)')
        : null
      : media;
  const listeners = new Set<(reduced: boolean) => void>();
  let mode = initial;
  const compute = () => (mode === 'reduce' ? true : mode === 'full' ? false : (query?.matches ?? false));
  let reduced = compute();
  const update = () => {
    const next = compute();
    if (next === reduced) return;
    reduced = next;
    for (const l of [...listeners]) l(reduced);
  };
  query?.addEventListener('change', update);
  return {
    get reduced() {
      return reduced;
    },
    get mode() {
      return mode;
    },
    set mode(value: MotionMode) {
      mode = value;
      update();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      query?.removeEventListener('change', update);
      listeners.clear();
    },
  };
}

let shared: MotionPreference | null = null;

export function sharedMotionPreference(): MotionPreference {
  shared ??= createMotionPreference();
  return shared;
}
