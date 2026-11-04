/**
 * Convenciones compartidas por todos los componentes.
 *
 * Una propiedad común sólo existe en los componentes donde tiene sentido:
 * NexBadge no tiene `motion` (no se mueve) y NexCodeBlock no tiene
 * `appearance="editorial"`. Los nombres y valores, en cambio, son siempre
 * los mismos, y se reflejan en el DOM con atributos `data-nx-*` para que el
 * CSS sea el único dueño de la apariencia.
 */
import type { Density, MotionLevel } from '@nexfluid/foundation';

export type NexAppearance = 'default' | 'filled' | 'outlined' | 'ghost' | 'editorial';
export type NexDensity = Density;
export type NexMotion = MotionLevel;
/** Intención semántica. El color nunca es la única señal: siempre acompaña texto. */
export type NexTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export const APPEARANCES: readonly NexAppearance[] = ['default', 'filled', 'outlined', 'ghost', 'editorial'];
export const DENSITIES: readonly NexDensity[] = ['compact', 'comfortable', 'spacious'];
export const MOTIONS: readonly NexMotion[] = ['none', 'subtle', 'fluid', 'elastic'];
export const TONES: readonly NexTone[] = ['neutral', 'accent', 'success', 'warning', 'danger'];

/** Atributos de datos que traducen las propiedades comunes a selectores CSS. */
export function variantAttributes(v: {
  appearance?: string;
  density?: NexDensity;
  motion?: NexMotion;
  tone?: NexTone;
}): Record<string, string | undefined> {
  return {
    'data-nx-appearance': v.appearance,
    'data-nx-density': v.density,
    'data-nx-motion': v.motion,
    'data-nx-tone': v.tone,
  };
}

/** Clases raíz de cada componente: el contrato HTML que cualquier framework puede emitir. */
export const CLASS = {
  root: 'nx-root',
  button: 'nx-button',
  card: 'nx-card',
  tabs: 'nx-tabs',
  frame: 'nx-frame',
  badge: 'nx-badge',
  code: 'nx-code',
  markdown: 'nx-markdown',
  icon: 'nx-icon',
} as const;
