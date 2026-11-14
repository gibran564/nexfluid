'use client';

import {
  createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState,
  type ButtonHTMLAttributes, type HTMLAttributes, type KeyboardEvent, type ReactNode, type RefObject,
} from 'react';
import { MOTION } from '@nexfluid/foundation';
import { cx, rovingIndex, toDomId, type NexDensity, type NexMotion, type Orientation } from '@nexfluid/components';
import { canAnimate, useMotionPreference, useNex } from './provider.tsx';
import { LiquidDrop, useLiquid } from './liquid.tsx';

type Origin = 'pointer' | 'keyboard' | 'program';

interface TabsContextValue {
  baseId: string;
  value: string | undefined;
  select: (value: string, origin: Origin) => void;
  orientation: Orientation;
  activation: 'automatic' | 'manual';
  motion: NexMotion;
  appearance: NonNullable<NexTabsProps['appearance']>;
  origin: RefObject<Origin>;
  /** Paneles montados: una pestaña sólo apunta (aria-controls) a un panel que existe. */
  panels: ReadonlySet<string>;
  registerPanel: (value: string) => () => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`${component} debe estar dentro de <NexTabs>.`);
  return ctx;
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface NexTabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  /** Controlado. */
  value?: string;
  /** No controlado. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: Orientation;
  /** `automatic`: las flechas seleccionan. `manual`: las flechas mueven el foco; Intro/Espacio seleccionan. */
  activation?: 'automatic' | 'manual';
  /** `liquid` gota rellena (por defecto) · `thread` hilo que se estrecha · `editorial` titulares · `compact` gota pequeña. */
  appearance?: 'liquid' | 'thread' | 'editorial' | 'compact';
  density?: NexDensity;
  /** Movimiento del indicador y del panel. Teclado y movimiento reducido siempre son inmediatos. */
  motion?: NexMotion;
}

function TabsRoot({
  value: controlled, defaultValue, onValueChange, orientation = 'horizontal', activation = 'automatic',
  appearance = 'liquid', density, motion, className, children, ...rest
}: NexTabsProps) {
  const defaults = useNex();
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = controlled ?? uncontrolled;
  const baseId = toDomId('nx-tabs', useId());
  const origin = useRef<Origin>('program');
  const changeRef = useRef(onValueChange);
  changeRef.current = onValueChange;
  const select = useCallback((next: string, from: Origin) => {
    origin.current = from;
    if (controlled === undefined) setUncontrolled(next);
    changeRef.current?.(next);
  }, [controlled]);
  const level = motion ?? defaults.motion;
  const [panels, setPanels] = useState<ReadonlySet<string>>(() => new Set());
  const registerPanel = useCallback((v: string) => {
    setPanels((p) => (p.has(v) ? p : new Set(p).add(v)));
    return () => setPanels((p) => { const n = new Set(p); n.delete(v); return n; });
  }, []);
  return (
    <TabsContext.Provider value={{ baseId, value, select, orientation, activation, motion: level, appearance, origin, panels, registerPanel }}>
      <div
        {...rest}
        className={cx('nx-tabs', className)}
        data-orientation={orientation}
        data-nx-appearance={appearance}
        data-nx-density={density ?? defaults.density}
        data-nx-motion={level}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface NexTabsListProps extends HTMLAttributes<HTMLDivElement> {
  /** Nombre del grupo. Obligatorio salvo que se use `aria-labelledby`. */
  'aria-label'?: string;
  /**
   * Qué hacer cuando las pestañas no caben: `scroll` (desplazamiento horizontal,
   * la activa siempre a la vista) o `wrap` (pasan a otra fila; la gota viaja entre filas).
   */
  overflow?: 'scroll' | 'wrap';
}

export function NexTabsList({ overflow = 'scroll', className, children, onKeyDown, onPointerDown, onPointerOver, onPointerLeave, ...rest }: NexTabsListProps) {
  const ctx = useTabs('NexTabs.List');
  const list = useRef<HTMLDivElement>(null);
  const tabs = () => Array.from(list.current?.querySelectorAll<HTMLElement>(':scope > [role="tab"]') ?? []);
  const liquid = useLiquid({
    host: list,
    items: '[role="tab"]',
    active: () => tabs().find((t) => t.getAttribute('aria-selected') === 'true') ?? null,
    orientation: ctx.orientation,
    form: () => (ctx.appearance === 'thread' || ctx.appearance === 'editorial' ? 'thread' : 'drop'),
    motion: ctx.motion,
  });

  useIsoLayoutEffect(() => {
    const from = ctx.origin.current;
    liquid.update(from);
    const active = tabs().find((t) => t.getAttribute('aria-selected') === 'true');
    if (from !== 'program') active?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    // Siempre hay exactamente una pestaña alcanzable con Tab.
    const all = tabs();
    if (!all.some((t) => t.tabIndex === 0)) {
      const first = all.find((t) => t.getAttribute('aria-disabled') !== 'true');
      if (first) first.tabIndex = 0;
    }
  }, [ctx.value, ctx.appearance, liquid.update]);

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const all = tabs();
    const current = all.indexOf(document.activeElement as HTMLElement);
    if (current < 0) return;
    const dir = getComputedStyle(event.currentTarget).direction === 'rtl' ? 'rtl' : 'ltr';
    const next = rovingIndex(event.key, current, all.map((t) => t.getAttribute('aria-disabled') === 'true'), ctx.orientation, dir);
    if (next === null) return;
    event.preventDefault();
    const target = all[next]!;
    all.forEach((t) => (t.tabIndex = t === target ? 0 : -1));
    target.focus();
    if (ctx.activation === 'automatic') ctx.select(target.dataset.value!, 'keyboard');
  };

  return (
    <div
      {...rest}
      ref={list}
      role="tablist"
      aria-orientation={ctx.orientation}
      data-orientation={ctx.orientation}
      data-nx-appearance={ctx.appearance}
      data-nx-overflow={overflow}
      className={cx('nx-tabs__list', className)}
      onKeyDown={onKey}
      onPointerDown={(e) => { ctx.origin.current = 'pointer'; onPointerDown?.(e); }}
      onPointerOver={(e) => {
        const tab = (e.target as Element).closest<HTMLElement>('[role="tab"]');
        if (tab && tab.getAttribute('aria-disabled') !== 'true') liquid.lean(tab);
        onPointerOver?.(e);
      }}
      onPointerLeave={(e) => { liquid.lean(null); onPointerLeave?.(e); }}
    >
      <LiquidDrop svgRef={liquid.svg} pathRef={liquid.path} />
      {children}
    </div>
  );
}

export interface NexTabProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
  icon?: ReactNode;
  /** Contenido al final (contador, insignia). */
  trailing?: ReactNode;
  /** Para la reserva de ancho en negrita cuando `children` no es texto plano. */
  textValue?: string;
  /**
   * Pestaña cerrable (p. ej. archivos abiertos de un editor). El aspa es
   * visible pero NO es un botón anidado (no recibe foco): con el teclado se
   * cierra con Supr sobre la pestaña, y con el ratón también con el clic central.
   * Quien usa la pestaña decide qué pasa después (qué pestaña queda activa).
   */
  onClose?: () => void;
  /** Nombre del aspa (su `title`). Por defecto, «Cerrar <textValue>». */
  closeLabel?: string;
}

