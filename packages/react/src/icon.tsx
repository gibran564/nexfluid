import { ICONS, type IconName } from '@eclipsis/foundation';
import type { SVGProps } from 'react';

export interface NexIconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  /** Lado en px. Por defecto 16 (1 em de la interfaz). */
  size?: number;
  /** Si se da, el icono se anuncia; si no, es decorativo. */
  label?: string;
}

/** Icono de la retícula Nex de 24 px. Decorativo por defecto. */
export function NexIcon({ name, size = 16, label, className, ...rest }: NexIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className ? `nx-icon ${className}` : 'nx-icon'}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
      {...rest}
    >
      {ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
