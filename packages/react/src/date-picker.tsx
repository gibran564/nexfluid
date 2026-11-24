'use client';

/**
 * NexDatePicker: elegir un día en un calendario.
 *
 * El disparador es el mismo campo que NexSelect; el calendario sube a la capa
 * superior (Popover API) junto a él. Patrón WAI-ARIA «date picker dialog»: al
 * abrir, el foco entra a la rejilla de días (un solo día enfocable a la vez) y
 * vuelve al disparador al cerrar.
 *
 * Las fechas son texto `AAAA-MM-DD` en la hora local (sin zonas horarias), el
 * formato de `<input type="date">` y de SQLite.
 *
 * Teclado en la rejilla: ←/→ un día, ↑/↓ una semana, Inicio/Fin inicio y fin
 * de la semana, RePág/AvPág un mes (con Mayús, un año), Intro o Espacio
 * eligen y Escape cierra sin cambiar.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cx, type NexDensity, type NexMotion } from '@nexfluid/components';
import { useNex } from './provider.tsx';
import { useAnchoredLayer } from './anchored.ts';
import { NexIcon } from './icon.tsx';

export interface NexDatePickerProps {
  /** Día elegido, `AAAA-MM-DD`. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  /** Etiqueta visible (obligatoria). */
  label: ReactNode;
  hideLabel?: boolean;
  placeholder?: string;
  description?: ReactNode;
  error?: ReactNode;
  /** Primer y último día que se pueden elegir (`AAAA-MM-DD`, incluidos). */
  min?: string;
  max?: string;
  /** Días que no se pueden elegir (además de los que quedan fuera de `min`/`max`). */
  isDateDisabled?: (date: string) => boolean;
  /** Días señalados con un punto (p. ej. los que tienen datos). No cambia si se pueden elegir. */
  isDateMarked?: (date: string) => boolean;
  /** Idioma de los nombres de mes y día. Por defecto, el del documento. */
  locale?: string;
  /** Primer día de la semana: 0 domingo, 1 lunes (por defecto)… */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Cómo se muestra la fecha elegida en el disparador. */
  format?: Intl.DateTimeFormatOptions;
  /** Botón «Hoy» al pie del calendario (si hoy se puede elegir). */
  showToday?: boolean;
  todayLabel?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  density?: NexDensity;
  motion?: NexMotion;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
/** `Date` local → `AAAA-MM-DD`. */
export const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** `AAAA-MM-DD` → `Date` local a mediodía (los cambios de horario nunca lo mueven de día). */
export const fromIsoDate = (s: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
/** Suma meses sin saltarse uno: el 31 de enero + 1 mes es el 28/29 de febrero. */
const addMonths = (d: Date, n: number) => {
  const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0, 12).getDate();
  return new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), last), 12);
};

