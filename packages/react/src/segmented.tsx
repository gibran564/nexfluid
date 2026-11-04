'use client';

import { useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { cx, rovingIndex, type NexDensity, type NexMotion } from '@eclipsis/components';
import { useNex } from './provider.tsx';
import { LiquidDrop, useLiquid, type LiquidOrigin } from './liquid.tsx';

export interface NexSegmentedOption {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface NexSegmentedProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  options: readonly NexSegmentedOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Nombre del grupo (obligatorio salvo aria-labelledby). */
  'aria-label'?: string;
  density?: NexDensity;
  motion?: NexMotion;
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Selector de una opción entre pocas: `radiogroup` con la gota líquida. */
export function NexSegmented({ options, value: controlled, defaultValue, onValueChange, density, motion, className, ...rest }: NexSegmentedProps) {
  const defaults = useNex();
  const level = motion ?? defaults.motion;
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value);
  const value = controlled ?? inner;
  const host = useRef<HTMLDivElement>(null);
  const origin = useRef<LiquidOrigin>('program');
  const radios = () => Array.from(host.current?.querySelectorAll<HTMLElement>('[role="radio"]') ?? []);
  const liquid = useLiquid({
    host,
    items: '[role="radio"]',
    active: () => radios().find((r) => r.getAttribute('aria-checked') === 'true') ?? null,
    orientation: 'horizontal',
    form: () => 'drop',
    motion: level,
  });
  useIsoLayoutEffect(() => liquid.update(origin.current), [value, liquid.update]);

  const select = (v: string, from: LiquidOrigin) => {
    origin.current = from;
    if (controlled === undefined) setInner(v);
    onValueChange?.(v);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const all = radios();
    const current = all.indexOf(document.activeElement as HTMLElement);
    if (current < 0) return;
    const key = e.key === 'ArrowDown' ? 'ArrowRight' : e.key === 'ArrowUp' ? 'ArrowLeft' : e.key;
    const next = rovingIndex(key, current, all.map((r) => r.getAttribute('aria-disabled') === 'true'));
    if (next === null) return;
    e.preventDefault();
    all[next]!.focus();
    select(all[next]!.dataset.value!, 'keyboard');
  };
  return (
    <div
      {...rest}
      ref={host}
      role="radiogroup"
      className={cx('nx-segmented', className)}
      data-nx-density={density ?? defaults.density}
      data-nx-motion={level}
      onKeyDown={onKey}
      onPointerOver={(e) => liquid.lean((e.target as Element).closest<HTMLElement>('[role="radio"]'))}
      onPointerLeave={() => liquid.lean(null)}
    >
      <LiquidDrop svgRef={liquid.svg} pathRef={liquid.path} />
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={o.disabled || undefined}
            tabIndex={checked ? 0 : -1}
            data-value={o.value}
            className="nx-segmented__option"
            onClick={(e) => { if (!o.disabled) select(o.value, e.detail === 0 ? 'keyboard' : 'pointer'); }}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
