'use client';

/**
 * NexMorph para React: transformación continua de una superficie en otra.
 *
 *   <NexMorph physics="morph">
 *     <NexMorph.Source><NexCard>…<NexMorph.Trigger>…</NexMorph.Trigger></NexCard></NexMorph.Source>
 *     <NexMorph.Target label="Detalle"><NexMorph.Title>…</NexMorph.Title>…</NexMorph.Target>
 *   </NexMorph>
 *
 * La geometría y la física son de `MorphTransition` (@nexfluid/core). Aquí
 * sólo se mide el DOM y se pinta: el panel destino se coloca una vez en su
 * sitio final (su contenido nunca se reescala ni se recoloca), y en cada
 * fotograma cambian el trazado de la membrana, el recorte del contenido,
 * las transformaciones de los elementos compartidos y dos variables CSS de
 * coreografía (`--nx-morph-in`, `--nx-morph-out`). Sin capturas ni fundidos
 * entre imágenes; sin re-render de React por fotograma.
 */
import {
  createContext, useCallback, useContext, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type HTMLAttributes, type KeyboardEvent, type ReactNode, type Ref, type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import {
  MorphTransition, morphPath, resolveMorphPhysics, type MorphFrame, type MorphPhysics, type MorphPhysicsName,
  type MorphPhysicsOverrides, type MorphTimeline, type Rect,
} from '@nexfluid/core';
import { cx, toDomId, type NexMotion } from '@nexfluid/components';
import { NexIconButton } from './button.tsx';
import { NexIcon } from './icon.tsx';
import { canAnimate, useMotionPreference, useNex } from './provider.tsx';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Control imperativo (herramientas como NexMorph Studio y pruebas). */
export interface NexMorphController {
  open(): void;
  close(): void;
  toggle(): void;
  pause(): void;
  resume(): void;
  /** Coloca la transformación en la fracción p (0–1) de su recorrido actual. Pausa. */
  seek(p: number): void;
  readonly paused: boolean;
  readonly isOpen: boolean;
  /** Último fotograma pintado. */
  frame(): MorphFrame | null;
  timeline(): MorphTimeline | null;
}

interface MorphContextValue {
  open: boolean;
  /** El destino está montado (abriendo, abierto o cerrando). */
  present: boolean;
  setOpen: (open: boolean) => void;
  physics: MorphPhysics;
  motion: NexMotion;
  ids: { target: string; title: string };
  source: RefObject<HTMLElement | null>;
  trigger: RefObject<HTMLElement | null>;
  transition: RefObject<MorphTransition | null>;
  lastFrame: RefObject<MorphFrame | null>;
  onFrame: RefObject<((f: MorphFrame) => void) | undefined>;
  rested: (state: 'open' | 'closed') => void;
  pausedRef: RefObject<boolean>;
  /** El destino lo registra: se llama al empezar a cerrar (vuelve a clonar el origen). */
  closeStart: RefObject<(() => void) | null>;
}

const MorphContext = createContext<MorphContextValue | null>(null);

function useMorph(component: string): MorphContextValue {
  const ctx = useContext(MorphContext);
  if (!ctx) throw new Error(`${component} debe estar dentro de <NexMorph>.`);
  return ctx;
}

/** Estado y acciones del NexMorph más cercano (o `null`). */
export function useNexMorph() {
  const ctx = useContext(MorphContext);
  return useMemo(() => ctx && {
    open: ctx.open,
    present: ctx.present,
    setOpen: ctx.setOpen,
    toggle: () => ctx.setOpen(!ctx.open),
    ids: ctx.ids,
  }, [ctx]);
}

export interface NexMorphProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Familia (`precision`, `flow`, `viscous`, `morph`, `spatial`) o parámetros completos. */
  physics?: MorphPhysicsName | MorphPhysics;
  /** Ajustes sobre la familia (masa, rigidez, sobrepaso, viscosidad, tensión…). */
  physicsOverrides?: MorphPhysicsOverrides;
  /** `none` (o movimiento reducido): cambio inmediato con el mismo resultado final. */
  motion?: NexMotion;
  /** Fotograma a fotograma (instrumentación). No se llama en el render. */
  onFrame?: (frame: MorphFrame) => void;
  onRest?: (state: 'open' | 'closed') => void;
  controller?: Ref<NexMorphController>;
  children?: ReactNode;
}

