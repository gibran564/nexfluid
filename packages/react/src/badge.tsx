import type { HTMLAttributes, ReactNode } from 'react';
import { cx, type NexDensity, type NexTone } from '@nexfluid/components';

export interface NexBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: NexTone;
  /** `outlined` (por defecto, como `.tag`) · `filled` fondo suave · `editorial` metadato en mono. */
  appearance?: 'outlined' | 'filled' | 'editorial';
  density?: NexDensity;
  /** Punto de estado. Nunca sustituye al texto (WCAG 1.4.1). */
  dot?: boolean;
  children: ReactNode;
}

/** Etiqueta no interactiva para estado y metadatos (equivale a `StatusBadge` y `.tag` de Nextudio). */
export function NexBadge({ tone = 'neutral', appearance = 'outlined', density, dot, className, children, ...rest }: NexBadgeProps) {
  return (
    <span
      {...rest}
      className={cx('nx-badge', className)}
      data-nx-tone={tone}
      data-nx-appearance={appearance}
      data-nx-density={density}
    >
      {dot && <span className="nx-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
