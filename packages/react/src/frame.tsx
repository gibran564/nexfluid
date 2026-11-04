'use client';

import {
  createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { columnsToFold, cx, toDomId, type NexDensity, type NexMotion, type NexSpace } from '@nexfluid/components';
import { canAnimate, useMotionPreference, useNex } from './provider.tsx';
import { NexIcon } from './icon.tsx';
import { morphSpring, useSprings } from './springs.ts';

/**
 * Regiones de NexFrame: las del contrato de regiones de NexFrame en Nextudio
 * (`FrameRegionName`) más `identity` y `navigation`, que allí pertenecen al
 * marco de la aplicación.
 */
export type NexFrameRegionName = 'identity' | 'heading' | 'actions' | 'tools' | 'filters' | 'navigation' | 'explorer' | 'inspector' | 'bottom';

const REGIONS: readonly NexFrameRegionName[] = ['identity', 'heading', 'actions', 'tools', 'filters', 'navigation', 'explorer', 'inspector', 'bottom'];

interface FrameContextValue {
  targets: Partial<Record<NexFrameRegionName, HTMLElement | null>>;
  claim: (region: NexFrameRegionName) => () => void;
}

const FrameContext = createContext<FrameContextValue | null>(null);
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Acceso al marco desde cualquier descendiente (o `null` fuera de un NexFrame). */
export function useNexFrame(): FrameContextValue | null {
  return useContext(FrameContext);
}

/**
 * Coloca contenido en una región del marco desde cualquier profundidad del
 * lienzo (portal). En el servidor y antes de hidratar se pinta en su sitio,
 * así el HTML inicial siempre es útil. Mismo contrato que `FrameRegion` de Nextudio.
 */
export function NexFrameRegion({ region, children }: { region: NexFrameRegionName; children: ReactNode }) {
  const frame = useNexFrame();
  const target = frame?.targets[region];
  const claim = frame?.claim;
  useIsoLayoutEffect(() => claim?.(region), [claim, region]);
  return target ? createPortal(children, target) : <>{children}</>;
}

export interface NexFrameProps {
  /** Lienzo: el contenido funcional. */
  children?: ReactNode;
  identity?: ReactNode;
  heading?: ReactNode;
  actions?: ReactNode;
  tools?: ReactNode;
  filters?: ReactNode;
  /** Navegación global (columna izquierda, sin membrana). Cajón bajo 1080 px de marco. */
  navigation?: ReactNode;
  /** Explorador (archivos, esquema). Se retrae a un riel. */
  explorer?: ReactNode;
  /** Inspector contextual. Se retrae a un riel; hoja inferior bajo 760 px. */
  inspector?: ReactNode;
  /** Dock inferior (consola, salidas). */
  bottom?: ReactNode;
  /** `floating`: membranas separadas por costuras · `joined`: una sola superficie con costuras finas · `flush`: a sangre. */
  variant?: 'floating' | 'joined' | 'flush';
  /** `split`: todas las regiones abiertas · `focus`: explorador e inspector se retraen a rieles y el lienzo se expande. */
  layout?: 'split' | 'focus';
  density?: NexDensity;
  /**
   * Transiciones espaciales (explorador e inspector que se abren, se retraen o
   * cambian de disposición): las columnas fluyen con física «spatial» y el
   * contenido conserva su ancho mientras la membrana lo descubre. `none`: inmediato.
   */
  motion?: NexMotion;
  height?: 'viewport' | 'fill' | number | string;
  canvasAs?: 'main' | 'div';
  /** Marco dentro de otra página (un panel, una demostración): sin landmarks de nivel superior; lienzo e inspector son regiones. */
  nested?: boolean;
  canvasLabel?: string;
  navigationLabel?: string;
  navigationRole?: 'navigation' | 'complementary';
  explorerLabel?: string;
  inspectorLabel?: string;
  bottomLabel?: string;
  inspectorOpen?: boolean;
  defaultInspectorOpen?: boolean;
  onInspectorOpenChange?: (open: boolean) => void;
  explorerOpen?: boolean;
  defaultExplorerOpen?: boolean;
  onExplorerOpenChange?: (open: boolean) => void;
  /** Botón para mostrar/ocultar el inspector junto a las acciones. */
  inspectorToggle?: boolean;
  /**
   * Quién abre y cierra el inspector. `toolbar` (por defecto): botón junto a las
   * acciones y riel cuando está cerrado. `tab`: una sola pestaña lateral con su
   * nombre, siempre visible; abierto, el panel se despliega junto a ella y la
   * misma pestaña lo recoge. Sin botón en la barra (no hay controles duplicados).
   */
  inspectorControl?: 'toolbar' | 'tab';
  inspectorWidth?: number;
  defaultInspectorWidth?: number;
  onInspectorWidthChange?: (width: number) => void;
  inspectorResizable?: boolean;
  inspectorMinWidth?: number;
  inspectorMaxWidth?: number;
  navigationWidth?: number;
  explorerWidth?: number;
  /**
   * Ancho mínimo útil del lienzo (px). Si explorador e inspector no caben junto
   * a él, el marco cambia de composición en lugar de comprimirlo: primero el
   * inspector pasa a hoja lateral superpuesta y después el explorador a riel.
   */
  canvasMinWidth?: number;
  className?: string;
  style?: CSSProperties;
}

function useOpen(controlled: boolean | undefined, initial: boolean, onChange?: (open: boolean) => void) {
  const [inner, setInner] = useState(initial);
  const open = controlled ?? inner;
  const set = (v: boolean) => {
    if (controlled === undefined) setInner(v);
    onChange?.(v);
  };
  return [open, set, setInner] as const;
}

/**
 * NexFrame: el espacio como sistema. Un campo con zonas cromáticas sobre el
 * que flotan membranas (superior, navegación, explorador, lienzo, inspector,
 * dock). Las regiones vacías no ocupan columna; las cerradas se retraen a un
 * riel desde el que se expanden; el marco se recompone según su propio ancho.
 * No conoce rutas, sesiones ni permisos: sólo coloca.
 */
export function NexFrame({
  children, identity, heading, actions, tools, filters, navigation, explorer, inspector, bottom,
  variant = 'floating', layout = 'split', density, motion, height = 'viewport', canvasAs = 'main', nested = false, canvasLabel = 'Contenido',
  navigationLabel = 'Navegación', navigationRole = 'navigation', explorerLabel = 'Explorador',
  inspectorLabel = 'Inspector', bottomLabel = 'Panel inferior',
  inspectorOpen: inspectorOpenProp, defaultInspectorOpen = layout !== 'focus', onInspectorOpenChange,
  explorerOpen: explorerOpenProp, defaultExplorerOpen = layout !== 'focus', onExplorerOpenChange, inspectorToggle, inspectorControl = 'toolbar',
  inspectorWidth: inspectorWidthProp, defaultInspectorWidth = 300, onInspectorWidthChange,
  inspectorResizable = false, inspectorMinWidth = 220, inspectorMaxWidth = 480, navigationWidth = 248, explorerWidth = 240,
  canvasMinWidth = 420, className, style,
}: NexFrameProps) {
  const defaults = useNex();
  const level = motion ?? defaults.motion;
  const preference = useMotionPreference();
  const id = toDomId('nx-frame', useId());
  const root = useRef<HTMLDivElement>(null);
  const layoutEl = useRef<HTMLDivElement>(null);
  const navToggle = useRef<HTMLButtonElement>(null);
  const inspectorToggleRef = useRef<HTMLButtonElement>(null);

  // Destinos estables para NexFrameRegion.
  const [targets, setTargets] = useState<FrameContextValue['targets']>({});
  const [claims, setClaims] = useState<Partial<Record<NexFrameRegionName, number>>>({});
  const refs = useMemo(
    () => Object.fromEntries(REGIONS.map((r) => [r, (node: HTMLDivElement | null) => setTargets((old) => (old[r] === node ? old : { ...old, [r]: node }))])) as Record<NexFrameRegionName, (n: HTMLDivElement | null) => void>,
    [],
  );
  const claim = useCallback((region: NexFrameRegionName) => {
    setClaims((c) => ({ ...c, [region]: (c[region] ?? 0) + 1 }));
    return () => setClaims((c) => ({ ...c, [region]: Math.max(0, (c[region] ?? 1) - 1) }));
  }, []);
  const context = useMemo(() => ({ targets, claim }), [targets, claim]);

  const [inspectorOpen, setInspectorOpen, setInspectorInner] = useOpen(inspectorOpenProp, defaultInspectorOpen, onInspectorOpenChange);
  const [explorerOpen, setExplorerOpen, setExplorerInner] = useOpen(explorerOpenProp, defaultExplorerOpen, onExplorerOpenChange);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [compact, setCompact] = useState<'wide' | 'medium' | 'narrow'>('wide');
  const [widthState, setWidthState] = useState(defaultInspectorWidth);
  const inspectorWidth = inspectorWidthProp ?? widthState;
  const setInspectorWidth = (w: number) => {
    const clamped = Math.round(Math.min(inspectorMaxWidth, Math.max(inspectorMinWidth, w)));
    if (inspectorWidthProp === undefined) setWidthState(clamped);
    onInspectorWidthChange?.(clamped);
  };

  // Cambiar de disposición retrae o expande las regiones laterales (no controladas).
  const previousLayout = useRef(layout);
  useEffect(() => {
    if (previousLayout.current === layout) return;
    previousLayout.current = layout;
    if (inspectorOpenProp === undefined) setInspectorInner(layout !== 'focus');
    if (explorerOpenProp === undefined) setExplorerInner(layout !== 'focus');
  }, [layout, inspectorOpenProp, explorerOpenProp, setInspectorInner, setExplorerInner]);

  // El marco responde a su propio ancho (igual que sus container queries) y al
  // espacio que de verdad le queda al lienzo: las regiones laterales se pliegan
  // antes de que el lienzo baje de `canvasMinWidth`.
  const [fold, setFold] = useState(0);
  const sizing = useRef({ explorer: false, inspector: false, navigation: false, explorerWidth, inspectorWidth: defaultInspectorWidth, navigationWidth, canvasMinWidth, tab: inspectorControl === 'tab' });
  const measureRef = useRef<() => void>(() => {});
  measureRef.current = () => {
    const el = root.current;
    const grid = layoutEl.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w <= 0) return; // sin medir (servidor, jsdom, marco oculto): se conserva la composición
    const tier = w < 760 ? 'narrow' : w < 1080 ? 'medium' : 'wide';
    setCompact(tier);
    if (tier === 'narrow' || !grid) {
      setFold(0);
      return;
    }
    const cs = getComputedStyle(grid);
    const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const gap = parseFloat(cs.columnGap) || 0;
    const z = sizing.current;
    const nav = z.navigation && tier === 'wide' ? z.navigationWidth + gap : 0;
    const sides = [z.inspector ? z.inspectorWidth + (z.tab ? 44 : 0) : 0, z.explorer ? z.explorerWidth : 0];
    setFold(columnsToFold({ available: w - pad - nav, sides, gap, mainMin: z.canvasMinWidth }));
  };
  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    measureRef.current();
    const observer = new ResizeObserver(() => measureRef.current());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const previousCompact = useRef(compact);
  useEffect(() => {
    // En estrecho el inspector es una hoja y el explorador un riel: empiezan recogidos.
    if (compact === 'narrow' && previousCompact.current !== 'narrow') {
      if (inspectorOpenProp === undefined) setInspectorInner(false);
      if (explorerOpenProp === undefined) setExplorerInner(false);
    }
    if (compact === 'wide') setNavigationOpen(false);
    previousCompact.current = compact;
  }, [compact, inspectorOpenProp, explorerOpenProp, setInspectorInner, setExplorerInner]);

  const filled = (r: NexFrameRegionName, prop: ReactNode) => (prop != null && prop !== false ? true : (claims[r] ?? 0) > 0);
  const has = Object.fromEntries(
    ([['identity', identity], ['heading', heading], ['actions', actions], ['tools', tools], ['filters', filters], ['navigation', navigation], ['explorer', explorer], ['inspector', inspector], ['bottom', bottom]] as const).map(([r, p]) => [r, filled(r, p)]),
  ) as Record<NexFrameRegionName, boolean>;
  const empty = (r: NexFrameRegionName) => (has[r] ? undefined : '');
  sizing.current = { explorer: has.explorer, inspector: has.inspector, navigation: has.navigation, explorerWidth, inspectorWidth, navigationWidth, canvasMinWidth, tab: inspectorControl === 'tab' };
  useIsoLayoutEffect(() => measureRef.current(), [has.explorer, has.inspector, has.navigation, explorerWidth, inspectorWidth, navigationWidth, canvasMinWidth]);
  const inspectorOverlay = compact === 'narrow' || fold >= 1;
  const explorerFolded = compact !== 'narrow' && fold >= 2;
  const space: NexSpace = compact === 'narrow' ? 'constrained' : fold > 0 ? 'compact' : 'expanded';
  // Al plegarse por falta de espacio, las regiones no controladas se recogen; al
  // recuperar el espacio, vuelven a abrirse las que se recogieron solas.
  const autoFolded = useRef({ inspector: false, explorer: false });
  useEffect(() => {
    const auto = autoFolded.current;
    if (inspectorOverlay && compact !== 'narrow' && inspectorOpenProp === undefined && inspectorOpen && !auto.inspector) {
      auto.inspector = true;
      setInspectorInner(false);
    } else if (!inspectorOverlay && auto.inspector) {
      auto.inspector = false;
      if (inspectorOpenProp === undefined && layout !== 'focus') setInspectorInner(true);
    }
    if (explorerFolded && explorerOpenProp === undefined && explorerOpen && !auto.explorer) {
      auto.explorer = true;
      setExplorerInner(false);
    } else if (!explorerFolded && auto.explorer) {
      auto.explorer = false;
      if (explorerOpenProp === undefined && layout !== 'focus' && compact !== 'narrow') setExplorerInner(true);
    }
  }, [inspectorOverlay, explorerFolded]); // eslint-disable-line react-hooks/exhaustive-deps
  const tabControl = inspectorControl === 'tab';
  const showInspectorToggle = has.inspector && !tabControl && (inspectorToggle ?? true);
  const navigationDrawer = compact !== 'wide';

  // Columnas y áreas según las regiones presentes: sin columnas vacías ni costuras dobles.
  const RAIL = 44;
  const explorerTarget = explorerOpen ? explorerWidth : RAIL;
  // Con pestaña, abierto = panel + pestaña: el panel conserva su ancho.
  const inspectorTarget = inspectorOpen ? inspectorWidth + (tabControl ? RAIL : 0) : RAIL;
  const grid = useMemo(() => {
    const names: string[] = [];
    if (has.navigation && !navigationDrawer) names.push('nav');
    if (has.explorer) names.push('explorer');
    names.push('canvas');
    // Con pestaña, la columna existe siempre: en superposición sólo mide la pestaña.
    if (has.inspector && (!inspectorOverlay || tabControl)) names.push('inspector');
    const px = (v: number) => `${Math.round(v * 10) / 10}px`;
    const cols = (ex: number, ins: number) => names.map((n) => (n === 'nav' ? `${navigationWidth}px` : n === 'explorer' ? px(ex) : n === 'inspector' ? px(tabControl && inspectorOverlay ? RAIL : ins) : 'minmax(0, 1fr)')).join(' ');
    const row = (center: string) => names.map((n) => (n === 'canvas' ? center : n)).join(' ');
    const top = names.map((n) => (n === 'nav' ? 'nav' : 'top')).join(' ');
    return { cols, areas: `'${top}' '${row('canvas')}' '${row(has.bottom ? 'bottom' : 'canvas')}'` };
  }, [has.navigation, has.explorer, has.inspector, has.bottom, navigationDrawer, inspectorOverlay, navigationWidth, tabControl]);

  // Transición espacial: los rieles se abren y se cierran como materia, no aparecen.
  // El contenido de la región se queda montado y con su ancho final (no se reescribe
  // el texto en cada fotograma); sólo pasa a riel cuando la columna ya se ha cerrado.
  const [explorerShown, setExplorerShown] = useState(explorerOpen);
  const [inspectorShown, setInspectorShown] = useState(inspectorOpen);
  const tracks = useSprings([explorerTarget, inspectorTarget], ([ex, ins]) => {
    const el = layoutEl.current;
    if (!el) return;
    el.style.setProperty('--nx-frame-cols', grid.cols(ex!, ins!));
    const reveal = (w: number, full: number) => Math.min(1, Math.max(0, (w - RAIL) / Math.max(1, full - RAIL))).toFixed(3);
    el.style.setProperty('--nx-explorer-reveal', reveal(ex!, explorerWidth));
    el.style.setProperty('--nx-inspector-reveal', reveal(ins!, inspectorWidth + (tabControl ? RAIL : 0)));
    if (!tracks.moving) {
      delete el.dataset.nxMorphing;
      setExplorerShown(explorerOpenRef.current);
      setInspectorShown(inspectorOpenRef.current);
    }
  }, 0.5);
  const explorerOpenRef = useRef(explorerOpen);
  explorerOpenRef.current = explorerOpen;
  const inspectorOpenRef = useRef(inspectorOpen);
  inspectorOpenRef.current = inspectorOpen;
  const previousOpen = useRef({ explorer: explorerOpen, inspector: inspectorOpen });
  useIsoLayoutEffect(() => {
    const el = layoutEl.current;
    const toggled = previousOpen.current.explorer !== explorerOpen || previousOpen.current.inspector !== inspectorOpen;
    previousOpen.current = { explorer: explorerOpen, inspector: inspectorOpen };
    const animate = toggled && el && canAnimate(level, preference) && root.current?.dataset.nxInput !== 'keyboard';
    if (explorerOpen) setExplorerShown(true);
    if (inspectorOpen) setInspectorShown(true);
    if (animate) {
      // React acaba de escribir el destino: se repone el estado visual actual antes de pintar.
      const [ex, ins] = tracks.values();
      el.style.setProperty('--nx-frame-cols', grid.cols(ex!, ins!));
      el.dataset.nxMorphing = '';
      tracks.to([explorerTarget, inspectorTarget], [morphSpring('spatial'), morphSpring('spatial')]);
    } else {
      tracks.jump([explorerTarget, inspectorTarget]);
    }
  }, [explorerTarget, inspectorTarget, grid]);

  const closeOverlays = (restore: boolean) => {
    if (navigationOpen) {
      setNavigationOpen(false);
      if (restore) navToggle.current?.focus();
    }
    if (inspectorOverlay && inspectorOpen) {
      setInspectorOpen(false);
      if (restore) inspectorToggleRef.current?.focus();
    }
  };

  useEffect(() => {
    if (navigationOpen) document.getElementById(`${id}-navigation`)?.focus();
  }, [navigationOpen, id]);

  const heightValue = height === 'viewport' ? '100dvh' : height === 'fill' ? '100%' : typeof height === 'number' ? `${height}px` : height;

  // Separador del inspector: arrastre y teclado.
  const drag = useRef<{ x: number; w: number } | null>(null);
  const onSeparatorKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 64 : 16;
    const map: Record<string, number> = { ArrowLeft: inspectorWidth + step, ArrowRight: inspectorWidth - step, Home: inspectorMinWidth, End: inspectorMaxWidth };
    if (e.key in map) {
      e.preventDefault();
      setInspectorWidth(map[e.key]!);
    }
  };
  const onSeparatorDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, w: inspectorWidth };
  };
  const onSeparatorMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current) setInspectorWidth(drag.current.w + (drag.current.x - e.clientX));
  };

  const regionClass = 'nx-membrane nx-frame__region';
  const toggleButton = (props: { region: string; label: string; icon: 'menu' | 'inspector' | 'sidebar'; expanded: boolean; controls: string; onClick: () => void; inline?: boolean }) => (
    <button
      ref={props.region === 'navigation' ? navToggle : props.region === 'inspector' && !props.inline ? inspectorToggleRef : undefined}
      type="button"
      className="nx-surface nx-button nx-frame__toggle"
      data-nx-role="control"
      data-nx-material="clear"
      data-nx-quiet=""
      data-region={props.region}
      data-nx-icon-only=""
      data-nx-density="compact"
      aria-label={props.label}
      title={props.label}
      aria-expanded={props.expanded}
      aria-controls={props.controls}
      onClick={props.onClick}
    >
      <span className="nx-button__label"><NexIcon name={props.icon} /></span>
    </button>
  );

  const CanvasTag = nested ? 'div' : canvasAs;
  const InspectorTag = nested ? 'div' : 'aside';
  return (
    <FrameContext.Provider value={context}>
      <div
        ref={root}
        className={cx('nx-frame', className)}
        style={{ ...style, '--nx-frame-height': heightValue } as CSSProperties}
        data-nx-variant={variant}
        data-nx-layout={layout}
        data-nx-density={density ?? defaults.density}
        data-navigation-open={navigationOpen && navigationDrawer ? '' : undefined}
        data-inspector-open={has.inspector && inspectorOpen ? '' : undefined}
        data-inspector-overlay={inspectorOverlay ? '' : undefined}
        data-inspector-control={has.inspector ? inspectorControl : undefined}
        data-nx-space={space}
        onPointerDownCapture={() => { if (root.current) root.current.dataset.nxInput = 'pointer'; }}
        onKeyDownCapture={(e) => {
          if (root.current) root.current.dataset.nxInput = 'keyboard';
          if (e.key === 'Escape') closeOverlays(true);
        }}
      >
        <div
          ref={layoutEl}
          className="nx-frame__layout"
          style={{
            '--nx-frame-cols': grid.cols(explorerTarget, inspectorTarget), '--nx-frame-areas': grid.areas,
            '--nx-explorer-w': `${explorerWidth}px`, '--nx-inspector-w': `${inspectorWidth}px`,
          } as CSSProperties}
        >
          <div
            ref={refs.navigation}
            id={`${id}-navigation`}
            className={cx(regionClass, 'nx-frame__navigation')}
            data-nx-role="surface"
            role={has.navigation ? navigationRole : undefined}
            aria-label={has.navigation ? navigationLabel : undefined}
            tabIndex={navigationDrawer && navigationOpen ? -1 : undefined}
            data-empty={empty('navigation')}
            data-nexframe-region="navigation"
            onClick={(e) => {
              if (navigationOpen && (e.target as Element).closest('a[href]')) setNavigationOpen(false);
            }}
          >
            {navigation}
          </div>
          <header className={cx(regionClass, 'nx-frame__top')} data-nx-role="surface" data-nx-material="raised">
            <div className="nx-frame__identity-row">
              {has.navigation && toggleButton({ region: 'navigation', label: `Abrir ${navigationLabel.toLowerCase()}`, icon: 'menu', expanded: navigationOpen && navigationDrawer, controls: `${id}-navigation`, onClick: () => setNavigationOpen((v) => !v) })}
              <div ref={refs.identity} className="nx-frame__identity" data-empty={empty('identity')} data-nexframe-region="identity">{identity}</div>
              <div ref={refs.heading} className="nx-frame__heading" data-empty={empty('heading')} data-nexframe-region="heading">{heading}</div>
              <div className="nx-frame__end">
                <div ref={refs.actions} className="nx-frame__actions" data-empty={empty('actions')} data-nexframe-region="actions">{actions}</div>
                {showInspectorToggle && toggleButton({ region: 'inspector', label: inspectorOpen ? `Ocultar ${inspectorLabel.toLowerCase()}` : `Mostrar ${inspectorLabel.toLowerCase()}`, icon: 'inspector', expanded: inspectorOpen, controls: `${id}-inspector`, onClick: () => setInspectorOpen(!inspectorOpen) })}
              </div>
            </div>
            <div className="nx-frame__context-row">
              <div ref={refs.tools} className="nx-frame__tools" data-empty={empty('tools')} data-nexframe-region="tools">{tools}</div>
              <div ref={refs.filters} className="nx-frame__filters" data-empty={empty('filters')} data-nexframe-region="filters">{filters}</div>
            </div>
          </header>
          <div
            id={`${id}-explorer`}
            className={cx(regionClass, 'nx-frame__explorer')}
            data-nx-role="surface"
            role={has.explorer ? 'region' : undefined}
            aria-label={has.explorer ? explorerLabel : undefined}
            data-empty={empty('explorer')}
            data-collapsed={has.explorer && !explorerOpen && !explorerShown ? '' : undefined}
            data-closing={has.explorer && !explorerOpen && explorerShown ? '' : undefined}
            tabIndex={has.explorer && explorerOpen ? 0 : undefined}
            data-nexframe-region="explorer"
          >
            <div className="nx-frame__rail">
              {toggleButton({ region: 'explorer', label: `Mostrar ${explorerLabel.toLowerCase()}`, icon: 'sidebar', expanded: false, controls: `${id}-explorer`, onClick: () => setExplorerOpen(true), inline: true })}
              <span className="nx-frame__rail-label" aria-hidden="true">{explorerLabel}</span>
            </div>
            <div ref={refs.explorer} className="nx-frame__slot">{explorer}</div>
          </div>
          <CanvasTag className={cx(regionClass, 'nx-frame__canvas')} data-nx-role="surface" id={`${id}-canvas`} role={nested ? 'region' : undefined} aria-label={canvasLabel} tabIndex={0} data-nexframe-region="canvas">
            {children}
          </CanvasTag>
          <InspectorTag
            id={`${id}-inspector`}
            role={nested && has.inspector ? 'region' : undefined}
            className={cx(regionClass, 'nx-frame__inspector')}
            data-nx-role="surface"
            data-nx-material="raised"
            aria-label={inspectorLabel}
            data-empty={has.inspector ? undefined : ''}
            data-collapsed={has.inspector && !inspectorOpen && !inspectorShown ? '' : undefined}
            data-closing={has.inspector && !inspectorOpen && inspectorShown ? '' : undefined}
            data-nexframe-region="inspector"
          >
            {tabControl ? (
              <div className="nx-frame__rail" data-tab="">
                <button
                  ref={inspectorToggleRef}
                  type="button"
                  className="nx-frame__tab"
                  aria-expanded={inspectorOpen}
                  aria-controls={`${id}-inspector-panel`}
                  aria-label={`${inspectorOpen ? 'Ocultar' : 'Mostrar'} ${inspectorLabel.toLowerCase()}`}
                  title={`${inspectorOpen ? 'Ocultar' : 'Mostrar'} ${inspectorLabel.toLowerCase()}`}
                  onClick={() => setInspectorOpen(!inspectorOpen)}
                >
                  <NexIcon name="inspector" />
                  <span className="nx-frame__rail-label" aria-hidden="true">{inspectorLabel}</span>
                </button>
              </div>
            ) : (
              <div className="nx-frame__rail">
                {toggleButton({ region: 'inspector', label: `Mostrar ${inspectorLabel.toLowerCase()}`, icon: 'inspector', expanded: false, controls: `${id}-inspector`, onClick: () => setInspectorOpen(true), inline: true })}
                <span className="nx-frame__rail-label" aria-hidden="true">{inspectorLabel}</span>
              </div>
            )}
            {inspectorResizable && !inspectorOverlay && inspectorOpen && (
              <div
                className="nx-frame__separator"
                role="separator"
                tabIndex={0}
                aria-orientation="vertical"
                aria-label={`Redimensionar ${inspectorLabel.toLowerCase()}`}
                aria-controls={`${id}-inspector`}
                aria-valuenow={inspectorWidth}
                aria-valuemin={inspectorMinWidth}
                aria-valuemax={inspectorMaxWidth}
                aria-valuetext={`${inspectorWidth} píxeles`}
                onKeyDown={onSeparatorKey}
                onPointerDown={onSeparatorDown}
                onPointerMove={onSeparatorMove}
                onPointerUp={() => { drag.current = null; }}
                onPointerCancel={() => { drag.current = null; }}
              />
            )}
            <div id={`${id}-inspector-panel`} className="nx-frame__inspector-scroll" inert={!inspectorOpen ? true : undefined}>
              <div ref={refs.inspector} className="nx-frame__slot">{inspector}</div>
            </div>
          </InspectorTag>
          <div ref={refs.bottom} className={cx(regionClass, 'nx-frame__bottom')} data-nx-role="surface" data-nx-material="sunken" role={has.bottom ? 'region' : undefined} aria-label={has.bottom ? bottomLabel : undefined} tabIndex={has.bottom ? 0 : undefined} data-empty={empty('bottom')} data-nexframe-region="bottom">
            {bottom}
          </div>
        </div>
        <button type="button" className="nx-frame__scrim" tabIndex={-1} aria-hidden="true" onClick={() => closeOverlays(false)} />
      </div>
    </FrameContext.Provider>
  );
}

NexFrame.Region = NexFrameRegion;
