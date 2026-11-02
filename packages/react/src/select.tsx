'use client';

/**
 * NexSelect: elegir una opción de una lista, con opciones ricas.
 *
 * Patrón WAI-ARIA «combobox + listbox»: el disparador es un `combobox` que
 * conserva el foco y señala la opción activa con `aria-activedescendant`; con
 * `searchable`, el foco pasa a un campo de búsqueda que filtra la lista. Cada
 * opción puede llevar una línea de detalle («Ejecución local · Pyodide») y una
 * imagen o icono (`media`, p. ej. el logotipo de un motor). La opción activa
 * la marca la misma gota líquida que NexTabs y NexSegmented.
 *
 * Teclado: ↑/↓ abren y recorren, Inicio/Fin, Intro o Espacio eligen, Tab
 * elige y sale, Escape cierra sin cambiar, y escribir salta a la opción que
 * empieza así (sin búsqueda) o filtra (con búsqueda).
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cx, type NexDensity, type NexMotion } from '@eclipsis/components';
import { useNex } from './provider.tsx';
import { useAnchoredLayer } from './anchored.ts';
import { NexIcon } from './icon.tsx';
import { LiquidDrop, useLiquid } from './liquid.tsx';

export interface NexSelectOption {
  value: string;
  label: string;
  /** Segunda línea: estado, motor, ruta… Admite nodos (p. ej. un logotipo). */
  description?: ReactNode;
  /** Imagen o icono delante de la etiqueta. */
  media?: ReactNode;
  disabled?: boolean;
  /** Las opciones con el mismo grupo se agrupan bajo su título (en orden de aparición). */
  group?: string;
  /** Texto extra para la búsqueda y el nombre accesible cuando `description` no es texto. */
  keywords?: string;
}

export interface NexSelectProps {
  options: readonly NexSelectOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  /** Etiqueta visible (obligatoria). */
  label: ReactNode;
  hideLabel?: boolean;
  placeholder?: string;
  description?: ReactNode;
  error?: ReactNode;
  /** Campo de búsqueda dentro de la lista. Por defecto, con más de 8 opciones. */
  searchable?: boolean;
  searchLabel?: string;
  /** Muestra también la descripción de la opción elegida en el disparador. */
  showDescription?: boolean;
  /** Nombre para formularios (se envía con un `<input type="hidden">`). */
  name?: string;
  required?: boolean;
  disabled?: boolean;
  density?: NexDensity;
  motion?: NexMotion;
  className?: string;
}

