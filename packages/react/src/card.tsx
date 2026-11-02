'use client';

import {
  createContext, useCallback, useContext, useRef, useState,
  type AnchorHTMLAttributes, type HTMLAttributes, type ReactNode, type RefObject,
} from 'react';
import type { MorphPhysics, MorphPhysicsName } from '@eclipsis/core';
import type { Material, ShapeFamily } from '@eclipsis/foundation';
import { cx, type NexAppearance, type NexDensity, type NexMotion } from '@eclipsis/components';
import { NexIconButton } from './button.tsx';
import { NexIcon } from './icon.tsx';
import { NexMorph, useNexMorphSource, type NexMorphTargetProps } from './morph.tsx';
import { useNex } from './provider.tsx';
import { NexSurface } from './surface.tsx';

const CardContext = createContext<{ headingLevel: 2 | 3 | 4; expand: (() => void) | null }>({ headingLevel: 3, expand: null });

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
   * (NexMorph) en un panel con este contenido; al cerrar vuelve a su sitio.
   */
  expansion?: ReactNode;
  /** Título del panel ampliado (por defecto, el texto de NexCard.Title). */
  expansionTitle?: string;
  /** Dónde se abre: `viewport` (modal, por defecto) o un contenedor posicionado (región, no modal). */
  expansionContainer?: NexMorphTargetProps['container'];
  /** Física de la transformación (familia NexMorph). Por defecto `morph`. */
  expansionPhysics?: MorphPhysicsName | MorphPhysics;
  /** `false`: sin cabecera ni cierre propios; el contenido usa `NexMorph.Title` y `NexMorph.Close`. */
  expansionChrome?: boolean;
  /** Estado de la expansión (controlado). */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  children?: ReactNode;
}

const MATERIAL: Record<NexAppearance, Material> = { default: 'base', outlined: 'base', filled: 'sunken', ghost: 'clear', editorial: 'ink' };

/** Tarjeta: una membrana viva con composición editorial interna. */
function CardRoot(props: NexCardProps) {
  const {
    expansion, expansionTitle, expansionContainer = 'viewport', expansionPhysics = 'morph', expansionChrome = true,
    expanded, onExpandedChange, motion,
  } = props;
  const defaults = useNex();
  const level = motion ?? defaults.motion;
  const root = useRef<HTMLElement>(null);
  const [inner, setInner] = useState(false);
  const open = expanded ?? inner;
  const setOpen = useCallback((v: boolean) => {
    if (expanded === undefined) setInner(v);
    onExpandedChange?.(v);
  }, [expanded, onExpandedChange]);
  if (!expansion) return <CardSurface {...props} level={level} root={root} expand={null} />;
  const title = expansionTitle ?? root.current?.querySelector('.nx-card__title')?.textContent ?? 'Detalle';
  return (
    <NexMorph open={open} onOpenChange={setOpen} physics={expansionPhysics} motion={level}>
      <CardSurface {...props} level={level} root={root} expand={() => setOpen(true)} />
      <NexMorph.Target container={expansionContainer} label={title}>
        {expansionChrome ? (
          <>
            <div className="nx-expansion__header">
              <NexMorph.Title className="nx-expansion__title nx-type-title">{title}</NexMorph.Title>
              <NexMorph.Close />
            </div>
            <div className="nx-expansion__body">{expansion}</div>
          </>
        ) : expansion}
      </NexMorph.Target>
    </NexMorph>
  );
}

function CardSurface({
  appearance = 'outlined', shape, density, interactive, selected, as = 'article', headingLevel = 3,
  expansion, expansionTitle: _t, expansionContainer: _c, expansionPhysics: _p, expansionChrome: _h, expanded: _e, onExpandedChange: _o,
  motion: _m, className, children, level, root, expand, ...rest
}: NexCardProps & { level: NexMotion; root: RefObject<HTMLElement | null>; expand: (() => void) | null }) {
  const defaults = useNex();
  const source = useNexMorphSource<HTMLElement>();
  const sourceRef = source.ref;
  const ref = useCallback((node: HTMLElement | null) => {
    root.current = node;
    if (expand) sourceRef(node);
  }, [root, expand, sourceRef]);
  return (
    <CardContext.Provider value={{ headingLevel, expand }}>
      <NexSurface
        {...rest}
        {...(expand ? source.props : null)}
        ref={ref}
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
    </CardContext.Provider>
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
  // Elemento compartido: continúa en el título del panel ampliado (NexMorph).
  return <Tag data-nx-morph-shared="title" {...rest} className={cx('nx-card__title', className)} />;
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
