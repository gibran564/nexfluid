'use client';

import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { createMotionPreference, sharedMotionPreference, type MotionMode, type MotionPreference } from '@nexfluid/core';
import type { NexDensity, NexMotion } from '@nexfluid/components';

/**
 * Forma de la gota líquida al viajar (NexSelect, NexCombobox, NexTabs, NexNav, NexSegmented).
 * - `spring` (por defecto): la deformación sale de la distancia entre sus dos bordes, cada uno
 *   con su resorte (magnético delante, viscoso detrás): crece despacio al salir y se recoge de
 *   golpe al llegar.
 * - `symmetric`: la deformación sigue una curva simétrica (seno) según el avance entre origen y
 *   destino: igual al salir que al llegar. Con `subtle` se escala a un tercio; `elastic` conserva
 *   la forma `spring`, porque su carácter es el rebote.
 */
export type NexLiquidShape = 'spring' | 'symmetric';

/**
 * Área que responde al puntero en las superficies interactivas con membrana (NexButton, NexCard…).
 * - `box` (por defecto): la caja del elemento, fija aunque la membrana se abombe hacia el puntero.
 * - `membrane`: además, la parte abombada. El abombamiento tiene un tamaño fijo (`--nx-pull`), así
 *   que el área no persigue al puntero: añade un margen de unos píxeles al salir. Sin coste por
 *   cuadro: la forma ya se dibuja para pintar la membrana.
 */
export type NexHitArea = 'box' | 'membrane';

/**
 * Redondez de los controles (NexButton, NexInput, NexSelect, NexCombobox…), al estilo de
 * `rounded-*` de Bootstrap. Fija `--nx-control-radius` para el subárbol: todos los controles
 * cambian por igual, en CSS y en la membrana.
 */
export type NexRadius = 'none' | 'sm' | 'md' | 'lg' | 'pill';
/** Curva de la esquina de los controles: `round` (arco de círculo) o `squircle` (superelipse). */
export type NexCorner = 'round' | 'squircle';

const RADIUS: Record<NexRadius, string> = { none: '0px', sm: '6px', md: '10px', lg: '16px', pill: '9999px' };
// `smoothing` de la membrana equivalente a cada `corner-shape` de CSS: round = exponente 2,
// squircle = superellipse(2) = exponente 4 (n = 2 + 3 · smoothing).
const CORNER: Record<NexCorner, { shape: string; smoothing: string }> = {
  round: { shape: 'round', smoothing: '0' },
  squircle: { shape: 'squircle', smoothing: String(2 / 3) },
};

export interface NexContextValue {
  density: NexDensity;
  motion: NexMotion;
  preference: MotionPreference | null;
  /** Firma del aspecto (tema, dirección, densidad): las membranas se redibujan cuando cambia. */
  look: string;
  /**
   * Tema y dirección vigentes (los del proveedor más cercano que los declara).
   * Lo que se pinta fuera del subárbol del proveedor —el panel de NexMorph en
   * `<body>`— los vuelve a declarar para no caer en los valores por defecto.
   */
  theme?: string;
  direction?: string;
  /** Forma de la gota (la del proveedor más cercano que la declara). */
  liquid?: NexLiquidShape;
  /** Área del puntero de las membranas (la del proveedor más cercano que la declara). */
  hitArea?: NexHitArea;
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
  /** Tema de color de @nexfluid/foundation, `auto`, `nextudio` (adaptador) o uno propio declarado en CSS. */
  theme?: string;
  /** Dirección (ADN no cromático): `native` (por defecto), `fluid-editorial`, `living-matter`, `kinetic-minimal` o `nextudio`. */
  direction?: string;
  density?: NexDensity;
  /** Nivel de movimiento por defecto de los componentes. */
  motion?: NexMotion;
  /** `system` sigue `prefers-reduced-motion`; `reduce` y `full` lo fuerzan. Sólo la aplicación decide `full`. */
  reducedMotion?: MotionMode;
  /** Forma de la gota líquida al viajar. Por defecto `spring` (la original). Ver `NexLiquidShape`. */
  liquid?: NexLiquidShape;
  /** Área que responde al puntero en las membranas. Por defecto `box` (la original). Ver `NexHitArea`. */
  hitArea?: NexHitArea;
  /** Redondez de los controles del subárbol. Sin ella, la de la dirección (cápsula). Ver `NexRadius`. */
  radius?: NexRadius;
  /** Curva de la esquina de los controles. Sin ella, la de la dirección (`round`). Ver `NexCorner`. */
  corner?: NexCorner;
  /** Pinta el fondo del tema (para islas y páginas completas). */
  canvas?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Variables CSS de `radius` y `corner` (se heredan; las membranas las leen al medirse). */
function shapeVars(radius?: NexRadius, corner?: NexCorner): CSSProperties {
  const vars: Record<string, string> = {};
  if (radius) vars['--nx-control-radius'] = RADIUS[radius];
  if (corner) {
    vars['--nx-control-corner'] = CORNER[corner].shape;
    vars['--nx-control-smoothing'] = CORNER[corner].smoothing;
  }
  return vars as CSSProperties;
}

/**
 * Raíz opcional de NexFluidUI: declara tema, densidad y movimiento para su
 * subárbol. Es un `<div class="nx-root">`; puede anidarse (islas con otro tema).
 * Sin proveedor, los componentes usan `comfortable` y `subtle`.
 */
export function NexProvider({ theme, direction, density = 'comfortable', motion = 'subtle', reducedMotion = 'system', liquid, hitArea, radius, corner, canvas, className, style, children }: NexProviderProps) {
  const [preference] = useState<MotionPreference | null>(() =>
    typeof window === 'undefined' ? null : createMotionPreference(reducedMotion),
  );
  useEffect(() => {
    if (preference) preference.mode = reducedMotion;
  }, [preference, reducedMotion]);
  useEffect(() => () => preference?.dispose(), [preference]);
  const outer = useContext(NexContext);
  const value = { density, motion, preference, look: `${outer.look}/${theme ?? ''}:${direction ?? ''}:${density}:${radius ?? ''}:${corner ?? ''}`, theme: theme ?? outer.theme, direction: direction ?? outer.direction, liquid: liquid ?? outer.liquid, hitArea: hitArea ?? outer.hitArea };
  return (
    <NexContext.Provider value={value}>
      <div
        className={className ? `nx-root ${className}` : 'nx-root'}
        style={radius || corner ? { ...shapeVars(radius, corner), ...style } : style}
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
