'use client';

import { useEffect, useId, useLayoutEffect, useRef, type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import { cx, type NexMotion } from '@nexfluid/components';
import { NexIcon } from './icon.tsx';
import { useNex } from './provider.tsx';
import { LiquidDrop, useLiquid, type LiquidOrigin } from './liquid.tsx';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface NexNavProps extends HTMLAttributes<HTMLElement> {
  /** Nombre de la navegación (obligatorio: una página puede tener varias). */
  'aria-label': string;
  motion?: NexMotion;
  children?: ReactNode;
}

/**
 * Navegación vertical con la gota líquida bajo el elemento actual
 * (`aria-current`). La gota se inclina hacia el elemento bajo el puntero.
 */
function NavRoot({ motion, className, children, ...rest }: NexNavProps) {
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
  return (
    <nav
      {...rest}
      ref={host}
      className={cx('nx-nav', className)}
      onPointerDown={() => { origin.current = 'pointer'; }}
      onKeyDown={() => { origin.current = 'keyboard'; }}
      onPointerOver={(e) => liquid.lean((e.target as Element).closest<HTMLElement>('.nx-nav__item'))}
      onPointerLeave={() => liquid.lean(null)}
    >
      <LiquidDrop svgRef={liquid.svg} pathRef={liquid.path} />
      <ul className="nx-nav__list">{children}</ul>
    </nav>
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
  /**
   * Contenido HERMANO del elemento, dentro de su fila (p. ej. un menú de
   * acciones). A diferencia de `trailing`, no queda dentro del botón: así un
   * control interactivo no se anida en otro.
   */
  aside?: ReactNode;
  children?: ReactNode;
}

export function NexNavItem({ href, current, icon, trailing, level = 0, as, expanded, aside, className, children, style, ...rest }: NexNavItemProps) {
  const Tag: ElementType = as ?? (href ? 'a' : 'button');
  return (
    <li className={aside ? 'nx-nav__row' : undefined}>
      <Tag
        {...rest}
        href={href}
        type={!href && !as ? 'button' : undefined}
        aria-current={current ? (href ? 'page' : 'true') : undefined}
        aria-expanded={expanded}
        className={cx('nx-nav__item', className)}
        style={{ ...style, '--nx-nav-level': level } as CSSProperties}
      >
        {expanded !== undefined && <NexIcon name="chevron-right" className="nx-nav__caret" size={14} />}
        {icon}
        <span>{children}</span>
        {trailing && <span className="nx-nav__trailing">{trailing}</span>}
      </Tag>
      {aside && <span className="nx-nav__aside">{aside}</span>}
    </li>
  );
}

/** Grupo con nombre: una sublista etiquetada por su título. */
export function NexNavGroup({ label, children }: { label: string; children?: ReactNode }) {
  const id = `nx-navg-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <li className="nx-nav__group-wrap">
      <p className="nx-nav__group" id={id}>{label}</p>
      <ul className="nx-nav__sublist" aria-labelledby={id}>{children}</ul>
    </li>
  );
}

export const NexNav = Object.assign(NavRoot, { Item: NexNavItem, Group: NexNavGroup });
