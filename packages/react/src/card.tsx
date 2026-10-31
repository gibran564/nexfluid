'use client';

import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type AnchorHTMLAttributes, type HTMLAttributes, type KeyboardEvent, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { membranePath } from '@nexfluid/core';
import type { Material, ShapeFamily } from '@nexfluid/foundation';
import { cx, type NexAppearance, type NexDensity, type NexMotion } from '@nexfluid/components';
import { NexIconButton } from './button.tsx';
import { NexIcon } from './icon.tsx';
import { canAnimate, useMotionPreference, useNex } from './provider.tsx';
import { useSprings } from './springs.ts';
import { NexSurface } from './surface.tsx';

const CardContext = createContext<{ headingLevel: 2 | 3 | 4; expand: (() => void) | null; titleId: string }>({ headingLevel: 3, expand: null, titleId: '' });

export interface NexCardProps extends HTMLAttributes<HTMLElement> {
  /** `outlined`/`default` membrana · `filled` hundida · `ghost` transparente · `editorial` tinta con titular grande. */
  appearance?: NexAppearance;
  /** Familia geométrica (por defecto, la de superficie de la dirección; `morph` si se expande). */
  shape?: ShapeFamily;
  density?: NexDensity;
  motion?: NexMotion;
  /** La membrana responde al puntero y al foco. Usa `NexCard.Link` para que sea navegable. */
  interactive?: boolean;
  selected?: boolean;
  as?: 'article' | 'section' | 'div' | 'li';
  headingLevel?: 2 | 3 | 4;
  /**
   * Contenido ampliado. Si se da, la tarjeta ofrece «Ampliar» y se transforma
   * en un panel (morfología de membrana) con este contenido.
   */
  expansion?: ReactNode;
  /** Título del panel ampliado (por defecto, el texto de NexCard.Title). */
  expansionTitle?: string;
  children?: ReactNode;
}

const MATERIAL: Record<NexAppearance, Material> = { default: 'base', outlined: 'base', filled: 'sunken', ghost: 'clear', editorial: 'ink' };

