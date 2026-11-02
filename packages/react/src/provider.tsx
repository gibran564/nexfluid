'use client';

import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { createMotionPreference, sharedMotionPreference, type MotionMode, type MotionPreference } from '@eclipsis/core';
import type { NexDensity, NexMotion } from '@eclipsis/components';

export interface NexContextValue {
  density: NexDensity;
  motion: NexMotion;
  preference: MotionPreference | null;
  /** Firma del aspecto (tema, dirección, densidad): las membranas se redibujan cuando cambia. */
  look: string;
}

const DEFAULTS: NexContextValue = { density: 'comfortable', motion: 'subtle', preference: null, look: '' };
const NexContext = createContext<NexContextValue>(DEFAULTS);

/** Valores por defecto vigentes (densidad, nivel de movimiento, preferencia). */
export function useNex(): NexContextValue {
  return useContext(NexContext);
}

/** Preferencia de movimiento efectiva. Fuera de un proveedor, la del documento. */
export function useMotionPreference(): MotionPreference | null {
  const { preference } = useNex();
  const [fallback, setFallback] = useState<MotionPreference | null>(null);
  useEffect(() => {
    if (!preference) setFallback(sharedMotionPreference());
  }, [preference]);
  return preference ?? fallback;
}

/** ¿Puede animarse con física en este momento? Se consulta en eventos y efectos, nunca al renderizar. */
export function canAnimate(level: NexMotion, preference: MotionPreference | null): boolean {
  if (level === 'none') return false;
  return !(preference ?? (typeof window === 'undefined' ? null : sharedMotionPreference()))?.reduced;
}

export interface NexProviderProps {
  /** Tema de color de @eclipsis/foundation, `auto`, `nextudio` (adaptador) o uno propio declarado en CSS. */
  theme?: string;
  /** Dirección (ADN no cromático): `native` (por defecto), `fluid-editorial`, `living-matter`, `kinetic-minimal` o `nextudio`. */
  direction?: string;
  density?: NexDensity;
  /** Nivel de movimiento por defecto de los componentes. */
  motion?: NexMotion;
  /** `system` sigue `prefers-reduced-motion`; `reduce` y `full` lo fuerzan. Sólo la aplicación decide `full`. */
  reducedMotion?: MotionMode;
  /** Pinta el fondo del tema (para islas y páginas completas). */
  canvas?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Raíz opcional de NexFluidUI: declara tema, densidad y movimiento para su
 * subárbol. Es un `<div class="nx-root">`; puede anidarse (islas con otro tema).
 * Sin proveedor, los componentes usan `comfortable` y `subtle`.
 */
export function NexProvider({ theme, direction, density = 'comfortable', motion = 'subtle', reducedMotion = 'system', canvas, className, style, children }: NexProviderProps) {
  const [preference] = useState<MotionPreference | null>(() =>
    typeof window === 'undefined' ? null : createMotionPreference(reducedMotion),
  );
  useEffect(() => {
    if (preference) preference.mode = reducedMotion;
  }, [preference, reducedMotion]);
  useEffect(() => () => preference?.dispose(), [preference]);
  const outer = useContext(NexContext);
  const value = { density, motion, preference, look: `${outer.look}/${theme ?? ''}:${direction ?? ''}:${density}` };
  return (
    <NexContext.Provider value={value}>
      <div
        className={className ? `nx-root ${className}` : 'nx-root'}
        style={style}
        data-nx-theme={theme}
        data-nx-direction={direction}
        data-nx-density={density}
        data-nx-motion-pref={reducedMotion === 'system' ? undefined : reducedMotion}
        data-nx-canvas={canvas ? '' : undefined}
      >
        {children}
      </div>
    </NexContext.Provider>
  );
}
