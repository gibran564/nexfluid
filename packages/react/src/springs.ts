'use client';

/**
 * Puente mínimo entre React y los resortes de @eclipsis/core.
 *
 * Los valores se aplican directamente al DOM en `onFrame` (sin renderizar
 * React por fotograma) y la tarea se da de baja del reloj compartido en
 * cuanto todo está en reposo.
 */
import { useEffect, useRef } from 'react';
import { FluidValue, MORPH_PHYSICS, MOTION_PRESETS, sharedClock, type MorphPhysicsName, type MotionPresetName, type SpringParams, type Tick } from '@eclipsis/core';
import type { NexMotion } from '@eclipsis/components';

/** Preset del motor para cada nivel físico y papel dentro del componente. */
export function presetFor(level: NexMotion, role: 'lead' | 'trail' | 'press' = 'lead'): MotionPresetName {
  if (level === 'elastic') return role === 'trail' ? 'spring' : 'elastic';
  if (role === 'trail') return 'viscous';
  if (role === 'press') return 'flow';
  return 'magnetic';
}

/** Un preset del motor o parámetros explícitos (p. ej. una familia de NexMorph). */
export type SpringPreset = MotionPresetName | { spring: SpringParams; viscosity: number };

/** Familia de NexMorph como preset de resorte. */
export function morphSpring(name: MorphPhysicsName): SpringPreset {
  const p = MORPH_PHYSICS[name];
  return { spring: { mass: p.mass, stiffness: p.stiffness, damping: p.damping }, viscosity: p.viscosity };
}

export interface SpringSet {
  /** Anima hacia los objetivos con los presets dados (uno por valor). */
  to(targets: readonly number[], presets: readonly SpringPreset[]): void;
  /** Coloca sin animar. */
  jump(targets: readonly number[]): void;
  values(): number[];
  readonly moving: boolean;
}

/** `epsilon`: umbral de reposo en las unidades de los valores (px, escala…). */
export function useSprings(initial: readonly number[], onFrame: (values: number[]) => void, epsilon = 0.001): SpringSet {
  const frame = useRef(onFrame);
  frame.current = onFrame;
  const state = useRef<{ values: FluidValue[]; tick: Tick | null; set: SpringSet } | null>(null);

  if (state.current === null) {
    const values = initial.map((v) => new FluidValue(v, MOTION_PRESETS.flow.spring));
    const s: { values: FluidValue[]; tick: Tick | null; set: SpringSet } = {
      values,
      tick: null,
      set: null as unknown as SpringSet,
    };
    const stop = () => {
      if (s.tick) sharedClock().remove(s.tick);
      s.tick = null;
    };
    const emit = () => frame.current(s.values.map((v) => v.value));
    s.set = {
      to(targets, presets) {
        targets.forEach((t, i) => {
          const v = s.values[i]!;
          const name = presets[i] ?? presets[0] ?? 'flow';
          const p = typeof name === 'string' ? MOTION_PRESETS[name] : name;
          v.params = p.spring;
          v.viscosity = p.viscosity;
          v.set(t);
        });
        if (s.tick) return;
        s.tick = (dt) => {
          for (const v of s.values) v.step(dt);
          if (s.values.every((v) => v.atRest(epsilon))) {
            for (const v of s.values) v.jump(v.target);
            stop();
          }
          emit();
        };
        sharedClock().add(s.tick);
      },
      jump(targets) {
        stop();
        targets.forEach((t, i) => s.values[i]!.jump(t));
        emit();
      },
      values: () => s.values.map((v) => v.value),
      get moving() {
        return s.tick !== null;
      },
    };
    state.current = s;
  }

  useEffect(
    () => () => {
      const s = state.current;
      if (s?.tick) sharedClock().remove(s.tick);
      if (s) s.tick = null;
    },
    [],
  );
  return state.current.set;
}