/** Tarjeta: una membrana viva con composición editorial interna. */
function CardRoot({
  appearance = 'outlined', shape, density, motion, interactive, selected, as = 'article', headingLevel = 3,
  expansion, expansionTitle, className, children, ...rest
}: NexCardProps) {
  const defaults = useNex();
  const level = motion ?? defaults.motion;
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const titleId = `nx-card-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const trigger = useRef<HTMLElement | null>(null);
  const expand = useCallback(() => {
    trigger.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);
  return (
    <CardContext.Provider value={{ headingLevel, expand: expansion ? expand : null, titleId }}>
      <NexSurface
        {...rest}
        ref={root}
        as={as}
        kind="surface"
        shape={shape ?? (expansion ? 'morph' : undefined)}
        material={MATERIAL[appearance]}
        interactive={interactive || Boolean(expansion)}
        live={appearance !== 'ghost'}
        selected={selected}
        motion={level}
        className={cx('nx-card', className)}
        data-nx-appearance={appearance === 'default' ? 'outlined' : appearance}
        data-nx-density={density ?? defaults.density}
        data-nx-interactive={interactive ? '' : undefined}
      >
        {children}
      </NexSurface>
      {expansion && open && (
        <Expansion
          origin={root}
          title={expansionTitle ?? root.current?.querySelector('.nx-card__title')?.textContent ?? 'Detalle'}
          motion={level}
          onClose={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
        >
          {expansion}
        </Expansion>
      )}
    </CardContext.Provider>
  );
}

/**
 * Morfología tarjeta → panel: la membrana del panel nace con la caja de la
 * tarjeta y fluye hasta su tamaño final (física «surface»: viscosa); el
 * contenido emerge al asentarse. Al cerrar, vuelve a la tarjeta.
 */
function Expansion({ origin, title, motion, onClose, children }: { origin: React.RefObject<HTMLElement | null>; title: string; motion: NexMotion; onClose: () => void; children: ReactNode }) {
  const preference = useMotionPreference();
  const host = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const shape = useRef<SVGPathElement>(null);
  const edge = useRef<SVGPathElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const closing = useRef(false);
  const titleId = `nx-exp-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const animate = canAnimate(motion, preference);

  const place = (x: number, y: number, w: number, h: number) => {
    const p = panel.current;
    if (!p) return;
    Object.assign(p.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    const d = membranePath(w, h, { radius: Math.min(26, 12 + w / 40), smoothing: 0.9 });
    svg.current?.setAttribute('viewBox', `0 0 ${w} ${h}`);
    shape.current?.setAttribute('d', d);
    edge.current?.setAttribute('d', d);
  };
  const targetRect = () => {
    const w = Math.min(760, innerWidth - 32);
    const h = Math.min(innerHeight * 0.84, 680);
    return [(innerWidth - w) / 2, (innerHeight - h) / 2, w, h];
  };
  const springs = useSprings([0, 0, 0, 0], ([x, y, w, h]) => {
    place(x!, y!, w!, h!);
    const t = targetRect();
    const settled = Math.abs(w! - t[2]!) < 1 && Math.abs(h! - t[3]!) < 1;
    if (host.current) {
      if (settled && !closing.current) host.current.dataset.nxSettled = '';
      else delete host.current.dataset.nxSettled;
    }
  }, 0.5);

  const fromRect = () => {
    const r = origin.current?.getBoundingClientRect();
    return r ? [r.left, r.top, r.width, r.height] : targetRect();
  };

  useEffect(() => {
    const start = fromRect();
    springs.jump(start);
    host.current!.dataset.nxOpen = '';
    if (animate) springs.to(targetRect(), ['viscous', 'viscous', 'viscous', 'viscous']);
    else {
      springs.jump(targetRect());
      host.current!.dataset.nxSettled = '';
    }
    host.current?.querySelector<HTMLElement>('[data-nx-autofocus]')?.focus();
    const onResize = () => { if (!closing.current) springs.jump(targetRect()); };
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, []); // eslint-disable-line

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    delete host.current?.dataset.nxSettled;
    delete host.current?.dataset.nxOpen;
    if (!animate) return onClose();
    springs.to(fromRect(), ['flow', 'flow', 'flow', 'flow']);
    setTimeout(onClose, 380);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
    if (e.key === 'Tab') {
      const focusables = Array.from(panel.current?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []);
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  return createPortal(
    <div ref={host} className="nx-expansion nx-root" onKeyDown={onKey}>
      <button type="button" className="nx-expansion__scrim" tabIndex={-1} aria-hidden="true" onClick={close} />
      <div ref={panel} className="nx-expansion__panel nx-surface" data-nx-drawn="" data-nx-material="raised" data-nx-shape="morph" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <svg ref={svg} className="nx-surface__shape" aria-hidden="true" focusable="false" preserveAspectRatio="none">
          <path ref={shape} className="nx-surface__fill" />
          <path ref={edge} className="nx-surface__edge" />
        </svg>
        <div className="nx-expansion__header">
          <h2 id={titleId} className="nx-expansion__title nx-type-title">{title}</h2>
          <NexIconButton label="Cerrar" icon={<NexIcon name="close" />} onClick={close} data-nx-autofocus="" />
        </div>
        <div className="nx-expansion__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

type Div = HTMLAttributes<HTMLDivElement>;

export function NexCardMedia({ className, ...rest }: Div) {
  return <div {...rest} className={cx('nx-card__media', className)} />;
}
export function NexCardHeader({ className, actions, children, ...rest }: Div & { actions?: ReactNode }) {
  const { expand } = useContext(CardContext);
  return (
    <div {...rest} className={cx('nx-card__header', className)}>
      <div className="nx-card__heading">{children}</div>
      {(actions || expand) && (
        <div className="nx-card__actions">
          {actions}
          {expand && <NexIconButton label="Ampliar" icon={<NexIcon name="external" />} density="compact" onClick={expand} />}
        </div>
      )}
    </div>
  );
}
/** Índice editorial (gota + mono). Sustituye al antiguo antetítulo. */
export function NexCardEyebrow({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...rest} className={cx('nx-index', className)} />;
}
export function NexCardTitle({ className, as, ...rest }: HTMLAttributes<HTMLHeadingElement> & { as?: 'h2' | 'h3' | 'h4' | 'p' }) {
  const { headingLevel } = useContext(CardContext);
  const Tag = as ?? (`h${headingLevel}` as 'h2' | 'h3' | 'h4');
  return <Tag {...rest} className={cx('nx-card__title', className)} />;
}
export function NexCardDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...rest} className={cx('nx-card__description', className)} />;
}
export function NexCardContent({ className, ...rest }: Div) {
  return <div {...rest} className={cx('nx-card__content', className)} />;
}
export function NexCardFooter({ className, ...rest }: Div) {
  return <div {...rest} className={cx('nx-card__footer', className)} />;
}
export function NexCardActions({ className, ...rest }: Div) {
  return <div {...rest} className={cx('nx-card__actions', className)} />;
}
/** Enlace principal: su área cubre toda la tarjeta, sin anidar controles en un enlace. */
export function NexCardLink({ className, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...rest} className={cx('nx-card__link', className)} />;
}

export const NexCard = Object.assign(CardRoot, {
  Media: NexCardMedia,
  Header: NexCardHeader,
  Eyebrow: NexCardEyebrow,
  Title: NexCardTitle,
  Description: NexCardDescription,
  Content: NexCardContent,
  Footer: NexCardFooter,
  Actions: NexCardActions,
  Link: NexCardLink,
});
