'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx, type NexMotion } from '@nexfluid/components';
import { canAnimate, useMotionPreference, useNex } from '../provider.tsx';
import { NexSegmented } from '../segmented.tsx';
import { useSprings } from '../springs.ts';
import { NexSurface } from '../surface.tsx';

export interface NexPreviewDevice {
  value: string;
  label: string;
  /** Ancho en px; `null` = todo el disponible. */
  width: number | null;
}

const DEVICES: readonly NexPreviewDevice[] = [
  { value: 'fluid', label: 'Fluido', width: null },
  { value: 'tablet', label: 'Tableta', width: 768 },
  { value: 'phone', label: 'Móvil', width: 375 },
];

export interface NexPreviewWidgetProps {
  title: string;
  children: ReactNode;
  devices?: readonly NexPreviewDevice[];
  defaultDevice?: string;
  actions?: ReactNode;
  motion?: NexMotion;
  className?: string;
}

/**
 * Vista previa: membrana con barra (título, selector de dispositivo, acciones)
 * y un visor cuyo ancho fluye entre dispositivos con física de superficie.
 */
export function NexPreviewWidget({ title, children, devices = DEVICES, defaultDevice, actions, motion, className }: NexPreviewWidgetProps) {
  const defaults = useNex();
  const level = motion ?? defaults.motion;
  const preference = useMotionPreference();
  const [device, setDevice] = useState(defaultDevice ?? devices[0]!.value);
  const stage = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLElement | null>(null);
  const springs = useSprings([0], ([w]) => {
    if (viewport.current && w! > 0) viewport.current.style.setProperty('--nx-preview-w', `${Math.round(w!)}px`);
  }, 0.5);
  const widthFor = (v: string) => {
    const d = devices.find((x) => x.value === v);
    const max = stage.current ? stage.current.clientWidth - 32 : 0;
    return d?.width ? Math.min(d.width, max) : max;
  };
  useEffect(() => {
    const w = widthFor(device);
    if (!w) return;
    if (springs.values()[0] === 0 || !canAnimate(level, preference)) springs.jump([w]);
    else springs.to([w], ['viscous']);
  }, [device]); // eslint-disable-line
  useEffect(() => {
    const el = stage.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const o = new ResizeObserver(() => springs.jump([widthFor(device)]));
    o.observe(el);
    return () => o.disconnect();
  }, [device]); // eslint-disable-line

  return (
    <NexSurface as="section" kind="surface" material="sunken" live className={cx('nx-preview', className)} aria-label={title}>
      <div className="nx-preview__bar">
        <h3 className="nx-preview__title">{title}</h3>
        <NexSegmented aria-label="Dispositivo" density="compact" value={device} onValueChange={setDevice} options={devices.map((d) => ({ value: d.value, label: d.label }))} />
        {actions}
      </div>
      <div ref={stage} className="nx-preview__stage">
        <NexSurface ref={viewport} kind="surface" material="base" live className="nx-preview__viewport">
          {children}
        </NexSurface>
      </div>
    </NexSurface>
  );
}
