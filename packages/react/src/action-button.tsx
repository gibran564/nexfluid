'use client';

/**
 * NexActionButton: botón → superficie de carga → éxito (o error), guiado por
 * el estado real de la operación.
 *
 * La caja del botón no cambia de tamaño (reserva el ancho del estado más
 * largo: no empuja a sus vecinos); lo que se transforma es la membrana que
 * dibuja y que recorta su contenido. El texto y los iconos nunca se escalan:
 * cada estado es una capa que entra cuando la superficie ya ha cambiado de
 * forma y sale antes de que se encoja.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { morphPath } from '@nexfluid/core';
import { cx, type NexDensity, type NexMotion } from '@nexfluid/components';
import { NexIcon } from './icon.tsx';
import { canAnimate, useMotionPreference, useNex } from './provider.tsx';
import { morphSpring, useSprings } from './springs.ts';

export type NexActionStatus = 'idle' | 'pending' | 'success' | 'error';

export interface NexActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'> {
  /** Etiqueta en reposo. */
  children: ReactNode;
  /** Operación real. Mientras su promesa está pendiente el botón es una superficie de carga. */
  action?: () => unknown;
  /** Estado controlado (si la operación vive fuera). */
  status?: NexActionStatus;
  onStatusChange?: (status: NexActionStatus) => void;
  pendingLabel?: string;
  successLabel?: ReactNode;
  errorLabel?: ReactNode;
  /** ms en éxito o error antes de volver al reposo (no controlado). 0: no vuelve. */
  resetAfter?: number;
  /** `filled` acción principal (por defecto) · `default` membrana elevada. */
  appearance?: 'filled' | 'default';
  icon?: ReactNode;
  density?: NexDensity;
  motion?: NexMotion;
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function NexActionButton({
  children, action, status: controlled, onStatusChange, pendingLabel = 'Procesando', successLabel = 'Hecho', errorLabel = 'No se pudo',
  resetAfter = 1800, appearance = 'filled', icon, density, motion, className, disabled, ...rest
}: NexActionButtonProps) {
  const defaults = useNex();
  const level = motion ?? defaults.motion;
  const preference = useMotionPreference();
  const [inner, setInner] = useState<NexActionStatus>('idle');
  const status = controlled ?? inner;
  const button = useRef<HTMLButtonElement>(null);
  const fill = useRef<SVGPathElement>(null);
  const stack = useRef<HTMLSpanElement>(null);
  const box = useRef({ w: 0, h: 0 });
  const live = useRef(true);
  const changeRef = useRef(onStatusChange);
  changeRef.current = onStatusChange;

  const setStatus = useCallback((s: NexActionStatus) => {
    if (!live.current) return;
    if (controlled === undefined) setInner(s);
    changeRef.current?.(s);
  }, [controlled]);

  // StrictMode monta, desmonta y vuelve a montar: se reactiva en cada montaje.
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; };
  }, []);

  const lastW = useRef(0);

  // Ancho de la superficie según la capa activa; la caja es la del estado más ancho.
  const paint = useCallback((w: number, v: number) => {
    const { w: bw, h } = box.current;
    if (!bw || !h) return;
    const width = Math.max(h, Math.min(bw, w));
    const d = morphPath(
      { rect: { x: (bw - width) / 2, y: 0, width, height: h }, radius: h / 2, velocity: [v * 0.6, 0] },
      { smoothing: 1, deformation: 0.06, tension: 0.6 },
    );
    fill.current?.setAttribute('d', d);
    if (stack.current) stack.current.style.clipPath = `path('${d}')`;
  }, []);
  const springs = useSprings([0], ([w]) => {
    const prev = lastW.current;
    lastW.current = w!;
    paint(w!, (w! - prev) * 60);
  }, 0.3);

  const layerWidth = (s: NexActionStatus) => {
    const layer = button.current?.querySelector<HTMLElement>(`.nx-action__layer[data-layer="${s}"]`);
    if (!layer) return 0;
    const pad = parseFloat(getComputedStyle(button.current!).paddingInline || '0') || 0;
    return layer.scrollWidth + pad * 2;
  };

  const measure = useCallback(() => {
    const b = button.current;
    if (!b) return false;
    box.current = { w: b.offsetWidth, h: b.offsetHeight };
    return box.current.w > 0;
  }, []);

  useIsoLayoutEffect(() => {
    if (!measure()) return;
    const target = layerWidth(status);
    const animate = canAnimate(level, preference) && lastW.current > 0;
    if (animate) springs.to([target], [morphSpring(status === 'pending' ? 'precision' : 'flow')]);
    else springs.jump([target]);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  useIsoLayoutEffect(() => {
    const b = button.current;
    if (!b || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (measure()) springs.jump([layerWidth(status)]);
    });
    ro.observe(b);
    return () => ro.disconnect();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Éxito o error vuelven al reposo (sólo no controlado).
  useEffect(() => {
    if (controlled !== undefined || resetAfter <= 0 || (status !== 'success' && status !== 'error')) return;
    const t = setTimeout(() => setStatus('idle'), resetAfter);
    return () => clearTimeout(t);
  }, [status, controlled, resetAfter, setStatus]);

  const run = async () => {
    if (status === 'pending' || disabled) return;
    if (!action) return;
    setStatus('pending');
    try {
      await action();
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const announce = status === 'pending' ? pendingLabel : status === 'success' ? successLabel : status === 'error' ? errorLabel : '';
  return (
    <>
      <button
        {...rest}
        ref={button}
        type="button"
        className={cx('nx-button nx-action', className)}
        data-nx-role="control"
        data-nx-appearance={appearance}
        data-nx-material={appearance === 'filled' ? 'solid' : 'raised'}
        data-nx-density={density ?? defaults.density}
        data-nx-status={status}
        data-nx-motion={level}
        aria-busy={status === 'pending' || undefined}
        aria-disabled={status === 'pending' || undefined}
        disabled={disabled}
        onClick={() => void run()}
      >
        <svg className="nx-action__shape" aria-hidden="true" focusable="false"><path ref={fill} className="nx-action__fill" /></svg>
        <span ref={stack} className="nx-action__stack">
          {/* La etiqueta de reposo es siempre el nombre accesible; los cambios de estado se anuncian en role=status. */}
          <span className="nx-action__layer" data-layer="idle">{icon}{children}</span>
          <span className="nx-action__layer" data-layer="pending" aria-hidden="true"><span className="nx-action__drops"><span /><span /><span /></span></span>
          <span className="nx-action__layer" data-layer="success" aria-hidden="true"><NexIcon name="check" />{successLabel}</span>
          <span className="nx-action__layer" data-layer="error" aria-hidden="true"><NexIcon name="alert" />{errorLabel}</span>
        </span>
      </button>
      <span className="nx-visually-hidden" role="status">{announce}</span>
    </>
  );
}
