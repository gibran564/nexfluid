'use client';

/**
 * Campos de formulario: NexInput, NexTextarea y NexCheckbox.
 *
 * Son los controles nativos del navegador (`<input>`) con su etiqueta, su
 * descripción y su error cableados (`aria-describedby`, `aria-invalid`): el
 * teclado, el autocompletado, la validación y los lectores de pantalla son los
 * de siempre. La identidad está en la membrana: el foco tiñe el campo desde
 * dentro y la casilla dibuja su marca con un trazo.
 */
import { forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, type InputHTMLAttributes, type MouseEvent as ReactMouseEvent, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cx, type NexDensity } from '@nexfluid/components';
import { useNex } from './provider.tsx';

export interface NexInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  /** Etiqueta visible (obligatoria: el nombre accesible no es opcional). */
  label: ReactNode;
  /** Texto de ayuda bajo el campo. */
  description?: ReactNode;
  /** Mensaje de error: marca el campo como inválido y se anuncia. */
  error?: ReactNode;
  /** Icono o texto delante (p. ej. un icono de búsqueda o «https://»). */
  leading?: ReactNode;
  /** Icono, unidad o acción detrás. */
  trailing?: ReactNode;
  density?: NexDensity;
  /** Etiqueta visualmente oculta (sigue siendo el nombre accesible). */
  hideLabel?: boolean;
}

const INTERACTIVE = 'a[href], button, input, select, textarea, [tabindex], [contenteditable]';

/**
 * Un clic en la membrana, fuera del `<input>`, enfoca el campo: con el cursor al
 * final, o al principio si el clic cae antes del texto. El `<input>` sólo mide
 * su línea; si ocupara toda la cápsula, un clic por encima o por debajo de la
 * línea dejaría el cursor al principio (Chromium y WebKit), y WebKit no deja
 * corregirlo con `line-height`. Los controles dentro de los adornos (un botón
 * de borrar, un enlace) conservan su clic.
 */
export function focusFromMembrane(event: ReactMouseEvent<HTMLDivElement>, input: HTMLInputElement | null) {
  if (!input || input.disabled || event.button !== 0) return;
  const target = event.target as Element;
  if (target === input) return;
  const interactive = target.closest(INTERACTIVE);
  if (interactive && interactive !== event.currentTarget && event.currentTarget.contains(interactive)) return;
  event.preventDefault();
  input.focus();
  const at = event.clientX < input.getBoundingClientRect().left ? 0 : input.value.length;
  try {
    input.setSelectionRange(at, at);
  } catch {
    // `type="number"`, `email`… no admiten selección: basta con el foco.
  }
}

export const NexInput = forwardRef<HTMLInputElement, NexInputProps>(function NexInput(
  { label, description, error, leading, trailing, density, hideLabel, className, id: idProp, required, disabled, ...rest },
  ref,
) {
  const defaults = useNex();
  const auto = useId();
  const input = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => input.current!, []);
  const id = idProp ?? `nx-input-${auto.replace(/:/g, '')}`;
  const describedBy = [description ? `${id}-description` : null, error ? `${id}-error` : null, rest['aria-describedby']].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx('nx-field', className)} data-nx-density={density ?? defaults.density} data-invalid={error ? '' : undefined} data-disabled={disabled ? '' : undefined}>
      <label htmlFor={id} className={cx('nx-field__label', hideLabel && 'nx-visually-hidden')}>
        {label}{required && <span className="nx-field__required" aria-hidden="true"> *</span>}
      </label>
      <div className="nx-input" onMouseDown={(event) => focusFromMembrane(event, input.current)}>
        {leading && <span className="nx-input__adorn" data-side="leading">{leading}</span>}
        <input
          {...rest}
          ref={input}
          id={id}
          className="nx-input__control"
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : rest['aria-invalid']}
          aria-describedby={describedBy}
        />
        {trailing && <span className="nx-input__adorn" data-side="trailing">{trailing}</span>}
      </div>
      {description && <p id={`${id}-description`} className="nx-field__description">{description}</p>}
      {error && <p id={`${id}-error`} className="nx-field__error">{error}</p>}
    </div>
  );
});

