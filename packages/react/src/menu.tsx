'use client';

/**
 * NexMenu: un botón que abre una lista de acciones.
 *
 * Patrón WAI-ARIA «menu button»: el disparador anuncia `aria-haspopup` y
 * `aria-expanded`; al abrir, el foco ENTRA en el menú (primera acción, o la
 * última si se abrió con ↑) y vuelve al disparador al cerrar. Así el menú se
 * cierra con lo que ya sabe el árbol —el foco sale de él, Escape, Tab— y no
 * hace falta un oyente global mientras está cerrado: un documento puede tener
 * cien menús de bloque y ninguno escucha nada hasta que se abre.
 *
 * La lista sube a la capa superior del navegador (Popover API) y se recoloca
 * contra el viewport visual: ningún editor, marco con `overflow: hidden` o
 * teclado en pantalla la recorta. Sin Popover API, queda absoluta.
 *
 * Elegir cierra primero y devuelve el foco, y DESPUÉS ejecuta la acción: una
 * acción que abre un diálogo o enfoca un editor gana el foco.
 *
 * Teclado: ↑/↓ recorren (saltan deshabilitadas y dan la vuelta), Inicio/Fin,
 * una letra salta a la acción que empieza así, Intro/Espacio eligen, Escape
 * cierra sin propagarse (un menú dentro de un panel no cierra el panel), Tab
 * cierra y deja seguir.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cx, rovingIndex, type NexAppearance, type NexDensity, type NexMotion } from '@nexfluid/components';
import { useNex } from './provider.tsx';
import { NexButton } from './button.tsx';
import { NexIcon } from './icon.tsx';
import { useAnchoredLayer } from './anchored.ts';

export interface NexMenuItem {
  /** Identidad estable (clave de React y de pruebas). */
  id: string;
  label: string;
  /** Pista secundaria, en gris junto a la etiqueta («Markdown», «Ctrl+D»). */
  hint?: ReactNode;
  icon?: ReactNode;
  /** Las acciones con el mismo grupo se agrupan bajo su título, en orden de aparición. */
  group?: string;
  disabled?: boolean;
  /** Con valor, la acción es un interruptor (`menuitemcheckbox`). */
  checked?: boolean;
  /** `danger` sólo cambia el color: la etiqueta debe decir la consecuencia. */
  tone?: 'neutral' | 'danger';
  onSelect: () => void;
}

export interface NexMenuProps {
  items: readonly NexMenuItem[];
  /** Nombre accesible del disparador y del menú. Obligatorio. */
  label: string;
  /** Contenido visible del disparador. Sin él, sólo `icon` (botón de icono). */
  children?: ReactNode;
  /** Icono del disparador. Por defecto, `more`. */
  icon?: ReactNode;
  appearance?: NexAppearance;
  /** `end` alinea el borde derecho del menú con el del disparador. */
  align?: 'start' | 'end';
  /** Lado preferido; se da la vuelta si no cabe. */
  placement?: 'bottom' | 'top';
  disabled?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  density?: NexDensity;
  motion?: NexMotion;
  className?: string;
  triggerClassName?: string;
}