const textOf = (o: NexSelectOption) => [o.label, typeof o.description === 'string' ? o.description : '', o.keywords ?? ''].join(' ');
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function NexSelect({
  options, value: controlled, defaultValue = null, onValueChange, label, hideLabel, placeholder = 'Elige una opción', description, error,
  searchable: searchableProp, searchLabel, showDescription = false, name, required, disabled, density, motion, className,
}: NexSelectProps) {
  const defaults = useNex();
  const level = motion ?? defaults.motion;
  const base = `nx-select-${useId().replace(/:/g, '')}`;
  const [inner, setInner] = useState<string | null>(defaultValue);
  const value = controlled === undefined ? inner : controlled;
  const selected = options.find((o) => o.value === value) ?? null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const searchable = searchableProp ?? options.length > 8;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);

  /**
   * La lista sube a la capa superior del navegador (Popover API) y se coloca
   * junto al disparador: ningún contenedor con `overflow: hidden` (tarjetas,
   * escenarios, paneles) la recorta. Sin Popover API, queda absoluta debajo.
   */
  useAnchoredLayer(open, popup, () => trigger.current, { side: 'bottom', align: 'start', matchWidth: true });
  const typed = useRef({ text: '', at: 0 });

  const visible = useMemo(() => (query ? options.filter((o) => norm(textOf(o)).includes(norm(query))) : options), [options, query]);
  const enabled = visible.filter((o) => !o.disabled);
  const optionId = (v: string) => `${base}-opt-${options.findIndex((o) => o.value === v)}`;

  const liquid = useLiquid({
    host: list,
    items: '[role="option"]',
    active: () => list.current?.querySelector<HTMLElement>('[role="option"][data-active]') ?? null,
    orientation: 'vertical',
    form: () => 'drop',
    motion: level,
  });
  useLayoutEffect(() => { if (open) liquid.update('keyboard'); }, [open, active, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (v: string) => {
    if (controlled === undefined) setInner(v);
    if (v !== value) onValueChange?.(v);
  };
  const close = (focusTrigger = true) => {
    setOpen(false);
    setQuery('');
    if (focusTrigger) trigger.current?.focus();
  };
  const openList = (at?: 'first' | 'last') => {
    if (disabled) return;
    const r = trigger.current?.getBoundingClientRect();
    if (r && typeof window !== 'undefined') setPlacement(window.innerHeight - r.bottom < 300 && r.top > window.innerHeight - r.bottom ? 'top' : 'bottom');
    const pool = options.filter((o) => !o.disabled);
    setActive(at === 'first' ? pool[0]?.value ?? null : at === 'last' ? pool.at(-1)?.value ?? null : selected && !selected.disabled ? selected.value : pool[0]?.value ?? null);
    setOpen(true);
  };

  // Al abrir con búsqueda, el foco va al campo; la opción activa siempre a la vista.
  useEffect(() => { if (open && searchable) search.current?.focus(); }, [open, searchable]);
  useEffect(() => {
    if (!open || !active) return;
    document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active]); // eslint-disable-line react-hooks/exhaustive-deps
  // Un clic fuera cierra (sin robar el foco a donde se hizo clic).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) close(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  // Si el filtro deja fuera la activa, pasa a la primera visible.
  useEffect(() => {
    if (open && active && !enabled.some((o) => o.value === active)) setActive(enabled[0]?.value ?? null);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (delta: number) => {
    if (!enabled.length) return;
    const i = enabled.findIndex((o) => o.value === active);
    setActive(enabled[i < 0 ? (delta > 0 ? 0 : enabled.length - 1) : Math.max(0, Math.min(enabled.length - 1, i + delta))]!.value);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>, fromSearch: boolean) => {
    const k = e.key;
    if (!open) {
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') { e.preventDefault(); openList(k === 'ArrowUp' ? 'last' : undefined); }
      else if (k === 'Home' || k === 'End') { e.preventDefault(); openList(k === 'Home' ? 'first' : 'last'); }
      return;
    }
    if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); if (e.altKey && k === 'ArrowUp') { if (active) choose(active); close(); } else move(k === 'ArrowDown' ? 1 : -1); return; }
    if ((k === 'Home' || k === 'End') && !fromSearch) { e.preventDefault(); setActive((k === 'Home' ? enabled[0] : enabled.at(-1))?.value ?? null); return; }
    if (k === 'PageDown' || k === 'PageUp') { e.preventDefault(); move(k === 'PageDown' ? 8 : -8); return; }
    if (k === 'Enter' || (k === ' ' && !fromSearch)) { e.preventDefault(); if (active) choose(active); close(); return; }
    if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (k === 'Tab') { if (active) choose(active); close(false); return; }
    // Sin búsqueda: escribir salta a la opción que empieza por lo tecleado.
    if (!fromSearch && k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = Date.now();
      typed.current = { text: now - typed.current.at > 700 ? k : typed.current.text + k, at: now };
      const hit = enabled.find((o) => norm(o.label).startsWith(norm(typed.current.text)));
      if (hit) setActive(hit.value);
    }
  };

  // Grupos en orden de aparición.
  const groups = useMemo(() => {
    const out: Array<{ name: string | null; items: NexSelectOption[] }> = [];
    for (const o of visible) {
      const g = o.group ?? null;
      const last = out.at(-1);
      if (last && last.name === g) last.items.push(o);
      else out.push({ name: g, items: [o] });
    }
    return out;
  }, [visible]);

  const renderOption = (o: NexSelectOption) => {
    const isSelected = o.value === value;
    return (
      <div
        key={o.value}
        id={optionId(o.value)}
        role="option"
        aria-selected={isSelected}
        aria-disabled={o.disabled || undefined}
        data-active={o.value === active ? '' : undefined}
        className="nx-select__option"
        onPointerDown={(e) => e.preventDefault()}
        onPointerMove={() => { if (!o.disabled && active !== o.value) setActive(o.value); }}
        onClick={() => { if (o.disabled) return; choose(o.value); close(); }}
      >
        {o.media && <span className="nx-select__media" aria-hidden={typeof o.media === 'string' ? undefined : true}>{o.media}</span>}
        <span className="nx-select__text">
          <span className="nx-select__label">{o.label}</span>
          {o.description && <span className="nx-select__description">{o.description}</span>}
        </span>
        <span className="nx-select__check" aria-hidden="true">{isSelected && <NexIcon name="check" />}</span>
      </div>
    );
  };

  const describedBy = [description ? `${base}-description` : null, error ? `${base}-error` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div
      ref={root}
      className={cx('nx-field nx-select', className)}
      data-nx-density={density ?? defaults.density}
      data-nx-motion={level}
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
        role="combobox"
        className="nx-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${base}-list` : undefined}
        aria-labelledby={`${base}-label ${base}-value`}
        aria-activedescendant={open && !searchable && active ? optionId(active) : undefined}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={(e) => onKeyDown(e, false)}
      >
        <span id={`${base}-value`} className="nx-select__value" data-placeholder={selected ? undefined : ''}>
          {selected?.media && <span className="nx-select__media" aria-hidden="true">{selected.media}</span>}
          <span className="nx-select__text">
            <span className="nx-select__label">{selected ? selected.label : placeholder}</span>
            {showDescription && selected?.description && <span className="nx-select__description">{selected.description}</span>}
          </span>
        </span>
        <span className="nx-select__chevron" aria-hidden="true"><NexIcon name="chevron-down" /></span>
      </button>
      {open && (
        <div ref={popup} className="nx-select__popup" data-placement={placement} data-nx-density={density ?? defaults.density}>
          {searchable && (
            <input
              ref={search}
              className="nx-select__search"
              role="combobox"
              aria-label={searchLabel ?? 'Buscar'}
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={`${base}-list`}
              aria-activedescendant={active ? optionId(active) : undefined}
              placeholder={searchLabel ?? 'Buscar…'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => onKeyDown(e, true)}
            />
          )}
          <div ref={list} id={`${base}-list`} role="listbox" aria-labelledby={`${base}-label`} className="nx-select__list" tabIndex={-1}>
            <LiquidDrop svgRef={liquid.svg} pathRef={liquid.path} />
            {groups.map((g, i) => (g.name
              ? (
                <div key={`${g.name}-${i}`} role="group" aria-labelledby={`${base}-g${i}`}>
                  <div id={`${base}-g${i}`} className="nx-select__group" role="presentation">{g.name}</div>
                  {g.items.map(renderOption)}
                </div>
              )
              : g.items.map(renderOption)))}
          </div>
          {!visible.length && <p className="nx-select__empty" role="status">Sin resultados para «{query}».</p>}
        </div>
      )}
      {name && <input type="hidden" name={name} value={value ?? ''} />}
      {description && <p id={`${base}-description`} className="nx-field__description">{description}</p>}
      {error && <p id={`${base}-error`} className="nx-field__error">{error}</p>}
    </div>
  );
}
