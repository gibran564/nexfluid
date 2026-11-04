'use client';

/**
 * NexInk: herramientas editoriales que aparecen con la selección.
 *
 *   <NexInk adapter={adapter} commands={commands} />
 *
 * Tres responsabilidades, separadas:
 * - UI (aquí): la barra, sus grupos, el estado de cada formato (activo,
 *   inactivo o mixto), la revelación progresiva («Más») y los campos de un
 *   comando que pide un valor (un enlace).
 * - Interacción (aquí): cuándo aparece, dónde (NexAnchoredLayer anclado al rango
 *   seleccionado; hoja inferior sobre el teclado en pantallas estrechas),
 *   teclado (Alt+F10 entra en la barra, flechas la recorren, Escape vuelve al
 *   texto), atajos de los comandos y la conservación de la selección mientras
 *   se usa la barra.
 * - Adaptador (fuera): habla con un motor concreto —un `<textarea>`, un
 *   `contenteditable`, Monaco, ProseMirror—. NexInk no sabe qué es Markdown
 *   ni qué es un documento; sólo pide «¿está activo X?» y «ejecuta X».
 *
 * La barra no se roba la selección: los botones no toman el foco al
 * pulsarlos, y si el foco entra en la barra (teclado) se guarda un marcador
 * del adaptador que se restaura antes de ejecutar.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cx, rovingIndex, type NexMotion } from '@eclipsis/components';
import type { NexVirtualAnchor } from './anchored.ts';
import { NexAnchoredLayer } from './anchored-layer.tsx';
import { useNex } from './provider.tsx';

/** Activo, inactivo o mixto (la selección cruza texto con y sin el formato). */
export type NexInkState = boolean | 'mixed';

export interface NexInkSelection {
  collapsed: boolean;
  /** Dónde está: un ancla virtual que se lee en vivo (sigue al scroll y al reflujo). */
  anchor: NexVirtualAnchor;
}

/** El contrato con un motor de edición. Nada de él es de NexBook ni de Monaco. */
export interface NexInkAdapter<C extends string = string> {
  /** El elemento editable (para atajos y para saber si el foco está en él). */
  element(): HTMLElement | null;
  /** La selección actual, o `null` si no está en el editor. */
  selection(): NexInkSelection | null;
  state(command: C): NexInkState;
  /** ¿Se puede ejecutar ahora? (sólo lectura, una isla protegida…). Por defecto, sí. */
  enabled?(command: C): boolean;
  /** Ejecuta un comando sobre la selección; una sola parada de deshacer. */
  run(command: C, value?: string): void;
  /** Marcador opaco de la selección, y su restauración (devuelve el foco al editor). */
  bookmark(): unknown;
  restore(bookmark: unknown): void;
  /** Avisa de cambios de selección o de contenido. Devuelve la baja. */
  subscribe(listener: () => void): () => void;
}

export interface NexInkCommand<C extends string = string> {
  id: C;
  label: string;
  icon: ReactNode;
  /** `Mod+B`, `Mod+Shift+X`… (`Mod` es Ctrl o ⌘). Se anuncia con aria-keyshortcuts. */
  shortcut?: string;
  /** `primary` se ve siempre; `more`, tras «Más». */
  tier?: 'primary' | 'more';
  /** Pide un valor antes de ejecutarse (la dirección de un enlace). */
  input?: { label: string; placeholder?: string; initial?: () => string };
}

export interface NexInkProps<C extends string = string> {
  adapter: NexInkAdapter<C> | null;
  commands: readonly NexInkCommand<C>[];
  /** Nombre accesible de la barra. */
  label?: string;
  /**
   * `contextual`: flota junto a la selección y desaparece sin ella.
   * `inline`: barra fija en su sitio (un consumidor que no quiere capas).
   */
  presentation?: 'contextual' | 'inline';
  /** Atajos de los comandos y Alt+F10 sobre el editor. Por defecto, sí. */
  shortcuts?: boolean;
  /** Tras ejecutar (para analítica o para cerrar otra cosa). */
  onRun?: (command: C, value?: string) => void;
  motion?: NexMotion;
  className?: string;
}

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** ¿Coincide el evento con `Mod+Shift+B`? */
export function matchesShortcut(event: Pick<globalThis.KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>, shortcut: string, mac = isMac()): boolean {
  const parts = shortcut.split('+');
  const key = parts.pop()!.toLowerCase();
  const mods = new Set(parts.map((p) => p.toLowerCase()));
  const mod = mac ? event.metaKey : event.ctrlKey;
  return event.key.toLowerCase() === key && mod === mods.has('mod') && event.shiftKey === mods.has('shift') && event.altKey === mods.has('alt');
}