export function NexMenu({
  items: source, label, children, icon, appearance = 'ghost', align = 'start', placement = 'bottom', disabled,
  open: controlled, defaultOpen = false, onOpenChange, density, motion, className, triggerClassName,
}: NexMenuProps) {
  const defaults = useNex();
  const level = motion ?? defaults.motion;
  const base = `nx-menu-${useId().replace(/:/g, '')}`;
  // En el orden en que se ven (agrupadas): las flechas recorren lo que se ve.
  const items = useMemo(() => groupItems(source).flatMap((g) => g.entries.map((e) => e.item)), [source]);
  const [inner, setInner] = useState(defaultOpen);
  const open = (controlled ?? inner) && !disabled;
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const startAt = useRef<'first' | 'last'>('first');
  const typed = useRef({ text: '', at: 0 });
  const disabledList = items.map((i) => Boolean(i.disabled));

  const setOpen = (next: boolean, restoreFocus = false) => {
    if (controlled === undefined) setInner(next);
    onOpenChange?.(next);
    if (!next && restoreFocus) trigger.current?.focus();
  };

  // Al abrir, la primera (o la última) acción habilitada.
  useEffect(() => {
    if (!open) { setActive(-1); return; }
    const first = rovingIndex(startAt.current === 'last' ? 'End' : 'Home', -1, disabledList, 'vertical');
    setActive(first ?? -1);
    startAt.current = 'first';
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || active < 0) return;
    popup.current?.querySelector<HTMLElement>(`[data-nx-index="${active}"]`)?.focus({ preventScroll: false });
  }, [open, active]);

  useAnchoredLayer(open, popup, () => trigger.current, { align, placement });

  // Pulsar fuera cierra. Sólo se escucha mientras el menú está abierto.
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (index: number) => {
    const item = items[index];
    if (!item || item.disabled) return;
    setOpen(false, true);
    item.onSelect();
  };

  const onTriggerKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      startAt.current = event.key === 'ArrowUp' ? 'last' : 'first';
      setOpen(true);
    }
  };

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false, true);
      return;
    }
    if (event.key === 'Tab') { setOpen(false); return; }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(active);
      return;
    }
    const next = rovingIndex(event.key, active, disabledList, 'vertical');
    if (next !== null) { event.preventDefault(); setActive(next); return; }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : '') + event.key.toLowerCase(), at: now };
      const query = typed.current.text;
      const n = items.length;
      // Una letra busca desde la siguiente; varias seguidas refinan desde la actual.
      const from = query.length > 1 ? active : active + 1;
      for (let k = 0; k < n; k++) {
        const i = (((from + k) % n) + n) % n;
        const item = items[i]!;
        if (!item.disabled && item.label.toLowerCase().startsWith(query)) { setActive(i); break; }
      }
    }
  };

  const groups = groupItems(items);

  return (
    <div
      ref={root}
      className={cx('nx-menu', className)}
      data-open={open ? '' : undefined}
      data-nx-motion={level}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (open && next instanceof Node && !root.current?.contains(next)) setOpen(false);
      }}
    >
      <NexButton
        ref={trigger}
        appearance={appearance}
        density={density}
        motion={level}
        className={cx('nx-menu__trigger', triggerClassName)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${base}-list` : undefined}
        aria-label={label}
        title={children ? undefined : label}
        disabled={disabled}
        iconStart={icon ?? (children ? undefined : <NexIcon name="more" />)}
        onClick={() => setOpen(!open)}
        onKeyDown={onTriggerKey}
      >
        {children}
      </NexButton>
      {open && (
        <div
          ref={popup}
          id={`${base}-list`}
          className="nx-menu__popup"
          role="menu"
          aria-label={label}
          data-align={align}
          onKeyDown={onMenuKey}
        >
          {groups.map((group, g) => (
            <div key={group.name ?? `_${g}`} role={group.name ? 'group' : 'none'} aria-labelledby={group.name ? `${base}-g${g}` : undefined} className="nx-menu__group">
              {group.name && <div id={`${base}-g${g}`} role="presentation" className="nx-menu__heading">{group.name}</div>}
              {group.entries.map(({ item, index }) => (
                <div
                  key={item.id}
                  role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                  aria-checked={item.checked}
                  aria-disabled={item.disabled || undefined}
                  tabIndex={index === active ? 0 : -1}
                  className="nx-menu__item"
                  data-nx-index={index}
                  data-nx-tone={item.tone === 'danger' ? 'danger' : undefined}
                  data-active={index === active ? '' : undefined}
                  onPointerMove={() => { if (!item.disabled && index !== active) setActive(index); }}
                  onClick={() => choose(index)}
                >
                  <span className="nx-menu__icon" aria-hidden="true">
                    {item.checked === undefined ? item.icon : item.checked ? <NexIcon name="check" /> : null}
                  </span>
                  <span className="nx-menu__label">{item.label}</span>
                  {item.hint !== undefined && <span className="nx-menu__hint">{item.hint}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Grupos en orden de primera aparición; cada acción conserva su índice dentro de `items`. */
function groupItems(items: readonly NexMenuItem[]) {
  const groups: { name: string | undefined; entries: { item: NexMenuItem; index: number }[] }[] = [];
  items.forEach((item, index) => {
    const last = groups[groups.length - 1];
    const group = item.group ? groups.find((g) => g.name === item.group) : undefined;
    if (group) group.entries.push({ item, index });
    else if (!item.group && last && last.name === undefined) last.entries.push({ item, index });
    else groups.push({ name: item.group, entries: [{ item, index }] });
  });
  return groups;
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export interface NexCommandMenuProps {
  /** Abierto mientras haya un ancla. */
  open: boolean;
  /** Elemento junto al que aparece: la línea donde se escribió «/», el «+» del margen… */
  anchor: HTMLElement | null;
  items: readonly NexMenuItem[];
  /** Nombre accesible de la lista. */
  label: string;
  /** Texto con el que empieza el filtro (lo escrito tras «/»). */
  initialQuery?: string;
  placeholder?: string;
  /** Se cierra sin elegir (Escape, foco fuera, pulsar fuera) o tras elegir. */
  onClose: (reason: 'select' | 'dismiss') => void;
  /** A dónde vuelve el foco al cerrar sin elegir. Por defecto, al ancla. */
  returnFocus?: HTMLElement | null;
  motion?: NexMotion;
}

/**
 * NexCommandMenu: elegir qué insertar escribiendo.
 *
 * Es la paleta de «/»: aparece junto a un ancla que decide la aplicación, con
 * un campo de búsqueda que recibe el foco —quien escribía sigue escribiendo, y
 * lo que teclea filtra— y una lista (`listbox`) que se recorre con flechas sin
 * sacar el foco del campo (`aria-activedescendant`). No sabe nada del editor:
 * la aplicación detecta el «/», abre el menú y aplica la opción elegida.
 */
export function NexCommandMenu({ open, anchor, items, label, initialQuery = '', placeholder = 'Buscar…', onClose: notify, returnFocus, motion }: NexCommandMenuProps) {
  const defaults = useNex();
  const base = `nx-cmd-${useId().replace(/:/g, '')}`;
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState(0);
  const popup = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const shown = open && Boolean(anchor);
  // Un cierre por apertura: devolver el foco al ancla dispara un blur que no debe cerrar otra vez.
  const closed = useRef(false);
  const onClose = useCallback((reason: 'select' | 'dismiss') => {
    if (closed.current) return;
    closed.current = true;
    notify(reason);
  }, [notify]);
  const ordered = useMemo(() => groupItems(items).flatMap((g) => g.entries.map((e) => e.item)), [items]);
  const matches = useMemo(() => {
    const q = fold(query.trim());
    return q ? ordered.filter((i) => !i.disabled && [i.label, i.group ?? '', typeof i.hint === 'string' ? i.hint : ''].some((t) => fold(t).includes(q))) : ordered.filter((i) => !i.disabled);
  }, [ordered, query]);

  useEffect(() => { if (shown) { closed.current = false; setQuery(initialQuery); setActive(0); } }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setActive(0); }, [query]);
  useAnchoredLayer(shown, popup, () => anchor);
  useEffect(() => { if (shown) input.current?.focus({ preventScroll: true }); }, [shown]);
  useEffect(() => {
    if (!shown) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !popup.current?.contains(event.target) && !anchor?.contains(event.target)) onClose('dismiss');
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [shown, anchor, onClose]);
  useEffect(() => {
    popup.current?.querySelector(`#${base}-o${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active, base]);

  if (!shown) return null;
  const dismiss = () => { onClose('dismiss'); (returnFocus ?? anchor)?.focus({ preventScroll: true }); };
  const choose = (item: NexMenuItem | undefined) => {
    if (!item) return;
    onClose('select');
    item.onSelect();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const n = matches.length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (n) setActive((i) => (i + (event.key === 'ArrowDown' ? 1 : -1) + n) % n);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(matches[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    } else if (event.key === 'Backspace' && query === '') {
      // Borrar más allá del filtro vacío es arrepentirse del «/».
      event.preventDefault();
      dismiss();
    } else if (event.key === 'Tab') {
      onClose('dismiss');
    }
  };

  return (
    <div ref={popup} className="nx-menu__popup nx-cmd" data-nx-motion={motion ?? defaults.motion}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && !popup.current?.contains(next)) onClose('dismiss');
      }}>
      <input
        ref={input}
        className="nx-cmd__search"
        role="combobox"
        aria-expanded="true"
        aria-controls={`${base}-list`}
        aria-activedescendant={matches[active] ? `${base}-o${active}` : undefined}
        aria-autocomplete="list"
        aria-label={label}
        placeholder={placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <div id={`${base}-list`} role="listbox" aria-label={label} className="nx-cmd__list">
        {matches.length === 0 && <p className="nx-cmd__empty">Nada con «{query}»</p>}
        {matches.map((item, index) => {
          const heading = item.group && item.group !== matches[index - 1]?.group ? item.group : null;
          return (
            <div key={item.id} role="presentation">
              {heading && <div className="nx-menu__heading" aria-hidden="true">{heading}</div>}
              <div
                id={`${base}-o${index}`}
                role="option"
                aria-selected={index === active}
                className="nx-menu__item"
                data-active={index === active ? '' : undefined}
                onPointerMove={() => { if (index !== active) setActive(index); }}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                <span className="nx-menu__icon" aria-hidden="true">{item.icon}</span>
                <span className="nx-menu__label">{item.label}</span>
                {item.hint !== undefined && <span className="nx-menu__hint">{item.hint}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