function MorphRoot({
  open: controlled, defaultOpen = false, onOpenChange, physics = 'morph', physicsOverrides, motion, onFrame, onRest, controller, children,
}: NexMorphProps) {
  const defaults = useNex();
  const [inner, setInner] = useState(defaultOpen);
  const open = controlled ?? inner;
  const [present, setPresent] = useState(open);
  const base = useId();
  const ids = useMemo(() => ({ target: toDomId('nx-morph', base, 'target'), title: toDomId('nx-morph', base, 'title') }), [base]);
  const source = useRef<HTMLElement | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const transition = useRef<MorphTransition | null>(null);
  const lastFrame = useRef<MorphFrame | null>(null);
  const frameRef = useRef(onFrame);
  frameRef.current = onFrame;
  const restRef = useRef(onRest);
  restRef.current = onRest;
  const changeRef = useRef(onOpenChange);
  changeRef.current = onOpenChange;
  const pausedRef = useRef(false);
  const resolved = useMemo(() => resolveMorphPhysics(physics, physicsOverrides), [physics, physicsOverrides]);

  const closeStart = useRef<(() => void) | null>(null);
  const setOpen = useCallback((next: boolean) => {
    // Se recuerda quién abrió para devolverle el foco al terminar de cerrar.
    if (next && typeof document !== 'undefined') trigger.current = document.activeElement as HTMLElement | null;
    if (controlled === undefined) setInner(next);
    changeRef.current?.(next);
  }, [controlled]);

  // Abrir monta el destino (su efecto arranca la transformación); cerrar la invierte.
  useEffect(() => {
    if (open) {
      if (!present) setPresent(true);
      else transition.current?.open();
    } else if (transition.current?.isOpen) {
      closeStart.current?.();
      transition.current.close();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (transition.current) transition.current.physics = resolved;
  }, [resolved]);

  const rested = useCallback((state: 'open' | 'closed') => {
    if (state === 'closed') setPresent(false);
    restRef.current?.(state);
  }, []);

  // Al terminar de cerrar, el origen vuelve a estar visible: el foco regresa al disparador.
  const wasPresent = useRef(present);
  useEffect(() => {
    if (wasPresent.current && !present) {
      const back = trigger.current?.isConnected ? trigger.current : source.current?.querySelector<HTMLElement>(focusables);
      if (back && (document.activeElement === document.body || document.activeElement === null || !document.activeElement.isConnected)) back.focus({ preventScroll: true });
      trigger.current = null;
    }
    wasPresent.current = present;
  }, [present]);

  useImperativeHandle(controller, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!(transition.current?.isOpen ?? open)),
    pause: () => { pausedRef.current = true; transition.current?.pause(); },
    resume: () => { pausedRef.current = false; transition.current?.resume(); },
    seek: (p) => { pausedRef.current = true; transition.current?.seek(p); },
    get paused() { return pausedRef.current; },
    get isOpen() { return transition.current?.isOpen ?? open; },
    frame: () => lastFrame.current,
    timeline: () => transition.current?.timeline() ?? null,
  }), [open, setOpen]);

  const value: MorphContextValue = {
    open, present, setOpen, physics: resolved, motion: motion ?? defaults.motion, ids, source, trigger, transition,
    lastFrame, onFrame: frameRef, rested, pausedRef, closeStart,
  };
  return <MorphContext.Provider value={value}>{children}</MorphContext.Provider>;
}