/** `Mod+B` → `Control+B` / `Meta+B` (aria-keyshortcuts). */
const ariaKeys = (shortcut: string) => shortcut.replace('Mod', isMac() ? 'Meta' : 'Control');

const pressed = (s: NexInkState) => (s === 'mixed' ? 'mixed' : s ? 'true' : 'false');

export function NexInk<C extends string = string>({
  adapter, commands, label = 'Formato', presentation = 'contextual', shortcuts = true, onRun, motion, className,
}: NexInkProps<C>) {
  const defaults = useNex();
  const level = motion ?? defaults.motion;
  const base = `nx-ink-${useId().replace(/:/g, '')}`;
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const [expanded, setExpanded] = useState(false);
  const [asking, setAsking] = useState<{ command: NexInkCommand<C>; value: string } | null>(null);
  const [inside, setInside] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(0);
  const bar = useRef<HTMLDivElement>(null);
  const mark = useRef<unknown>(null);
  const lastAnchor = useRef<NexVirtualAnchor | null>(null);
  const coarse = useCoarse();

  useEffect(() => adapter?.subscribe(() => { setDismissed(false); bump(); }), [adapter, bump]);

  const selection = adapter?.selection() ?? null;
  if (selection) lastAnchor.current = selection.anchor;
  const visible = useMemo(() => commands.filter((c) => (c.tier ?? 'primary') === 'primary' || expanded), [commands, expanded]);
  const hasMore = commands.some((c) => c.tier === 'more');

  const open = presentation === 'inline'
    || Boolean(asking) || inside || (!dismissed && Boolean(selection && !selection.collapsed));

  // Al cerrarse, vuelve a su forma compacta.
  useEffect(() => { if (!open) { setExpanded(false); setAsking(null); setActive(0); } }, [open]);

  const restore = () => { if (mark.current !== null && adapter) adapter.restore(mark.current); mark.current = null; };

  const execute = (command: NexInkCommand<C>, value?: string) => {
    if (!adapter || adapter.enabled?.(command.id) === false) return;
    restore();
    adapter.run(command.id, value);
    onRun?.(command.id, value);
    bump();
  };

  const choose = (command: NexInkCommand<C>) => {
    if (command.input) {
      if (mark.current === null) mark.current = adapter?.bookmark() ?? null;
      setAsking({ command, value: command.input.initial?.() ?? '' });
      return;
    }
    execute(command);
  };

  const focusBar = () => {
    if (!adapter) return;
    mark.current = adapter.bookmark();
    setInside(true);
    requestAnimationFrame(() => bar.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus());
  };

  // Atajos y Alt+F10 sobre el editor.
  useEffect(() => {
    const el = adapter?.element();
    if (!el || !shortcuts) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.altKey && event.key === 'F10') { event.preventDefault(); focusBar(); return; }
      const command = commands.find((c) => c.shortcut && matchesShortcut(event, c.shortcut));
      if (!command) return;
      event.preventDefault();
      choose(command);
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }); // cada render: los comandos y el adaptador pueden cambiar

  const onBarKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (asking) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setInside(false);
      restore();
      return;
    }
    const buttons = [...(bar.current?.querySelectorAll<HTMLButtonElement>('[data-nx-ink-item]') ?? [])];
    const next = rovingIndex(event.key, active, buttons.map((b) => b.disabled), 'horizontal', getComputedStyle(event.currentTarget).direction === 'rtl' ? 'rtl' : 'ltr');
    if (next !== null) { event.preventDefault(); setActive(next); buttons[next]?.focus(); }
  };

  if (!adapter) return null;

  let index = 0;
  const item = (props: { key: string; label: string; content: ReactNode; state?: NexInkState; disabled?: boolean; keys?: string; expanded?: boolean; onPress: () => void }) => {
    const i = index++;
    return (
      <button
        key={props.key}
        type="button"
        className="nx-ink__cmd"
        data-nx-ink-item=""
        data-state={props.state === undefined ? undefined : props.state === 'mixed' ? 'mixed' : props.state ? 'on' : 'off'}
        tabIndex={i === active ? 0 : -1}
        aria-label={props.label}
        title={props.label}
        aria-pressed={props.state === undefined ? undefined : pressed(props.state)}
        aria-expanded={props.expanded}
        aria-controls={props.expanded === undefined ? undefined : `${base}-more`}
        aria-keyshortcuts={props.keys}
        disabled={props.disabled}
        onFocus={() => setActive(i)}
        onClick={props.onPress}
      >
        {props.content}
      </button>
    );
  };

  const primary = visible.filter((c) => (c.tier ?? 'primary') === 'primary');
  const more = commands.filter((c) => c.tier === 'more');
  const commandButton = (c: NexInkCommand<C>) => item({
    key: c.id, label: c.label, content: c.icon, state: adapter.state(c.id), disabled: adapter.enabled?.(c.id) === false,
    keys: c.shortcut ? ariaKeys(c.shortcut) : undefined, onPress: () => choose(c),
  });

  const body = asking ? (
    <form
      className="nx-ink__ask"
      onSubmit={(e) => { e.preventDefault(); const { command, value } = asking; setAsking(null); setInside(false); execute(command, value); }}
    >
      <input
        autoFocus
        className="nx-ink__input"
        aria-label={asking.command.input!.label}
        placeholder={asking.command.input!.placeholder}
        value={asking.value}
        onChange={(e) => setAsking({ ...asking, value: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setAsking(null); setInside(false); restore(); }
        }}
      />
    </form>
  ) : (
    <>
      {primary.map(commandButton)}
      {hasMore && item({
        key: '__more', label: expanded ? 'Menos formatos' : 'Más formatos', expanded,
        content: <span className="nx-ink__more-glyph" aria-hidden="true" />, onPress: () => setExpanded(!expanded),
      })}
      {hasMore && (
        <div id={`${base}-more`} className="nx-ink__more" data-open={expanded ? '' : undefined} role="group" aria-label="Más formatos">
          <div className="nx-ink__more-inner">{expanded && more.map(commandButton)}</div>
        </div>
      )}
    </>
  );

  const toolbar = (
    <div
      ref={bar}
      className={cx('nx-ink', className)}
      data-presentation={presentation}
      data-asking={asking ? '' : undefined}
      data-nx-motion={level}
      role={presentation === 'inline' ? 'toolbar' : undefined}
      aria-label={presentation === 'inline' ? label : undefined}
      aria-controls={adapter.element()?.id || undefined}
      onKeyDown={onBarKey}
      onPointerDown={(e) => { if (!(e.target as Element).closest('input')) e.preventDefault(); }}
      onFocus={() => { if (mark.current === null) mark.current = adapter.bookmark(); setInside(true); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { setInside(false); if (!asking) mark.current = null; } }}
    >
      {body}
    </div>
  );

  if (presentation === 'inline') return toolbar;
  return (
    <NexAnchoredLayer
      open={open}
      onOpenChange={(next) => { if (!next) { setDismissed(true); setInside(false); setAsking(null); } }}
      anchor={selection?.anchor ?? lastAnchor.current}
      side={coarse ? 'bottom' : 'top'}
      align="center"
      gap={8}
      presentation="adaptive"
      role="toolbar"
      label={label}
      surface="ink"
      initialFocus="none"
      restoreFocus={false}
      dismiss={{ escape: true, outside: false }}
      motion={level}
      className="nx-ink-layer"
    >
      {toolbar}
    </NexAnchoredLayer>
  );
}

/** Puntero grueso: la barra va debajo, lejos del menú nativo de selección (que sale encima). */
function useCoarse() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return coarse;
}