export interface NexTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> {
  /** Etiqueta visible (obligatoria: el nombre accesible no es opcional). */
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  /** Etiqueta visualmente oculta (sigue siendo el nombre accesible). */
  hideLabel?: boolean;
  density?: NexDensity;
  /** Altura mínima en líneas. Por defecto 3. */
  minRows?: number;
  /** Crece con el texto hasta `maxRows` líneas y después desplaza. Por defecto 12; `Infinity` sin tope. */
  maxRows?: number;
  /** Fila dentro de la misma membrana, bajo el texto: contadores, adjuntos, enviar. */
  footer?: ReactNode;
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Texto de varias líneas: un `<textarea>` nativo con la misma membrana,
 * etiqueta, ayuda y error que NexInput. Crece con lo escrito entre `minRows` y
 * `maxRows` (sin saltos: se mide antes de pintar) y admite una fila de
 * acciones dentro de la membrana (`footer`), para compositores y respuestas.
 */
export const NexTextarea = forwardRef<HTMLTextAreaElement, NexTextareaProps>(function NexTextarea(
  { label, description, error, hideLabel, density, minRows = 3, maxRows = 12, footer, className, id: idProp, required, disabled, style, ...rest },
  ref,
) {
  const defaults = useNex();
  const auto = useId();
  const id = idProp ?? `nx-textarea-${auto.replace(/:/g, '')}`;
  const area = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => area.current!);
  const describedBy = [description ? `${id}-description` : null, error ? `${id}-error` : null, rest['aria-describedby']].filter(Boolean).join(' ') || undefined;
  const min = Math.max(1, minRows);
  const max = Math.max(min, maxRows);

  // Ajuste a su contenido: la altura se recalcula al escribir y cuando cambia
  // el valor desde fuera (borrar tras enviar). Se lee la altura de línea real.
  const fit = () => {
    const el = area.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const line = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5 || 24;
    const pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    el.style.height = 'auto';
    const wanted = Math.min(Math.max(el.scrollHeight, line * min + pad), Number.isFinite(max) ? line * max + pad : Infinity);
    el.style.height = `${Math.ceil(wanted)}px`;
    el.style.overflowY = el.scrollHeight > wanted + 1 ? 'auto' : 'hidden';
  };
  useIsoLayoutEffect(fit, [rest.value, min, max]);

  return (
    <div className={cx('nx-field', className)} data-nx-density={density ?? defaults.density} data-invalid={error ? '' : undefined} data-disabled={disabled ? '' : undefined}>
      <label htmlFor={id} className={cx('nx-field__label', hideLabel && 'nx-visually-hidden')}>
        {label}{required && <span className="nx-field__required" aria-hidden="true"> *</span>}
      </label>
      <div className="nx-input" data-nx-multiline="">
        <textarea
          {...rest}
          ref={area}
          id={id}
          rows={min}
          className="nx-input__control"
          style={style}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : rest['aria-invalid']}
          aria-describedby={describedBy}
          onInput={(event) => { fit(); rest.onInput?.(event); }}
        />
        {footer && <div className="nx-input__footer">{footer}</div>}
      </div>
      {description && <p id={`${id}-description`} className="nx-field__description">{description}</p>}
      {error && <p id={`${id}-error`} className="nx-field__error">{error}</p>}
    </div>
  );
});

export interface NexCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  /** Estado mixto (p. ej. «seleccionar todo» con parte seleccionada). */
  indeterminate?: boolean;
  density?: NexDensity;
}

/** Casilla nativa (`type="checkbox"`) con marca trazada y estado mixto real (`indeterminate`). */
export const NexCheckbox = forwardRef<HTMLInputElement, NexCheckboxProps>(function NexCheckbox(
  { label, description, error, indeterminate = false, density, className, id: idProp, disabled, ...rest },
  ref,
) {
  const defaults = useNex();
  const auto = useId();
  const id = idProp ?? `nx-check-${auto.replace(/:/g, '')}`;
  const input = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => input.current!);
  // `indeterminate` sólo existe como propiedad del DOM, no como atributo.
  useEffect(() => { if (input.current) input.current.indeterminate = indeterminate; }, [indeterminate]);
  const describedBy = [description ? `${id}-description` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx('nx-checkbox', className)} data-nx-density={density ?? defaults.density} data-invalid={error ? '' : undefined} data-disabled={disabled ? '' : undefined}>
      <span className="nx-checkbox__box">
        <input {...rest} ref={input} id={id} type="checkbox" className="nx-checkbox__control" disabled={disabled} aria-invalid={error ? true : undefined} aria-describedby={describedBy} />
        <svg className="nx-checkbox__mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path className="nx-checkbox__check" d="M3.5 8.4 6.6 11.4 12.6 4.8" pathLength={1} />
          <path className="nx-checkbox__dash" d="M4 8h8" pathLength={1} />
        </svg>
      </span>
      <span className="nx-checkbox__text">
        <label htmlFor={id} className="nx-checkbox__label">{label}</label>
        {description && <span id={`${id}-description`} className="nx-field__description">{description}</span>}
        {error && <span id={`${id}-error`} className="nx-field__error">{error}</span>}
      </span>
    </div>
  );
});