/**
 * Registra un elemento existente como origen (lo usan NexCard y NexDock;
 * `NexMorph.Source` es la forma declarativa). Devuelve el `ref` y los
 * atributos que lo ocultan mientras la transformación ocupa su lugar.
 */
export function useNexMorphSource<T extends HTMLElement = HTMLElement>(options: { hide?: boolean } = {}) {
  const ctx = useContext(MorphContext);
  const ref = useCallback((node: T | null) => {
    if (ctx) ctx.source.current = node;
  }, [ctx]);
  const hide = options.hide ?? true;
  return {
    ref,
    props: {
      'data-nx-morph-source': '',
      'data-nx-morph-hidden': ctx?.present && hide ? '' : undefined,
      'aria-hidden': ctx?.present && hide ? true : undefined,
      inert: ctx?.present && hide ? true : undefined,
    } as Record<string, unknown>,
  };
}

export interface NexMorphSourceProps extends HTMLAttributes<HTMLDivElement> {
  /** Ocultar el origen mientras está transformado (por defecto). `false` para controles que permanecen (dock). */
  hide?: boolean;
}

/** Envuelve el origen. La caja de este elemento es la geometría de partida. */
function MorphSource({ hide, className, children, ...rest }: NexMorphSourceProps) {
  const src = useNexMorphSource<HTMLDivElement>({ hide });
  return <div {...rest} {...src.props} ref={src.ref} className={cx('nx-morph-source', className)}>{children}</div>;
}

/** Botón que abre o cierra la transformación (aria-expanded y aria-controls incluidos). */
function MorphTrigger({ className, onClick, children, ...rest }: HTMLAttributes<HTMLButtonElement>) {
  const ctx = useMorph('NexMorph.Trigger');
  return (
    <button
      {...rest}
      type="button"
      className={cx('nx-morph-trigger', className)}
      aria-expanded={ctx.open}
      aria-controls={ctx.present ? ctx.ids.target : undefined}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) ctx.setOpen(!ctx.open);
      }}
    >
      {children}
    </button>
  );
}

/** Título del destino: nombra el diálogo/región y continúa al título del origen (elemento compartido «title»). */
function MorphTitle({ as: Tag = 'h2', className, ...rest }: HTMLAttributes<HTMLHeadingElement> & { as?: 'h2' | 'h3' | 'p' }) {
  const ctx = useMorph('NexMorph.Title');
  return <Tag {...rest} id={ctx.ids.title} data-nx-morph-shared="title" className={cx('nx-morph__title', className)} />;
}

function MorphClose({ label = 'Cerrar' }: { label?: string }) {
  const ctx = useMorph('NexMorph.Close');
  return <NexIconButton label={label} icon={<NexIcon name="close" />} onClick={() => ctx.setOpen(false)} data-nx-autofocus="" />;
}

export interface NexMorphTargetProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /**
   * `viewport` (por defecto): panel centrado sobre la página, modal.
   * Un elemento: el panel ocupa ese contenedor (posicionado) y no es modal.
   */
  container?: 'viewport' | RefObject<HTMLElement | null>;
  /** Nombre accesible si no hay `NexMorph.Title`. */
  label?: string;
  /** Por defecto: modal en `viewport`, región en un contenedor. */
  modal?: boolean;
  /** Radio final; por defecto el de la familia `morph` del tema. */
  radius?: number;
  material?: 'base' | 'raised' | 'sunken';
  /** Posición y tamaño del panel dentro de su contenedor (por defecto lo ocupa entero). */
  panelStyle?: CSSProperties;
  children?: ReactNode;
}

const focusables = 'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

function readRadius(el: Element, fallback: number) {
  const v = parseFloat(getComputedStyle(el).getPropertyValue('--nx-r'));
  return Number.isFinite(v) ? v : fallback;
}