export function NexDatePicker({
  value: controlled, defaultValue = null, onValueChange, label, hideLabel, placeholder = 'Elige un día', description, error, min, max,
  isDateDisabled, isDateMarked, locale, weekStartsOn = 1, format = { dateStyle: 'long' }, showToday = true, todayLabel = 'Hoy',
  name, required, disabled, density, motion, className,
}: NexDatePickerProps) {
  const defaults = useNex();
  const base = `nx-date-${useId().replace(/:/g, '')}`;
  const [inner, setInner] = useState<string | null>(defaultValue);
  const value = controlled === undefined ? inner : controlled;
  const [open, setOpen] = useState(false);
  // El día enfocado en la rejilla; su mes es el que se muestra.
  const [focused, setFocused] = useState<Date>(() => fromIsoDate(value ?? '') ?? new Date());
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  useAnchoredLayer(open, popup, () => trigger.current, { side: 'bottom', align: 'start' });

  const lang = locale ?? (typeof document !== 'undefined' ? document.documentElement.lang || undefined : undefined);
  const today = toIsoDate(new Date());
  const selectable = (iso: string) => !(min && iso < min) && !(max && iso > max) && !isDateDisabled?.(iso);

  const fmt = useMemo(() => ({
    value: new Intl.DateTimeFormat(lang, format),
    month: new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }),
    weekday: new Intl.DateTimeFormat(lang, { weekday: 'short' }),
    weekdayLong: new Intl.DateTimeFormat(lang, { weekday: 'long' }),
    day: new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  }), [lang, JSON.stringify(format)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seis semanas siempre (el calendario no cambia de alto entre meses).
  const days = useMemo(() => {
    const first = new Date(focused.getFullYear(), focused.getMonth(), 1, 12);
    const start = addDays(first, -((first.getDay() - weekStartsOn + 7) % 7));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [focused.getFullYear(), focused.getMonth(), weekStartsOn]); // eslint-disable-line react-hooks/exhaustive-deps
  const weekdays = days.slice(0, 7);

  const choose = (iso: string) => {
    if (!selectable(iso)) return;
    if (controlled === undefined) setInner(iso);
    if (iso !== value) onValueChange?.(iso);
    close();
  };
  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) trigger.current?.focus();
  };
  const openCalendar = () => {
    if (disabled) return;
    setFocused(fromIsoDate(value ?? '') ?? fromIsoDate(max && today > max ? max : today) ?? new Date());
    setOpen(true);
  };

  // Al abrir y al moverse, el foco va al día enfocado.
  const focusedIso = toIsoDate(focused);
  useLayoutEffect(() => {
    if (open) grid.current?.querySelector<HTMLElement>(`[data-date="${focusedIso}"]`)?.focus({ preventScroll: true });
  }, [open, focusedIso]);
  // Un clic fuera cierra (sin robar el foco a donde se hizo clic).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) close(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const onGridKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const k = e.key;
    const weekday = (focused.getDay() - weekStartsOn + 7) % 7;
    const next =
      k === 'ArrowLeft' ? addDays(focused, -1)
      : k === 'ArrowRight' ? addDays(focused, 1)
      : k === 'ArrowUp' ? addDays(focused, -7)
      : k === 'ArrowDown' ? addDays(focused, 7)
      : k === 'Home' ? addDays(focused, -weekday)
      : k === 'End' ? addDays(focused, 6 - weekday)
      : k === 'PageUp' ? addMonths(focused, e.shiftKey ? -12 : -1)
      : k === 'PageDown' ? addMonths(focused, e.shiftKey ? 12 : 1)
      : null;
    if (next) { e.preventDefault(); setFocused(next); return; }
    if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(focusedIso); return; }
    if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  };

  const selected = value ? fromIsoDate(value) : null;
  const describedBy = [description ? `${base}-description` : null, error ? `${base}-error` : null].filter(Boolean).join(' ') || undefined;
  const weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7));
  return (
    <div
      ref={root}
      className={cx('nx-field nx-select nx-date', className)}
      data-nx-density={density ?? defaults.density}
      data-nx-motion={motion ?? defaults.motion}
      data-open={open ? '' : undefined}
      data-invalid={error ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
    >
      <span id={`${base}-label`} className={cx('nx-field__label', hideLabel && 'nx-visually-hidden')} onClick={() => trigger.current?.focus()}>
        {label}{required && <span className="nx-field__required" aria-hidden="true"> *</span>}
      </span>
      <button
        ref={trigger}
        type="button"
        className="nx-select__trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${base}-dialog` : undefined}
        aria-labelledby={`${base}-label ${base}-value`}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openCalendar())}
        onKeyDown={(e) => { if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); openCalendar(); } }}
      >
        <span id={`${base}-value`} className="nx-select__value" data-placeholder={selected ? undefined : ''}>
          <span className="nx-select__text"><span className="nx-select__label">{selected ? fmt.value.format(selected) : placeholder}</span></span>
        </span>
        <span className="nx-select__chevron" aria-hidden="true"><NexIcon name="chevron-down" /></span>
      </button>
      {open && (
        <div ref={popup} id={`${base}-dialog`} className="nx-select__popup nx-date__popup" role="dialog" aria-modal="false" aria-labelledby={`${base}-month`} data-nx-density={density ?? defaults.density}>
          <div className="nx-date__head">
            <button type="button" className="nx-date__nav" aria-label="Mes anterior" onClick={() => setFocused(addMonths(focused, -1))}>
              <NexIcon name="arrow-left" />
            </button>
            <span id={`${base}-month`} className="nx-date__month" aria-live="polite">{fmt.month.format(focused)}</span>
            <button type="button" className="nx-date__nav" aria-label="Mes siguiente" onClick={() => setFocused(addMonths(focused, 1))}>
              <NexIcon name="arrow-right" />
            </button>
          </div>
          <div ref={grid} role="grid" className="nx-date__grid" aria-labelledby={`${base}-month`} onKeyDown={onGridKeyDown}>
            <div role="row" className="nx-date__row">
              {weekdays.map((d) => (
                <span key={d.getDay()} role="columnheader" className="nx-date__weekday" aria-label={fmt.weekdayLong.format(d)}>
                  {fmt.weekday.format(d).replace('.', '')}
                </span>
              ))}
            </div>
            {weeks.map((week, w) => (
              <div key={w} role="row" className="nx-date__row">
                {week.map((d) => {
                  const iso = toIsoDate(d);
                  const can = selectable(iso);
                  return (
                    <span key={iso} role="gridcell" aria-selected={iso === value}>
                      <button
                        type="button"
                        className="nx-date__day"
                        data-date={iso}
                        data-outside={d.getMonth() !== focused.getMonth() ? '' : undefined}
                        data-today={iso === today ? '' : undefined}
                        data-selected={iso === value ? '' : undefined}
                        data-marked={isDateMarked?.(iso) ? '' : undefined}
                        tabIndex={iso === focusedIso ? 0 : -1}
                        aria-label={fmt.day.format(d)}
                        aria-disabled={!can || undefined}
                        aria-current={iso === today ? 'date' : undefined}
                        onClick={() => { setFocused(d); choose(iso); }}
                      >
                        {d.getDate()}
                      </button>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          {showToday && selectable(today) && (
            <button type="button" className="nx-date__today" onClick={() => choose(today)}>{todayLabel}</button>
          )}
        </div>
      )}
      {name && <input type="hidden" name={name} value={value ?? ''} />}
      {description && <p id={`${base}-description`} className="nx-field__description">{description}</p>}
      {error && <p id={`${base}-error`} className="nx-field__error">{error}</p>}
    </div>
  );
}
