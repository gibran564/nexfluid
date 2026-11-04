'use client';

import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode, type Ref } from 'react';
import type { Material } from '@nexfluid/foundation';
import { cx, type NexAppearance, type NexDensity, type NexMotion } from '@nexfluid/components';
import { useNex } from './provider.tsx';
import { NexSurface } from './surface.tsx';

interface ButtonOwnProps {
  /** `default` membrana elevada · `filled` acción principal · `outlined` membrana transparente · `ghost` sin borde · `editorial` tinta. */
  appearance?: NexAppearance;
  /** Sólo `danger` cambia el color; el texto debe decir la consecuencia. */
  tone?: 'neutral' | 'danger';
  density?: NexDensity;
  motion?: NexMotion;
  /** Ocupado: mantiene el ancho, anuncia `aria-busy` y bloquea la activación sin perder el foco. */
  loading?: boolean;
  loadingLabel?: string;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
}

export type NexButtonProps = ButtonOwnProps &
  (
    | (Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { href?: undefined })
    | (Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & { href: string; disabled?: boolean })
  );

const MATERIAL: Record<NexAppearance, Material> = { default: 'raised', filled: 'solid', outlined: 'clear', ghost: 'clear', editorial: 'ink' };

/**
 * Botón: una cápsula de membrana (familia `control`). Atrae el borde hacia el
 * puntero, se aplasta al presionar conservando el volumen y se recupera con
 * física elástica; la activación inunda su zona cromática. Con `href` es un enlace.
 */
export const NexButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, NexButtonProps>(function NexButton(props, ref) {
  const defaults = useNex();
  const {
    appearance = 'default', tone = 'neutral', density = defaults.density, motion = defaults.motion,
    loading = false, loadingLabel = 'Cargando', iconStart, iconEnd, fullWidth, children, className, ...rest
  } = props;
  const content = (
    <>
      <span className="nx-button__label">
        {iconStart}
        {children}
        {iconEnd}
      </span>
      {loading && (
        <>
          <span className="nx-button__spinner" aria-hidden="true"><span /><span /><span /></span>
          <span className="nx-visually-hidden">{loadingLabel}</span>
        </>
      )}
    </>
  );
  const common = {
    kind: 'control' as const,
    material: MATERIAL[appearance],
    quiet: appearance === 'ghost',
    motion,
    className: cx('nx-button', className),
    'data-nx-appearance': appearance,
    'data-nx-tone': tone === 'neutral' ? undefined : tone,
    'data-nx-density': density,
    'data-nx-loading': loading ? '' : undefined,
    'data-nx-full-width': fullWidth ? '' : undefined,
    'data-nx-icon-only': !children && (iconStart || iconEnd) ? '' : undefined,
    'aria-busy': loading || undefined,
  };

  if (rest.href !== undefined) {
    const { disabled: linkDisabled, ...anchor } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & { disabled?: boolean };
    const inert = linkDisabled || loading;
    return (
      <NexSurface
        {...(anchor as object)}
        {...common}
        as="a"
        interactive={!inert}
        activatable={!inert}
        ref={ref as Ref<HTMLElement>}
        href={inert ? undefined : anchor.href}
        aria-disabled={inert || undefined}
        ariaRole={inert ? 'link' : undefined}
        tabIndex={inert ? 0 : anchor.tabIndex}
      >
        {content}
      </NexSurface>
    );
  }
  const { type = 'button', onClick, disabled, ...button } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <NexSurface
      {...(button as object)}
      {...common}
      as="button"
      interactive={!disabled && !loading}
      activatable={!disabled && !loading}
      ref={ref as Ref<HTMLElement>}
      type={type}
      disabled={disabled}
      aria-disabled={loading || undefined}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (loading) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    >
      {content}
    </NexSurface>
  );
});

export interface NexIconButtonProps extends Omit<NexButtonProps, 'children' | 'iconStart' | 'iconEnd' | 'href'> {
  /** Nombre accesible obligatorio: un botón sólo con icono no tiene texto visible. */
  label: string;
  icon: ReactNode;
}

/** Botón circular con icono. `label` es obligatorio y se usa como `aria-label` y `title`. */
export const NexIconButton = forwardRef<HTMLButtonElement, NexIconButtonProps>(function NexIconButton({ label, icon, appearance = 'ghost', ...rest }, ref) {
  return <NexButton {...(rest as NexButtonProps)} ref={ref} appearance={appearance} aria-label={label} title={label} iconStart={icon} />;
});
