import { dampingForRatio, type SpringParams } from './spring.ts';

/**
 * Un preset es un conjunto de parámetros medibles, no un adjetivo. Las cifras
 * derivadas (ζ, sobrepaso, tiempo de asentamiento) se calculan con
 * `npm run presets` y se publican en docs/TOKENS.md.
 */
export interface MotionPreset {
  spring: SpringParams;
  /** τ del filtro viscoso aplicado a los objetivos, en segundos. */
  viscosity: number;
  /** Deformación máxima del contorno como fracción del radio (0.1 = 10 %). */
  deform: number;
  /** Movimiento ambiental: amplitud (fracción del radio) y velocidad (ciclos/s). */
  ambient: { amplitude: number; speed: number };
  /** Para qué sirve. Se muestra en el Playground. */
  intent: string;
}

export const MOTION_PRESETS = {
  calm: {
    spring: { stiffness: 120, damping: 26, mass: 1 },
    viscosity: 0.08,
    deform: 0.04,
    ambient: { amplitude: 0.012, speed: 0.05 },
    intent: 'Superficies de lectura y estados que no deben llamar la atención. Sin sobrepaso.',
  },
  flow: {
    spring: { stiffness: 170, damping: 22, mass: 1 },
    viscosity: 0.04,
    deform: 0.06,
    ambient: { amplitude: 0.02, speed: 0.08 },
    intent: 'Predeterminado de interfaz: respuesta ágil con un asentamiento apenas perceptible.',
  },
  elastic: {
    spring: { stiffness: 380, damping: 17, mass: 1 },
    viscosity: 0,
    deform: 0.1,
    ambient: { amplitude: 0.01, speed: 0.1 },
    intent: 'Retroalimentación breve de presión y suelta. No para desplazamientos largos.',
  },
  viscous: {
    spring: { stiffness: 90, damping: 24, mass: 1 },
    viscosity: 0.18,
    deform: 0.08,
    ambient: { amplitude: 0.02, speed: 0.04 },
    intent: 'Materia espesa: arrastra al objetivo y llega sin rebote. Interruptores, paneles.',
  },
  magnetic: {
    spring: { stiffness: 260, damping: 26, mass: 1 },
    viscosity: 0.02,
    deform: 0.12,
    ambient: { amplitude: 0, speed: 0 },
    intent: 'Atracción hacia el puntero o el foco. Docks, indicadores que siguen la selección.',
  },
  morph: {
    spring: { stiffness: 140, damping: 20, mass: 1 },
    viscosity: 0.06,
    deform: 0.14,
    ambient: { amplitude: 0.015, speed: 0.06 },
    intent: 'Transformación entre geometrías: misma materia, otra forma.',
  },
  spring: {
    spring: { stiffness: 300, damping: 18, mass: 1 },
    viscosity: 0,
    deform: 0.08,
    ambient: { amplitude: 0, speed: 0 },
    intent: 'Resorte reconocible para confirmaciones. Úsese con moderación.',
  },
  ambient: {
    spring: { stiffness: 40, damping: 14, mass: 1 },
    viscosity: 0.3,
    deform: 0.05,
    ambient: { amplitude: 0.035, speed: 0.03 },
    intent: 'Movimiento de fondo, lento y detenible. Nunca sobre contenido que se lee.',
  },
} as const satisfies Record<string, MotionPreset>;

export type MotionPresetName = keyof typeof MOTION_PRESETS;

export function isMotionPresetName(value: unknown): value is MotionPresetName {
  return typeof value === 'string' && Object.hasOwn(MOTION_PRESETS, value);
}

export interface MotionOverrides {
  /** Sustituye la razón de amortiguación ζ («elasticidad» inversa) conservando k y m. */
  dampingRatio?: number;
  /** Sustituye τ del filtro viscoso. */
  viscosity?: number;
  /** 0–1. Escala deformación y amplitud ambiental; 0.5 = valores del preset. */
  intensity?: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Preset + ajustes del componente → parámetros concretos. Nunca muta el preset. */
export function resolveMotion(preset: MotionPresetName | MotionPreset, overrides: MotionOverrides = {}): MotionPreset {
  const base: MotionPreset = typeof preset === 'string' ? MOTION_PRESETS[preset] : preset;
  const { stiffness, mass } = base.spring;
  const scale = 2 * clamp01(overrides.intensity ?? 0.5);
  return {
    spring: {
      stiffness,
      mass,
      damping: overrides.dampingRatio === undefined ? base.spring.damping : dampingForRatio(Math.max(0.05, overrides.dampingRatio), stiffness, mass),
    },
    viscosity: Math.max(0, overrides.viscosity ?? base.viscosity),
    deform: base.deform * scale,
    ambient: { amplitude: base.ambient.amplitude * scale, speed: base.ambient.speed },
    intent: base.intent,
  };
}
