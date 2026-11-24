'use client';

/**
 * NexCombobox: un campo de texto libre con sugerencias.
 *
 * Patrón WAI-ARIA «combobox» con `aria-autocomplete="list"`: el foco se queda
 * SIEMPRE en el `<input>` (se sigue escribiendo mientras la lista está
 * abierta) y la sugerencia activa se anuncia con `aria-activedescendant`. A
 * diferencia de NexSelect, el valor es el texto escrito, no una opción: las
 * sugerencias ayudan a escribirlo, pero se puede escribir cualquier cosa.
 *
 * Las sugerencias las da la aplicación (`options`). Con `filter` (por defecto)
 * se filtran aquí por lo escrito; con `filter={false}` se muestran tal cual,
 * para cuando la aplicación ya las busca (en un servidor, en una base…).
 *
 * La lista se abre al escribir (o con ↓) y se cierra al elegir, al vaciar el campo, con Escape o al salir
 * del campo; elegir NO la vuelve a abrir aunque cambien las sugerencias. La
 * sugerencia activa la marca la misma gota líquida que NexSelect y sigue al
 * puntero.
 *
 * Teclado: ↓/↑ recorren (Alt+↓ abre), Intro elige la activa, Escape cierra (y
 * con la lista ya cerrada se propaga), Tab cierra sin elegir. Las teclas que
 * el combobox no usa llegan a `onKeyDown`: así la aplicación decide qué hace
 * Intro con la lista cerrada (pasar al siguiente campo, enviar…).
 */
import { forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { cx, type NexDensity, type NexMotion } from '@nexfluid/components';
import { useNex } from './provider.tsx';
import { useAnchoredLayer } from './anchored.ts';
import { LiquidDrop, useLiquid } from './liquid.tsx';
import { focusFromMembrane } from './fields.tsx';

export interface NexComboboxOption {
  /** Identidad estable (clave de React). */
  value: string;
  /** Texto que se escribe en el campo al elegir la sugerencia. */
  label: string;
  /** Segunda línea: precio, existencias, ruta… */
  description?: ReactNode;
  /** Imagen o icono delante de la etiqueta. */
  media?: ReactNode;
  disabled?: boolean;
  /** Las sugerencias con el mismo grupo se agrupan bajo su título (en orden de aparición). */
  group?: string;
  /** Texto extra para el filtro (sólo con `filter`). */
  keywords?: string;
}

export interface NexComboboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'size' | 'prefix' | 'onSelect'> {
  /** Etiqueta visible (obligatoria: el nombre accesible no es opcional). */
  label: ReactNode;
  options: readonly NexComboboxOption[];
  /** Texto del campo (controlado). */
  value?: string;
  defaultValue?: string;
  /** Cada cambio del texto: al escribir y al elegir una sugerencia. */
  onValueChange?: (value: string) => void;
  /** Se eligió una sugerencia (Intro, clic). Llega después de `onValueChange`. */
  onOptionSelect?: (option: NexComboboxOption) => void;
  /** Filtrar aquí las sugerencias por lo escrito. `false` si la aplicación ya las filtra. Por defecto, sí. */
  filter?: boolean;
  /** Al aparecer la lista, la primera sugerencia queda activa (Intro la elige). Por defecto, sí. */
  autoHighlight?: boolean;
  /** Mensaje cuando lo escrito no tiene sugerencias. Sin él, la lista se cierra. */
  emptyMessage?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  hideLabel?: boolean;
  density?: NexDensity;
  motion?: NexMotion;
}

const textOf = (o: NexComboboxOption) => [o.label, typeof o.description === 'string' ? o.description : '', o.keywords ?? ''].join(' ');
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export const NexCombobox = forwardRef<HTMLInputElement, NexComboboxProps>(function NexCombobox(
  {
    label, options, value: controlled, defaultValue = '', onValueChange, onOptionSelect, filter = true, autoHighlight = true, emptyMessage,
    description, error, leading, trailing, hideLabel, density, motion, className, id: idProp, required, disabled, onKeyDown, onBlur, ...rest
  },
  ref,
) {
  const defaults = useNex();
  const level = motion ?? defaults.motion;
  const auto = useId().replace(/:/g, '');
  const id = idProp ?? `nx-combobox-${auto}`;
  const listId = `${id}-list`;
  const [inner, setInner] = useState(defaultValue);
  const text = controlled === undefined ? inner : controlled;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const membrane = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => input.current!, []);

  const visible = useMemo(() => {
    const q = norm(text.trim());
    return filter && q ? options.filter((o) => norm(textOf(o)).includes(q)) : options;
  }, [options, text, filter]);
  const enabled = visible.filter((o) => !o.disabled);
  const shown = open && !disabled && (visible.length > 0 || (emptyMessage != null && text.trim() !== ''));
  const optionId = (v: string) => `${id}-opt-${options.findIndex((o) => o.value === v)}`;

  useAnchoredLayer(shown, popup, () => membrane.current, { side: 'bottom', align: 'start', matchWidth: true, revision: visible.length });

  const liquid = useLiquid({
    host: list,
    items: '[role="option"]',
    active: () => list.current?.querySelector<HTMLElement>('[role="option"][data-active]') ?? null,
    orientation: 'vertical',
    form: () => 'drop',
    motion: level,
  });
  useLayoutEffect(() => { if (shown) liquid.update('keyboard'); }, [shown, active, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // La activa siempre es una sugerencia visible; si deja de estarlo, pasa a la primera (o a ninguna).
  useEffect(() => {
    if (active !== null && enabled.some((o) => o.value === active)) return;
    setActive(autoHighlight ? enabled[0]?.value ?? null : null);
  }, [visible, autoHighlight]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (shown && active) document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
  }, [shown, active]); // eslint-disable-line react-hooks/exhaustive-deps

  const setText = (next: string) => {
    if (controlled === undefined) setInner(next);
    onValueChange?.(next);
  };
  const choose = (o: NexComboboxOption) => {
    if (o.disabled) return;
    setOpen(false);
    setText(o.label);
    onOptionSelect?.(o);
  };
  const move = (delta: number) => {
    if (!enabled.length) return;
    const i = enabled.findIndex((o) => o.value === active);
    const next = i < 0 ? (delta > 0 ? 0 : enabled.length - 1) : (i + delta + enabled.length) % enabled.length;
    setActive(enabled[next]!.value);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>): boolean => {
    const k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      if (!shown) {
        if (!visible.length) return false;
        setOpen(true);
        if (k === 'ArrowUp') setActive(enabled.at(-1)?.value ?? null);
        else if (!e.altKey && !autoHighlight) setActive(enabled[0]?.value ?? null);
      } else {
        move(k === 'ArrowDown' ? 1 : -1);
      }
      return true;
    }
    if (!shown) return false;
    if (k === 'Enter') {
      const o = enabled.find((x) => x.value === active);
      if (!o) return false;
      choose(o);
      return true;
    }
    if (k === 'Escape') {
      setOpen(false);
      e.stopPropagation();
      return true;
    }
    if (k === 'Tab') setOpen(false); // cierra sin elegir y deja salir
    return false;
  };

  // Grupos en orden de aparición.
  const groups = useMemo(() => {
    const out: Array<{ name: string | null; items: NexComboboxOption[] }> = [];
    for (const o of visible) {
      const g = o.group ?? null;
      const last = out.at(-1);
      if (last && last.name === g) last.items.push(o);
      else out.push({ name: g, items: [o] });
    }
    return out;
  }, [visible]);

  const renderOption = (o: NexComboboxOption) => (
    <div
      key={o.value}
      id={optionId(o.value)}
      role="option"
      aria-selected={o.value === active}
      aria-disabled={o.disabled || undefined}
      data-active={o.value === active ? '' : undefined}
      className="nx-select__option"
      onPointerDown={(e) => e.preventDefault()}
      onPointerMove={() => { if (!o.disabled && active !== o.value) setActive(o.value); }}
      onClick={() => choose(o)}
    >
      {o.media && <span className="nx-select__media" aria-hidden={typeof o.media === 'string' ? undefined : true}>{o.media}</span>}
      <span className="nx-select__text">
        <span className="nx-select__label">{o.label}</span>
        {o.description && <span className="nx-select__description">{o.description}</span>}
      </span>
    </div>
  );

  const describedBy = [description ? `${id}-description` : null, error ? `${id}-error` : null, rest['aria-describedby']].filter(Boolean).join(' ') || undefined;
  return (
    <div
      className={cx('nx-field nx-combobox', className)}
      data-nx-density={density ?? defaults.density}
      data-nx-motion={level}
      data-open={shown ? '' : undefined}
      data-invalid={error ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
    >
      <label htmlFor={id} className={cx('nx-field__label', hideLabel && 'nx-visually-hidden')}>
        {label}{required && <span className="nx-field__required" aria-hidden="true"> *</span>}
      </label>
      <div ref={membrane} className="nx-input" onMouseDown={(event) => focusFromMembrane(event, input.current)}>
        {leading && <span className="nx-input__adorn" data-side="leading">{leading}</span>}
        <input
          autoComplete="off"
          spellCheck={false}
          {...rest}
          ref={input}
          id={id}
          className="nx-input__control"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={shown}
          aria-controls={shown ? listId : undefined}
          aria-activedescendant={shown && active ? optionId(active) : undefined}
          aria-invalid={error ? true : rest['aria-invalid']}
          aria-describedby={describedBy}
          required={required}
          disabled={disabled}
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(e.target.value.trim() !== ''); }}
          onKeyDown={(e) => {
            if (handleKey(e)) { e.preventDefault(); return; }
            onKeyDown?.(e);
          }}
          onBlur={(e) => { setOpen(false); onBlur?.(e); }}
        />
        {trailing && <span className="nx-input__adorn" data-side="trailing">{trailing}</span>}
      </div>
      {shown && (
        <div ref={popup} className="nx-select__popup nx-combobox__popup" data-placement="bottom" data-nx-density={density ?? defaults.density} onPointerDown={(e) => e.preventDefault()}>
          <div ref={list} id={listId} role="listbox" aria-labelledby={id} className="nx-select__list" tabIndex={-1}>
            <LiquidDrop svgRef={liquid.svg} pathRef={liquid.path} />
            {groups.map((g, i) => (g.name
              ? (
                <div key={`${g.name}-${i}`} role="group" aria-labelledby={`${id}-g${i}`}>
                  <div id={`${id}-g${i}`} className="nx-select__group" role="presentation">{g.name}</div>
                  {g.items.map(renderOption)}
                </div>
              )
              : g.items.map(renderOption)))}
          </div>
          {!visible.length && <p className="nx-select__empty" role="status">{emptyMessage}</p>}
        </div>
      )}
      {description && <p id={`${id}-description`} className="nx-field__description">{description}</p>}
      {error && <p id={`${id}-error`} className="nx-field__error">{error}</p>}
    </div>
  );
});
