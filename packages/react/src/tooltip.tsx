'use client';

/**
 * NexTooltip: el rótulo de un control que no lo lleva escrito.
 *
 * Envuelve UN elemento (un botón de icono, un enlace de un riel compacto) sin
 * añadir caja (`display: contents`) y aparece junto a él con el puntero o con
 * el foco de TECLADO (`:focus-visible`; un clic con el ratón no lo deja
 * pegado). Sube a la capa superior del navegador (Popover API) y se recoloca
 * contra el viewport: ningún contenedor con `overflow` lo recorta, que es lo
 * que les pasa a los rótulos de una barra lateral con desplazamiento.
 *
 * WCAG 1.4.13: se puede descartar (Escape), se puede recorrer con el puntero
 * sin que desaparezca y dura mientras el puntero o el foco sigan ahí.
 *
 * Por defecto es decorativo (`aria-hidden`): repite un nombre que el control
 * ya tiene (`aria-label` o texto oculto). Con `describe`, el rótulo es una
 * descripción adicional y se une con `aria-describedby`.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cx, type NexAlign, type NexSide } from '@nexfluid/components';
import { useAnchoredLayer } from './anchored.ts';

export interface NexTooltipProps {
  /** El rótulo. */
  label: ReactNode;
  /** Lado preferido; se da la vuelta si no cabe. Por defecto `top`. */
  side?: NexSide;
  align?: NexAlign;
  /** Distancia al control en px. Por defecto 8; más si el control está dentro de un riel con margen. */
  gap?: number;
  /** El rótulo describe (aria-describedby) en vez de repetir el nombre. */
  describe?: boolean;
  /** Sin rótulo (p. ej. cuando el texto ya se ve): el hijo se pinta tal cual. */
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function NexTooltip({ label, side = 'top', align = 'center', gap = 8, describe = false, disabled = false, className, children }: NexTooltipProps) {
  const id = `nx-tip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const wrap = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const anchor = () => (wrap.current?.firstElementChild as HTMLElement | null) ?? null;
  const shown = open && !disabled;

  useAnchoredLayer(shown, tip, anchor, { side, align, gap, flip: true, shift: true });

  // Descripción real: se une al control mientras exista el rótulo.
  useEffect(() => {
    const el = anchor();
    if (!el || !describe || disabled) return;
    const before = el.getAttribute('aria-describedby');
    el.setAttribute('aria-describedby', [before, id].filter(Boolean).join(' '));
    return () => { if (before) el.setAttribute('aria-describedby', before); else el.removeAttribute('aria-describedby'); };
  }, [describe, disabled, id]);

  // Escape lo descarta sin mover el foco ni cerrar lo que haya debajo.
  useEffect(() => {
    if (!shown) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [shown]);

  if (disabled) return <>{children}</>;

  return (
    <span
      ref={wrap}
      className="nx-tooltip-anchor"
      onPointerOver={() => setOpen(true)}
      onPointerOut={(event) => { if (!(event.relatedTarget instanceof Node && wrap.current?.contains(event.relatedTarget))) setOpen(false); }}
      onFocus={(event) => { if ((event.target as Element).matches?.(':focus-visible')) setOpen(true); }}
      onBlur={(event) => { if (!(event.relatedTarget instanceof Node && wrap.current?.contains(event.relatedTarget))) setOpen(false); }}
    >
      {children}
      {/* Siempre en el DOM cuando describe: aria-describedby necesita un destino aunque esté oculto. */}
      {(shown || describe) && (
        <span
          ref={tip}
          id={id}
          role="tooltip"
          aria-hidden={describe ? undefined : true}
          hidden={!shown}
          className={cx('nx-tooltip', className)}
          data-side={side}
        >
          {label}
        </span>
      )}
    </span>
  );
}
