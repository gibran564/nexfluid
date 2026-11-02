'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { createFluidBlob, type BaseGeometry, type FluidBlobHandle, type MotionOverrides, type MotionPresetName } from '@eclipsis/core';
import { cx } from '@eclipsis/components';
import { useMotionPreference } from '../provider.tsx';

export interface FluidBlobProps {
  motion?: MotionPresetName;
  intensity?: number;
  dampingRatio?: number;
  viscosity?: number;
  base?: BaseGeometry;
  points?: number;
  seed?: number;
  /** Deriva ambiental. Apagada por defecto en productos (política de Nextudio). */
  ambient?: boolean;
  interactive?: boolean;
  /** Con nombre, es una imagen; sin él, decorativa. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/** Adaptador React de `createFluidBlob` (@eclipsis/core). Sólo en el cliente; en SSR es un contenedor vacío. */
export function FluidBlob({
  motion = 'flow', intensity, dampingRatio, viscosity, base, points, seed, ambient = false, interactive = true,
  label, className, style,
}: FluidBlobProps) {
  const host = useRef<HTMLDivElement>(null);
  const blob = useRef<FluidBlobHandle | null>(null);
  const preference = useMotionPreference();
  const overrides: MotionOverrides = {};
  if (intensity !== undefined) overrides.intensity = intensity;
  if (dampingRatio !== undefined) overrides.dampingRatio = dampingRatio;
  if (viscosity !== undefined) overrides.viscosity = viscosity;

  useEffect(() => {
    if (!host.current || !preference) return;
    blob.current = createFluidBlob(host.current, { motionPreference: preference });
    return () => {
      blob.current?.destroy();
      blob.current = null;
    };
  }, [preference]);

  useEffect(() => {
    blob.current?.update({
      motion, overrides, ambient, interactive, label: label ?? null,
      ...(base ? { base } : {}), ...(points ? { points } : {}), ...(seed ? { seed } : {}),
    });
  });

  return <div ref={host} className={cx('nx-fluid-blob', className)} style={style} />;
}
