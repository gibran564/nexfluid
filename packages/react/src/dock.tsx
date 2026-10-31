'use client';

/**
 * NexDock: barra de herramientas cuyos paneles nacen del control que los pide.
 *
 * Cada herramienta con `panel` es un NexMorph: el origen es el propio botón
 * (que no se oculta), el destino un panel anclado sobre él. Mientras la
 * superficie se separa del botón, un cuello metaball los une y se rompe al
 * alejarse (tensión superficial). Al cerrar, el panel vuelve al botón desde
 * su posición actual. Cambiar de herramienta cierra una y abre otra a la vez.
 *
 * Teclado: barra con roving tabindex (flechas, Inicio, Fin); Intro/Espacio
 * abren; Escape cierra y devuelve el foco al botón.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { metaballPath, type MorphFrame, type MorphPhysicsName } from '@nexfluid/core';
import { cx, rovingIndex, type NexMotion } from '@nexfluid/components';
import { NexMorph, useNexMorph, useNexMorphSource } from './morph.tsx';
import { useNex } from './provider.tsx';

export interface NexDockItem {
  id: string;
  label: string;
  icon: ReactNode;
  /** Contenido del panel. Sin panel, el botón es una acción (`onSelect`). */
  panel?: ReactNode;
  panelTitle?: string;
  onSelect?: () => void;
  disabled?: boolean;
}

export interface NexDockProps {
  items: readonly NexDockItem[];
  /** Nombre de la barra. */
  label: string;
  /** Tamaño del panel en px. */
  panelWidth?: number;
  panelHeight?: number;
  physics?: MorphPhysicsName;
  motion?: NexMotion;
  /** Herramienta abierta (controlado). */
  value?: string | null;
  onValueChange?: (id: string | null) => void;
  className?: string;
  style?: CSSProperties;
}

export function NexDock({
  items, label, panelWidth = 320, panelHeight = 240, physics = 'spatial', motion, value, onValueChange, className, style,
}: NexDockProps) {
  const defaults = useNex();
  const level = motion ?? defaults.motion;
  const [inner, setInner] = useState<string | null>(null);
  const openId = value === undefined ? inner : value;
  const setOpenId = (id: string | null) => {
    if (value === undefined) setInner(id);
    onValueChange?.(id);
  };
  const area = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const bridges = useRef<Record<string, (f: MorphFrame) => void>>({});
  const [focusIndex, setFocusIndex] = useState(0);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(bar.current?.querySelectorAll<HTMLButtonElement>(':scope > .nx-dock__item') ?? []);
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    const next = rovingIndex(e.key, current, buttons.map((b) => b.disabled), 'horizontal', getComputedStyle(e.currentTarget).direction === 'rtl' ? 'rtl' : 'ltr');
    if (next === null) return;
    e.preventDefault();
    setFocusIndex(next);
    buttons[next]!.focus();
  };

  return (
    <div ref={area} className={cx('nx-dock-area', className)} style={style} data-nx-motion={level}>
      <div ref={bar} role="toolbar" aria-label={label} aria-orientation="horizontal" className="nx-dock nx-surface" data-nx-role="control" data-nx-shape="capsule" data-nx-material="raised" onKeyDown={onKey}>
        {items.map((item, i) => {
          const tabIndex = i === focusIndex ? 0 : -1;
          if (!item.panel) {
            return (
              <button key={item.id} type="button" className="nx-dock__item" aria-label={item.label} title={item.label} tabIndex={tabIndex} disabled={item.disabled} onClick={item.onSelect} onFocus={() => setFocusIndex(i)}>
                {item.icon}
              </button>
            );
          }
          return (
            <NexMorph key={item.id} open={openId === item.id} onOpenChange={(o) => setOpenId(o ? item.id : openId === item.id ? null : openId)} physics={physics} motion={level} onFrame={(f) => bridges.current[item.id]?.(f)}>
              <DockButton item={item} tabIndex={tabIndex} onFocus={() => setFocusIndex(i)} />
              <DockPanel item={item} area={area} bar={bar} width={panelWidth} height={panelHeight} bridges={bridges} />
            </NexMorph>
          );
        })}
      </div>
    </div>
  );
}