export function NexTab({ value, icon, trailing, textValue, onClose, closeLabel, disabled, className, children, onClick, onKeyDown, onAuxClick, ...rest }: NexTabProps) {
  const ctx = useTabs('NexTab');
  const selected = ctx.value === value;
  const label = textValue ?? (typeof children === 'string' ? children : undefined);
  return (
    <button
      {...rest}
      type="button"
      role="tab"
      id={toDomId(ctx.baseId, 'tab', value)}
      aria-controls={ctx.panels.has(value) ? toDomId(ctx.baseId, 'panel', value) : undefined}
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      tabIndex={selected && !disabled ? 0 : -1}
      data-value={value}
      className={cx('nx-tab', className)}
      data-closable={onClose ? '' : undefined}
      onClick={(e) => {
        onClick?.(e);
        if (disabled || e.defaultPrevented) return;
        // detail === 0: activación por teclado (Intro/Espacio) de un botón.
        ctx.select(value, e.detail === 0 ? 'keyboard' : 'pointer');
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (onClose && !disabled && !e.defaultPrevented && e.key === 'Delete') {
          e.preventDefault();
          onClose();
        }
      }}
      onAuxClick={(e) => {
        onAuxClick?.(e);
        if (onClose && !disabled && !e.defaultPrevented && e.button === 1) {
          e.preventDefault();
          onClose();
        }
      }}
    >
      {icon}
      <span className="nx-tab__label" data-label={label}>
        <span>{children}</span>
      </span>
      {trailing}
      {onClose && (
        <span className="nx-tab__close" aria-hidden="true" title={closeLabel ?? `Cerrar ${label ?? value}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) onClose(); }}>
          <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        </span>
      )}
    </button>
  );
}

export interface NexTabsPanelProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  /** Mantener el contenido montado (oculto) al cambiar de pestaña: estado de formularios, iframes, editores. */
  keepMounted?: boolean;
}

export function NexTabsPanel({ value, keepMounted = false, className, children, ...rest }: NexTabsPanelProps) {
  const ctx = useTabs('NexTabs.Panel');
  const preference = useMotionPreference();
  const selected = ctx.value === value;
  const panel = useRef<HTMLDivElement>(null);
  const wasSelected = useRef(selected);
  const { registerPanel } = ctx;
  useIsoLayoutEffect(() => registerPanel(value), [registerPanel, value]);
  useEffect(() => {
    const el = panel.current;
    const entering = selected && !wasSelected.current && ctx.origin.current === 'pointer';
    wasSelected.current = selected;
    if (!el || !entering || !canAnimate(ctx.motion, preference)) return;
    // El panel emerge desde la pestaña que lo abrió.
    const tab = document.getElementById(toDomId(ctx.baseId, 'tab', value));
    if (tab) {
      const t = tab.getBoundingClientRect();
      const p = el.getBoundingClientRect();
      el.style.setProperty('--nx-emerge-x', `${Math.round(t.left + t.width / 2 - p.left)}px`);
    }
    el.dataset.nxEntering = '';
    const done = () => { delete el.dataset.nxEntering; };
    el.addEventListener('animationend', done, { once: true });
    const fallback = setTimeout(done, MOTION.content.duration + 80);
    return () => clearTimeout(fallback);
  }, [selected, ctx.motion, ctx.origin, ctx.baseId, value, preference]);
  return (
    <div
      {...rest}
      ref={panel}
      role="tabpanel"
      data-orientation={ctx.orientation}
      data-nx-appearance={ctx.appearance}
      id={toDomId(ctx.baseId, 'panel', value)}
      aria-labelledby={toDomId(ctx.baseId, 'tab', value)}
      tabIndex={0}
      hidden={!selected}
      className={cx('nx-tabs__panel', className)}
    >
      {selected || keepMounted ? children : null}
    </div>
  );
}

export const NexTabs = Object.assign(TabsRoot, { List: NexTabsList, Tab: NexTab, Panel: NexTabsPanel });
