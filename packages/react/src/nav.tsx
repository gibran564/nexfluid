'use client';

import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import { cx, type NexDensity, type NexMotion } from '@nexfluid/components';
import { NexTooltip } from './tooltip.tsx';
import { NexIcon } from './icon.tsx';
import { useNex } from './provider.tsx';
import { LiquidDrop, useLiquid, type LiquidOrigin } from './liquid.tsx';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface NexNavProps extends HTMLAttributes<HTMLElement> {
  /** Nombre de la navegación (obligatorio: una página puede tener varias). */
  'aria-label': string;
  motion?: NexMotion;
  /**
   * Riel compacto: sólo iconos. Las etiquetas siguen siendo el nombre
   * accesible (texto oculto) y aparecen como rótulo (`NexTooltip`) con el
   * puntero o el foco de teclado. Mismo icono en los dos estados.
   */
  compact?: boolean;
  /** `compact` 32 px · `comfortable` 36 px (por defecto) · `spacious` 44 px. */
  density?: NexDensity;
  /**
   * `true` (por defecto): es un landmark `<nav>`. `false`: un grupo con nombre
   * (`role="group"`) para componer varias listas dentro de UNA navegación
   * (la barra lateral de una aplicación) sin anidar landmarks.
   */
  landmark?: boolean;
  /** Lado del rótulo en el riel compacto. Por defecto, `right`. */
  tooltipSide?: 'right' | 'left';
  /** Distancia del rótulo al destino (px): para que salga del riel si éste tiene margen. Por defecto 8. */
  tooltipGap?: number;
  children?: ReactNode;
}

interface NavContextValue { compact: boolean; tooltipSide: 'right' | 'left'; tooltipGap: number }
const NavContext = createContext<NavContextValue>({ compact: false, tooltipSide: 'right', tooltipGap: 8 });

/**
 * Navegación vertical con la gota líquida bajo el elemento actual
 * (`aria-current`). La gota se inclina hacia el elemento bajo el puntero.
 */
function NavRoot({ motion, compact = false, density, landmark = true, tooltipSide = 'right', tooltipGap = 8, className, children, ...rest }: NexNavProps) {
  const defaults = useNex();
  const host = useRef<HTMLElement>(null);
  const origin = useRef<LiquidOrigin>('program');
  const liquid = useLiquid({
    host,
    items: '.nx-nav__item',
    active: () => host.current?.querySelector<HTMLElement>('.nx-nav__item:is([aria-current="page"], [aria-current="true"])') ?? null,
    orientation: 'vertical',
    form: () => 'drop',
    motion: motion ?? defaults.motion,
  });
  // Tras cada render (cambia el elemento actual o el árbol), la gota busca su sitio.
  useIsoLayoutEffect(() => {
    liquid.update(origin.current);
    origin.current = 'program';
  });
  const Tag = landmark ? 'nav' : 'div';
  return (
    <Tag
      {...rest}
      ref={host as never}
      role={landmark ? undefined : 'group'}
      className={cx('nx-nav', className)}
      data-nx-compact={compact ? '' : undefined}
      data-nx-density={density}
      onPointerDown={() => { origin.current = 'pointer'; }}
      onKeyDown={() => { origin.current = 'keyboard'; }}
      onPointerOver={(e) => liquid.lean((e.target as Element).closest<HTMLElement>('.nx-nav__item'))}
      onPointerLeave={() => liquid.lean(null)}
    >
      <LiquidDrop svgRef={liquid.svg} pathRef={liquid.path} />
      <NavContext.Provider value={{ compact, tooltipSide, tooltipGap }}>
        <ul className="nx-nav__list">{children}</ul>
      </NavContext.Provider>
    </Tag>
  );
}

export interface NexNavItemProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  href?: string;
  /** Elemento actual de la navegación. */
  current?: boolean;
  icon?: ReactNode;
  trailing?: ReactNode;
  /** Nivel de anidación (árboles de explorador). */
  level?: number;
  /** Componente de enlace propio (p. ej. Link de Next.js). */
  as?: ElementType;
  /** Rama plegable: muestra un cursor y anuncia aria-expanded. */
  expanded?: boolean;
  children?: ReactNode;
}

export function NexNavItem({ href, current, icon, trailing, level = 0, as, expanded, className, children, style, ...rest }: NexNavItemProps) {
  const Tag: ElementType = as ?? (href ? 'a' : 'button');
  const { compact, tooltipSide, tooltipGap } = useContext(NavContext);
  // Compacto: el texto sigue ahí (nombre accesible) pero oculto; el rótulo lo repite al ver.
  const item = (
      <Tag
        {...rest}
        href={href}
        type={!href && !as ? 'button' : undefined}
        aria-current={current ? (href ? 'page' : 'true') : undefined}
        aria-expanded={expanded}
        className={cx('nx-nav__item', className)}
        style={{ ...style, '--nx-nav-level': level } as CSSProperties}
      >
        {expanded !== undefined && !compact && <NexIcon name="chevron-right" className="nx-nav__caret" size={14} />}
        {icon}
        <span className={compact ? 'nx-visually-hidden' : 'nx-nav__label'}>{children}</span>
        {trailing && <span className="nx-nav__trailing">{trailing}</span>}
      </Tag>
  );
  return (
    <li>
      {compact ? <NexTooltip label={children} side={tooltipSide} align="center" gap={tooltipGap}>{item}</NexTooltip> : item}
    </li>
  );
}

/** Grupo con nombre: una sublista etiquetada por su título. */
export function NexNavGroup({ label, children }: { label: string; children?: ReactNode }) {
  const id = `nx-navg-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { compact } = useContext(NavContext);
  return (
    <li className="nx-nav__group-wrap">
      {/* Compacto: el título sigue nombrando la sublista, sin ocupar el riel. */}
      <p className={cx('nx-nav__group', compact && 'nx-visually-hidden')} id={id}>{label}</p>
      <ul className="nx-nav__sublist" aria-labelledby={id}>{children}</ul>
    </li>
  );
}

export const NexNav = Object.assign(NavRoot, { Item: NexNavItem, Group: NexNavGroup });
