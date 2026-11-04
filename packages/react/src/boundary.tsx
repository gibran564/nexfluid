'use client';

/**
 * NexPreviewBoundary: protege una composición frente al espacio que de verdad
 * tiene. Mide su propio ancho (no el de la ventana) y publica un modo
 * (`expanded` · `compact` · `constrained`) por contexto, por atributo
 * (`data-nx-space`) y como contenedor de container queries (`nx-boundary`).
 *
 * No escala ni recorta: el contenido cambia de estructura. Si una demostración
 * necesita más ancho del que hay (`minWidth`), se muestra su `fallback`
 * (otra composición) en lugar de dejar que se superponga.
 */
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cx, DEFAULT_SPACE_THRESHOLDS, resolveSpace, type NexSpace } from '@nexfluid/components';

export interface NexBoundaryState {
  space: NexSpace;
  /** Ancho disponible en px CSS (0 antes de medir, p. ej. en el servidor). */
  width: number;
}

const BoundaryContext = createContext<NexBoundaryState | null>(null);
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Modo del NexPreviewBoundary más cercano (o `null` fuera de uno). */
export function useNexBoundary(): NexBoundaryState | null {
  return useContext(BoundaryContext);
}

export interface NexPreviewBoundaryProps {
  /** Contenido, o una función del modo para cambiar de estructura. */
  children: ReactNode | ((state: NexBoundaryState) => ReactNode);
  /** Por debajo, `compact`. Por defecto 880. */
  compactBelow?: number;
  /** Por debajo, `constrained`. Por defecto 560. */
  constrainedBelow?: number;
  /** Ancho mínimo que necesita el contenido. Por debajo se pinta `fallback` (si existe). */
  minWidth?: number;
  fallback?: ReactNode | ((state: NexBoundaryState) => ReactNode);
  /** Modo antes de medir (servidor, primer render). */
  initialSpace?: NexSpace;
  className?: string;
  style?: CSSProperties;
  /** Nombre accesible si la frontera es una región (demostraciones). */
  'aria-label'?: string;
}

export function NexPreviewBoundary({
  children, compactBelow = DEFAULT_SPACE_THRESHOLDS.compactBelow, constrainedBelow = DEFAULT_SPACE_THRESHOLDS.constrainedBelow,
  minWidth, fallback, initialSpace = 'expanded', className, style, ...rest
}: NexPreviewBoundaryProps) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<NexBoundaryState>({ space: initialSpace, width: 0 });
  useIsoLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      const space = resolveSpace(width, { compactBelow, constrainedBelow });
      setState((old) => (old.space === space && Math.abs(old.width - width) < 1 ? old : { space, width }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [compactBelow, constrainedBelow]);

  const tooNarrow = minWidth !== undefined && state.width > 0 && state.width < minWidth && fallback !== undefined;
  const body = tooNarrow ? fallback : children;
  return (
    <BoundaryContext.Provider value={state}>
      <div
        ref={host}
        className={cx('nx-boundary', className)}
        style={style}
        data-nx-space={state.space}
        data-nx-fallback={tooNarrow ? '' : undefined}
        role={rest['aria-label'] ? 'region' : undefined}
        {...rest}
      >
        {typeof body === 'function' ? body(state) : body}
      </div>
    </BoundaryContext.Provider>
  );
}
