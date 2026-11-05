/**
 * Compositor de NexView: de una lista de resultados a una composición.
 *
 * Determinista y sin adivinar significado:
 * - ANCLAS (texto, diagnósticos, entrada) se quedan donde ocurrieron, a todo
 *   el ancho. Nada cruza un ancla: lo que vino antes de un error sigue antes.
 * - Entre dos anclas, los resultados visuales y de datos consecutivos forman
 *   un TRAMO y se empaquetan en filas en su orden, con anchos proporcionales a
 *   su forma (relación de aspecto de una imagen, columnas de una tabla).
 * - Un tramo sólo de imágenes es una GALERÍA (misma altura, sin deformar).
 * - Un `group` explícito empieza fila propia y no se mezcla con otro grupo;
 *   sin metadatos de relación no se agrupa nada más que por adyacencia.
 * - Lo que no cabe a lo ancho (una tabla con muchas columnas) ocupa la fila.
 */
import type { NexViewEvent } from './model.ts';

export type NexViewRole = 'narrative' | 'notice' | 'exchange' | 'data' | 'visual';

export interface NexViewItem {
  event: NexViewEvent;
  role: NexViewRole;
  /** Clave estable (seq + índice dentro de la salida). */
  key: string;
  /** Peso horizontal dentro de su fila (proporción). */
  weight: number;
  /** Ocupa toda la fila. */
  wide: boolean;
  /** Relación ancho/alto conocida (imágenes, figuras con `aspect`). */
  aspect?: number;
  group?: string;
}

export type NexViewSection =
  | { kind: 'anchor'; item: NexViewItem }
  | { kind: 'row'; items: NexViewItem[]; group?: string }
  | { kind: 'gallery'; items: NexViewItem[]; group?: string };

export interface ComposeOptions {
  /** Columnas disponibles (1–3), elegidas con `columnsFor`. */
  columns: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Cuánto peso cabe en una fila según las columnas disponibles. */
const CAPACITY: Record<number, number> = { 1: 0, 2: 3.8, 3: 5.8 };

function describe(event: NexViewEvent, index: number): NexViewItem {
  const key = `${event.output.seq}:${index}`;
  if (event.kind === 'text') return { event, key, role: 'narrative', weight: 1, wide: true };
  if (event.kind === 'diagnostic') return { event, key, role: 'notice', weight: 1, wide: true };
  if (event.kind === 'input') return { event, key, role: 'exchange', weight: 1, wide: true };
  if (event.kind === 'printed') {
    const t = event.structure.table;
    return { event, key, role: 'data', weight: clamp(t.columns.length * 0.45, 0.8, 2.2), wide: t.columns.length > 8 };
  }
  const o = event.output;
  const group = 'group' in o && typeof o.group === 'string' ? o.group : undefined;
  switch (o.stream) {
    case 'table': {
      const chars = o.columns.reduce((sum, c, i) => sum + Math.max(String(c).length, ...o.rows.slice(0, 20).map((r) => String(r[i] ?? '').length)), 0);
      return { event, key, role: 'data', group, weight: clamp(chars / 14, 0.8, 3), wide: o.columns.length > 6 || chars > 90 };
    }
    case 'json': return { event, key, role: 'data', group, weight: 1.2, wide: false };
    case 'image': {
      const aspect = o.width && o.height ? o.width / o.height : undefined;
      return { event, key, role: 'visual', group, aspect, weight: clamp(aspect ?? 1.5, 0.6, 2.6), wide: false };
    }
    case 'figure': return { event, key, role: 'visual', group, aspect: o.aspect, weight: clamp(o.aspect ?? 1.6, 0.6, 2.6), wide: false };
    default: return { event, key, role: 'visual', group, weight: 1.4, wide: false };
  }
}

/** La composición de unos eventos ya normalizados (`normalizeNexViewEvents` + `layoutNexViewEvents`). */
export function composeNexView(events: readonly NexViewEvent[], { columns }: ComposeOptions): NexViewSection[] {
  const sections: NexViewSection[] = [];
  let run: NexViewItem[] = [];
  const flush = () => {
    if (!run.length) return;
    // Partir el tramo por grupo explícito: cada grupo, sus filas.
    const parts: NexViewItem[][] = [];
    for (const item of run) {
      const last = parts.at(-1);
      if (last && last[0]!.group === item.group) last.push(item);
      else parts.push([item]);
    }
    for (const part of parts) {
      const group = part[0]!.group;
      if (part.length > 1 && part.every((i) => i.role === 'visual' && i.event.kind === 'structured' && i.event.output.stream === 'image')) {
        sections.push({ kind: 'gallery', items: part, group });
        continue;
      }
      // Filas por CAPACIDAD (suma de pesos), no por número: una tabla estrecha no gasta una columna entera.
      const capacity = CAPACITY[columns] ?? 0;
      let row: NexViewItem[] = [];
      let used = 0;
      for (const item of part) {
        if (item.wide || columns === 1) {
          if (row.length) sections.push({ kind: 'row', items: row, group });
          sections.push({ kind: 'row', items: [item], group });
          row = [];
          used = 0;
          continue;
        }
        if (row.length && (used + item.weight > capacity || row.length > columns)) { sections.push({ kind: 'row', items: row, group }); row = []; used = 0; }
        row.push(item);
        used += item.weight;
      }
      if (row.length) sections.push({ kind: 'row', items: row, group });
    }
    run = [];
  };
  events.forEach((event, i) => {
    const item = describe(event, i);
    if (item.role === 'narrative' || item.role === 'notice' || item.role === 'exchange') { flush(); sections.push({ kind: 'anchor', item }); }
    else run.push(item);
  });
  flush();
  return sections;
}

/**
 * Columnas para un ancho, con histéresis: sólo cambia al cruzar un umbral con
 * 32 px de margen, así un redimensionado lento no reorganiza en cada píxel.
 */
export function columnsFor(width: number, previous?: number): number {
  const target = width >= 760 ? 3 : width >= 480 ? 2 : 1;
  if (previous === undefined || previous === target) return target;
  const edge = (cols: number) => (cols === 3 ? 760 : cols === 2 ? 480 : 0);
  // Subir exige pasar el umbral + margen; bajar, quedarse por debajo − margen.
  if (target > previous) return width >= edge(target) + 32 ? target : previous;
  return width < edge(previous) - 32 ? target : previous;
}
