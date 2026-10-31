'use client';

/**
 * Campos de formulario: NexInput y NexCheckbox.
 *
 * Son los controles nativos del navegador (`<input>`) con su etiqueta, su
 * descripción y su error cableados (`aria-describedby`, `aria-invalid`): el
 * teclado, el autocompletado, la validación y los lectores de pantalla son los
 * de siempre. La identidad está en la membrana: el foco tiñe el campo desde
 * dentro y la casilla dibuja su marca con un trazo.
 */
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, type InputHTMLAttributes, type ReactNode } from 'react';
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

export const NexInput = forwardRef<HTMLInputElement, NexInputProps>(function NexInput(
  { label, description, error, leading, trailing, density, hideLabel, className, id: idProp, required, disabled, ...rest },
  ref,
) {
  const defaults = useNex();
  const auto = useId();
  const id = idProp ?? `nx-input-${auto.replace(/:/g, '')}`;
  const describedBy = [description ? `${id}-description` : null, error ? `${id}-error` : null, rest['aria-describedby']].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx('nx-field', className)} data-nx-density={density ?? defaults.density} data-invalid={error ? '' : undefined} data-disabled={disabled ? '' : undefined}>
      <label htmlFor={id} className={cx('nx-field__label', hideLabel && 'nx-visually-hidden')}>
        {label}{required && <span className="nx-field__required" aria-hidden="true"> *</span>}
      </label>
      <div className="nx-input">
        {leading && <span className="nx-input__adorn" data-side="leading">{leading}</span>}
        <input
          {...rest}
          ref={ref}
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