function DockButton({ item, tabIndex, onFocus }: { item: NexDockItem; tabIndex: number; onFocus: () => void }) {
  const morph = useNexMorph()!;
  const source = useNexMorphSource<HTMLButtonElement>({ hide: false });
  return (
    <button
      {...source.props}
      ref={source.ref}
      type="button"
      className="nx-dock__item"
      data-dock-id={item.id}
      aria-label={item.label}
      title={item.label}
      aria-expanded={morph.open}
      aria-controls={morph.present ? morph.ids.target : undefined}
      data-nx-active={morph.open ? '' : undefined}
      tabIndex={tabIndex}
      disabled={item.disabled}
      onFocus={onFocus}
      onClick={() => {
        item.onSelect?.();
        morph.toggle();
      }}
    >
      {item.icon}
    </button>
  );
}

interface DockPanelProps {
  item: NexDockItem;
  area: RefObject<HTMLDivElement | null>;
  bar: RefObject<HTMLDivElement | null>;
  width: number;
  height: number;
  bridges: RefObject<Record<string, (f: MorphFrame) => void>>;
}

function DockPanel({ item, area, bar, width, height, bridges }: DockPanelProps) {
  const morph = useNexMorph()!;
  const [place, setPlace] = useState<CSSProperties | null>(null);
  const bridge = useRef<SVGPathElement>(null);
  // Cuello metaball entre el botón y la superficie que sale de él (coordenadas del panel).
  bridges.current[item.id] = (f: MorphFrame) => {
    const path = bridge.current;
    if (!path) return;
    if (f.state === 'open' || f.state === 'closed') {
      path.setAttribute('d', '');
      return;
    }
    const from = f.from.rect;
    const c1 = { x: from.x + from.width / 2, y: from.y + from.height / 2, r: Math.min(from.width, from.height) / 2 };
    const r2 = Math.max(6, Math.min(f.rect.width, f.rect.height) * 0.22);
    const c2 = { x: f.rect.x + f.rect.width / 2, y: f.rect.y + f.rect.height - r2, r: r2 };
    path.setAttribute('d', metaballPath(c1, c2, { spread: 0.45, maxDistance: c1.r + r2 + 70 }) ?? '');
  };
  // Anclado sobre el botón, dentro del área (se recalcula al abrir).
  useLayoutEffect(() => {
    if (!morph.present || !area.current || !bar.current) return;
    // En px CSS del área (sin escalar: funciona bajo un ancestro transformado).
    const a = area.current.getBoundingClientRect();
    const k = a.width / (area.current.offsetWidth || 1) || 1;
    const btn = bar.current.querySelector<HTMLElement>(`[data-dock-id="${item.id}"]`)?.getBoundingClientRect();
    const b = bar.current.getBoundingClientRect();
    const areaW = area.current.offsetWidth;
    const barTop = (b.top - a.top) / k;
    const w = Math.min(width, areaW - 16);
    const center = btn ? (btn.left + btn.width / 2 - a.left) / k : areaW / 2;
    const left = Math.max(8, Math.min(areaW - w - 8, center - w / 2));
    setPlace({ inset: 'auto', left, width: w, height: Math.max(120, Math.min(height, barTop - 20)), bottom: area.current.offsetHeight - barTop + 14 });
  }, [morph.present]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!place) return null;
  return (
    <>
      {area.current && createPortal(<svg className="nx-dock__bridge" style={place} aria-hidden="true" focusable="false"><path ref={bridge} /></svg>, area.current)}
      <NexMorph.Target container={area} panelStyle={place} label={item.panelTitle ?? item.label}>
      <div className="nx-dock__panel-header">
        <NexMorph.Title as="p" className="nx-dock__panel-title">{item.panelTitle ?? item.label}</NexMorph.Title>
        <NexMorph.Close />
      </div>
      <div className="nx-dock__panel-body">{item.panel}</div>
    </NexMorph.Target>
    </>
  );
}
