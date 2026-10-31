'use client';

import { useId, useState, type HTMLAttributes, type ReactNode } from 'react';
import type { Material, ShapeFamily } from '@nexfluid/foundation';
import { cx, toDomId, type NexDensity, type NexMotion } from '@nexfluid/components';
import { NexIconButton } from './button.tsx';
import { NexIcon } from './icon.tsx';
import { useNex } from './provider.tsx';
import { NexSurface } from './surface.tsx';

export interface NexPanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  /** Acciones de la cabecera. */
  actions?: ReactNode;
  /** Se pliega y despliega (la membrana cede y se recupera; el contenido no se desmonta). */
  collapsible?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  material?: Material;
  shape?: ShapeFamily;
  density?: NexDensity;
  motion?: NexMotion;
  /** Nivel del título. */
  headingLevel?: 2 | 3 | 4;
  children?: ReactNode;
}

/** Panel: membrana elevada con cabecera y cuerpo plegable. Base de inspectores y widgets. */
export function NexPanel({
  title, actions, collapsible = false, open: controlled, defaultOpen = true, onOpenChange, material = 'raised', shape,
  density, motion, headingLevel = 3, className, children, ...rest
}: NexPanelProps) {
  const defaults = useNex();
  const [inner, setInner] = useState(defaultOpen);
  const open = controlled ?? inner;
  const id = toDomId('nx-panel', useId());
  const Heading = `h${headingLevel}` as 'h3';
  const toggle = () => {
    if (controlled === undefined) setInner(!open);
    onOpenChange?.(!open);
  };
  return (
    <NexSurface
      {...rest}
      as="section"
      kind="surface"
      shape={shape}
      material={material}
      live
      motion={motion ?? defaults.motion}
      aria-labelledby={`${id}-title`}
      className={cx('nx-panel', className)}
      data-nx-density={density ?? defaults.density}
      data-nx-collapsed={collapsible && !open ? '' : undefined}
    >
      <header className="nx-panel__header">
        <Heading id={`${id}-title`} className="nx-panel__title">{title}</Heading>
        {actions && <div className="nx-panel__actions">{actions}</div>}
        {collapsible && (
          <NexIconButton
            className="nx-panel__toggle"
            label={open ? 'Plegar' : 'Desplegar'}
            icon={<NexIcon name="chevron-down" />}
            density="compact"
            aria-expanded={open}
            aria-controls={`${id}-body`}
            onClick={toggle}
          />
        )}
      </header>
      <div className="nx-panel__body-wrap">
        <div id={`${id}-body`} className="nx-panel__body" inert={collapsible && !open ? true : undefined}>
          <div className="nx-panel__inner">{children}</div>
        </div>
      </div>
    </NexSurface>
  );
}