/** Marca el contenido que entra coreografiado: todo salvo los elementos compartidos y sus ancestros. */
function markIncoming(root: Element) {
  let index = 0;
  const walk = (el: Element, depth: number) => {
    for (const child of Array.from(el.children)) {
      if (child.hasAttribute('data-nx-morph-shared')) continue;
      if (depth < 5 && child.querySelector('[data-nx-morph-shared]')) {
        // Lleva un elemento compartido: no se desvanece, pero su material llega con el contenido.
        child.setAttribute('data-nx-morph-carrier', '');
        walk(child, depth + 1);
      }
      else {
        child.setAttribute('data-nx-morph-in', '');
        (child as HTMLElement).style.setProperty('--nx-morph-i', String(Math.min(index++, 6)));
      }
    }
  };
  walk(root, 0);
}

/** El destino: el panel en su lugar final, que nace con la geometría del origen. Sólo existe mientras está presente. */
function MorphTarget(props: NexMorphTargetProps) {
  const ctx = useMorph('NexMorph.Target');
  return ctx.present ? <MorphTargetPanel {...props} /> : null;
}

function MorphTargetPanel({ container = 'viewport', label, modal, radius, material = 'raised', panelStyle, className, children, style, onKeyDown, ...rest }: NexMorphTargetProps) {
  const ctx = useMorph('NexMorph.Target');
  const preference = useMotionPreference();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const clip = useRef<HTMLDivElement>(null);
  const fill = useRef<SVGPathElement>(null);
  const edge = useRef<SVGPathElement>(null);
  const outgoing = useRef<HTMLDivElement>(null);
  const viewport = container === 'viewport';
  const isModal = modal ?? viewport;
  const [hasTitle, setHasTitle] = useState(false);
  const reduced = useRef(false);
  reduced.current = !canAnimate(ctx.motion, preference);

  useIsoLayoutEffect(() => {
    setHost(viewport ? document.body : (container as RefObject<HTMLElement | null>).current);
  }, [container, viewport]);

  useIsoLayoutEffect(() => {
    const r = root.current;
    const p = panel.current;
    const src = ctx.source.current;
    if (!host || !r || !p || !clip.current) return;
    setHasTitle(p.contains(document.getElementById(ctx.ids.title)));
    markIncoming(clip.current.querySelector('.nx-morph__content')!);

    // Datos estables durante la transformación (se rehacen si cambia el tamaño).
    const srcRadius = src ? readRadius(src, 20) : 20;
    const dstRadius = radius ?? readRadius(p, 24);
    const srcFill = src ? getComputedStyle(src).getPropertyValue('--nx-fill').trim() : '';
    const dstFill = getComputedStyle(p).getPropertyValue('--nx-fill').trim();
    // Todo se mide en coordenadas del panel sin escalar: funciona aunque un ancestro esté transformado.
    const local = (b: DOMRect): Rect => {
      const pr = p.getBoundingClientRect();
      const k = pr.width / (p.offsetWidth || 1) || 1;
      return { x: (b.left - pr.left) / k, y: (b.top - pr.top) / k, width: b.width / k, height: b.height / k };
    };
    // Caja de un elemento del panel sin su transformación: offsets (no les afectan las
    // transformaciones y no fuerzan layout si nada lo ha invalidado). Se leen en cada fotograma,
    // así el contenido puede terminar de maquetarse durante la transformación.
    const offsetBox = (el: HTMLElement): Rect => {
      let x = 0;
      let y = 0;
      let n: HTMLElement | null = el;
      while (n && n !== p) {
        x += n.offsetLeft;
        y += n.offsetTop;
        n = n.offsetParent as HTMLElement | null;
      }
      return { x, y, width: el.offsetWidth, height: el.offsetHeight };
    };
    let shared: HTMLElement[] = [];
    const measureShared = () => {
      shared = Array.from(p.querySelectorAll<HTMLElement>('.nx-morph__content [data-nx-morph-shared]'));
    };
    measureShared();

    let cloneSize = { width: 0, height: 0 };
    const cloneSource = () => {
      const out = outgoing.current;
      if (!out || !src) return;
      const copy = src.cloneNode(true) as HTMLElement;
      copy.removeAttribute('id');
      copy.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      copy.removeAttribute('data-nx-morph-hidden');
      copy.removeAttribute('style');
      cloneSize = { width: src.offsetWidth, height: src.offsetHeight };
      Object.assign(copy.style, { width: `${cloneSize.width}px`, height: `${cloneSize.height}px`, margin: '0' });
      out.replaceChildren(copy);
    };
    cloneSource();

    const paint = (f: MorphFrame) => {
      ctx.lastFrame.current = f;
      const physics = ctx.transition.current?.physics ?? ctx.physics;
      const d = morphPath(f, { smoothing: 0.9, deformation: physics.deformation, tension: physics.tension });
      fill.current?.setAttribute('d', d);
      edge.current?.setAttribute('d', d);
      const settledOpen = f.state === 'open';
      clip.current!.style.clipPath = `path('${d}')`;
      const p01 = Math.min(1, Math.max(0, f.contour));
      if (srcFill && dstFill && fill.current) fill.current.style.fill = p01 >= 1 ? '' : `color-mix(in oklab, ${srcFill} ${Math.round((1 - p01) * 100)}%, ${dstFill})`;
      r.style.setProperty('--nx-morph-in', f.incoming.toFixed(3));
      r.style.setProperty('--nx-morph-out', f.outgoing.toFixed(3));
      r.style.setProperty('--nx-morph-p', Math.min(1, Math.max(0, f.size)).toFixed(3));
      r.dataset.nxMorphState = f.state;
      // Contenido saliente: viaja con el centro de la superficie, sin reescalarse.
      if (outgoing.current) {
        const ox = f.rect.x + f.rect.width / 2 - cloneSize.width / 2;
        const oy = f.rect.y + f.rect.height / 2 - cloneSize.height / 2;
        outgoing.current.style.transform = `translate(${ox.toFixed(2)}px, ${oy.toFixed(2)}px)`;
        outgoing.current.style.opacity = f.outgoing.toFixed(3);
        outgoing.current.style.visibility = f.outgoing <= 0.001 ? 'hidden' : '';
      }
      // Elementos compartidos: del sitio del origen al suyo, con escala uniforme (el texto no se estira).
      for (const el of shared) {
        const from = src?.querySelector<HTMLElement>(`[data-nx-morph-shared="${el.dataset.nxMorphShared}"]`);
        const t = Math.min(1, Math.max(0, f.position));
        // Sin pareja en el origen (p. ej. un botón del dock): entra como el resto del contenido.
        el.style.opacity = from || settledOpen ? '' : f.incoming.toFixed(3);
        if (!from || settledOpen) {
          el.style.transform = '';
          continue;
        }
        const to = offsetBox(el);
        const fr = local(from.getBoundingClientRect());
        // Escala uniforme por la altura de la primera línea (no por la caja, que puede ser un bloque ancho).
        const k = (fr.height / Math.max(1, to.height)) * (1 - t) + t;
        const dx = (fr.x - to.x) * (1 - t);
        const dy = (fr.y - to.y) * (1 - t);
        el.style.transformOrigin = '0 0';
        el.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${k.toFixed(4)})`;
      }
      ctx.onFrame.current?.(f);
    };

    const panelRect = (): Rect => ({ x: 0, y: 0, width: p.offsetWidth, height: p.offsetHeight });
    const t = new MorphTransition({
      physics: ctx.physics,
      from: () => {
        const s = ctx.source.current;
        return s ? { rect: local(s.getBoundingClientRect()), radius: srcRadius } : { rect: panelRect(), radius: dstRadius };
      },
      to: () => ({ rect: panelRect(), radius: dstRadius }),
      onFrame: paint,
      onRest: (state) => {
        if (state === 'open') measureShared();
        ctx.rested(state);
      },
      reduced: () => reduced.current,
    });
    ctx.transition.current = t;
    paint(t.frame());
    if (ctx.pausedRef.current) t.pause();
    t.go(ctx.open ? 1 : 0);
    // Foco al panel (sin desplazar la página): botón marcado o el propio panel.
    (p.querySelector<HTMLElement>('[data-nx-autofocus]') ?? p).focus({ preventScroll: true });

    // El origen puede cambiar mientras está abierto: se vuelve a clonar al empezar a cerrar.
    ctx.closeStart.current = cloneSource;
    const onResize = () => {
      measureShared();
      paint(t.frame());
    };
    addEventListener('resize', onResize);
    return () => {
      if (ctx.closeStart.current === cloneSource) ctx.closeStart.current = null;
      removeEventListener('resize', onResize);
      t.dispose();
      if (ctx.transition.current === t) ctx.transition.current = null;
    };
  }, [host]); // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      ctx.setOpen(false);
    }
    if (isModal && e.key === 'Tab') {
      const list = Array.from(panel.current?.querySelectorAll<HTMLElement>(focusables) ?? []).filter((n) => !n.closest('[data-nx-morph-outgoing]'));
      if (list.length === 0) return;
      const first = list[0]!;
      const last = list[list.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  if (!host) return null;
  return createPortal(
    <div
      ref={root}
      className={cx('nx-morph', viewport && 'nx-root', className)}
      data-nx-morph-mode={viewport ? 'viewport' : 'inline'}
      data-nx-morph-state="opening"
      style={style}
      onKeyDown={onKey}
    >
      {viewport && <button type="button" className="nx-morph__scrim" tabIndex={-1} aria-hidden="true" onClick={() => ctx.setOpen(false)} />}
      <div
        {...rest}
        ref={panel}
        id={ctx.ids.target}
        className="nx-morph__panel nx-surface"
        style={panelStyle}
        data-nx-material={material}
        data-nx-shape="morph"
        role={isModal ? 'dialog' : 'region'}
        aria-modal={isModal || undefined}
        aria-labelledby={hasTitle ? ctx.ids.title : undefined}
        aria-label={hasTitle ? undefined : label}
        tabIndex={-1}
      >
        <svg className="nx-morph__shape" aria-hidden="true" focusable="false">
          <path ref={fill} className="nx-morph__fill" />
          <path ref={edge} className="nx-morph__edge" />
        </svg>
        <div ref={clip} className="nx-morph__clip">
          <div ref={outgoing} className="nx-morph__outgoing" aria-hidden="true" inert data-nx-morph-outgoing="" />
          <div className="nx-morph__content">{children}</div>
        </div>
      </div>
    </div>,
    host,
  );
}

/** Contenido coreografiado explícito (si no se marca, se infiere). */
function MorphIncoming({ className, order, style, ...rest }: HTMLAttributes<HTMLDivElement> & { order?: number }) {
  return <div {...rest} data-nx-morph-in="" className={className} style={{ ...style, ...(order === undefined ? null : { '--nx-morph-i': order }) } as CSSProperties} />;
}

/** Marca un elemento como compartido entre origen y destino (mismo `id` en ambos). */
function MorphShared({ id, children }: { id: string; children: ReactNode }) {
  return <div data-nx-morph-shared={id} className="nx-morph-shared">{children}</div>;
}

export const NexMorph = Object.assign(MorphRoot, {
  Source: MorphSource,
  Target: MorphTarget,
  Trigger: MorphTrigger,
  Title: MorphTitle,
  Close: MorphClose,
  Incoming: MorphIncoming,
  Shared: MorphShared,
});
export {
  MorphSource as NexMorphSource, MorphTarget as NexMorphTarget, MorphTrigger as NexMorphTrigger, MorphTitle as NexMorphTitle,
  MorphClose as NexMorphClose, MorphIncoming as NexMorphIncoming, MorphShared as NexMorphShared,
};
