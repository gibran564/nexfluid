/**
 * Colocar una superficie junto a un ancla: geometría pura, sin DOM.
 *
 * La usan NexAnchoredLayer, NexMenu, NexSelect y NexInk a través de
 * `useAnchoredLayer` (@eclipsis/react). Aquí sólo hay rectángulos en
 * coordenadas del viewport VISUAL, así que se prueba con números y el mismo
 * cálculo sirve para un botón, un rango de texto o un punto.
 *
 * Estrategia, en orden:
 * 1. Lado preferido (`side`).
 * 2. `flip`: si no cabe y el lado opuesto ofrece más sitio, se da la vuelta.
 *    Si no cabe en ninguno, se queda en el que más sitio tiene y se limita
 *    su alto/ancho (`maxHeight`/`maxWidth`): nunca sale del viewport.
 * 3. Alineación en el eje cruzado (`start`/`center`/`end`; en RTL, `start`
 *    es la derecha).
 * 4. `shift`: se desliza dentro del margen seguro sin despegarse del ancla
 *    más de lo necesario; `arrow` dice dónde queda el centro del ancla
 *    dentro de la superficie (para un pico o un `transform-origin`).
 */

export type NexSide = 'top' | 'bottom' | 'left' | 'right';
export type NexAlign = 'start' | 'center' | 'end';

export interface AnchorRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PlaceFloatingInput {
  /** Rectángulo del ancla (elemento, rango de texto, punto de anchura 0). */
  anchor: AnchorRect;
  /** Tamaño natural de la superficie. */
  floating: { width: number; height: number };
  /** Zona utilizable: el viewport visual (o un límite más estrecho). */
  viewport: AnchorRect;
  side?: NexSide;
  align?: NexAlign;
  /** Separación entre ancla y superficie. */
  gap?: number;
  /** Margen seguro contra los bordes del viewport. */
  margin?: number;
  flip?: boolean;
  shift?: boolean;
  dir?: 'ltr' | 'rtl';
}

export interface FloatingPlacement {
  x: number;
  y: number;
  side: NexSide;
  align: NexAlign;
  /** El lado final no es el pedido. */
  flipped: boolean;
  /** Cuánto se desplazó en el eje cruzado para no salirse (px, con signo). */
  shift: number;
  /** Máximos que garantizan que cabe en el lado elegido. */
  maxWidth: number;
  maxHeight: number;
  /** Centro del ancla en coordenadas de la superficie (eje cruzado). */
  arrow: number;
}

const OPPOSITE: Record<NexSide, NexSide> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
const clamp = (v: number, lo: number, hi: number) => (hi < lo ? lo : Math.min(hi, Math.max(lo, v)));

/** Espacio libre en cada lado del ancla, ya descontados margen y separación. */
export function spaceAround(anchor: AnchorRect, viewport: AnchorRect, gap = 6, margin = 8): Record<NexSide, number> {
  return {
    top: anchor.top - viewport.top - gap - margin,
    bottom: viewport.top + viewport.height - (anchor.top + anchor.height) - gap - margin,
    left: anchor.left - viewport.left - gap - margin,
    right: viewport.left + viewport.width - (anchor.left + anchor.width) - gap - margin,
  };
}

export function placeFloating({
  anchor, floating, viewport, side = 'bottom', align = 'center', gap = 6, margin = 8, flip = true, shift = true, dir = 'ltr',
}: PlaceFloatingInput): FloatingPlacement {
  const space = spaceAround(anchor, viewport, gap, margin);
  const vertical = (s: NexSide) => s === 'top' || s === 'bottom';
  const need = (s: NexSide) => (vertical(s) ? floating.height : floating.width);

  let chosen = side;
  if (flip && need(side) > space[side]) {
    const other = OPPOSITE[side];
    if (need(other) <= space[other] || space[other] > space[side]) chosen = other;
  }

  const main = vertical(chosen);
  const maxHeight = Math.max(0, main ? space[chosen] : viewport.height - margin * 2);
  const maxWidth = Math.max(0, main ? viewport.width - margin * 2 : space[chosen]);
  const w = Math.min(floating.width, maxWidth);
  const h = Math.min(floating.height, maxHeight);

  // Eje principal: pegado al ancla por el lado elegido.
  let x = 0;
  let y = 0;
  if (chosen === 'bottom') y = anchor.top + anchor.height + gap;
  else if (chosen === 'top') y = anchor.top - gap - h;
  else if (chosen === 'right') x = anchor.left + anchor.width + gap;
  else x = anchor.left - gap - w;

  // Eje cruzado: alineación lógica (RTL invierte start/end en horizontal).
  const logical = main && dir === 'rtl' ? (align === 'start' ? 'end' : align === 'end' ? 'start' : align) : align;
  const cross = (start: number, length: number, size: number) =>
    logical === 'start' ? start : logical === 'end' ? start + length - size : start + length / 2 - size / 2;
  let delta = 0;
  if (main) {
    const wanted = cross(anchor.left, anchor.width, w);
    x = shift ? clamp(wanted, viewport.left + margin, viewport.left + viewport.width - margin - w) : wanted;
    delta = x - wanted;
  } else {
    const wanted = cross(anchor.top, anchor.height, h);
    y = shift ? clamp(wanted, viewport.top + margin, viewport.top + viewport.height - margin - h) : wanted;
    delta = y - wanted;
  }

  const arrow = main
    ? clamp(anchor.left + anchor.width / 2 - x, 0, w)
    : clamp(anchor.top + anchor.height / 2 - y, 0, h);

  return {
    x: Math.round(x), y: Math.round(y), side: chosen, align, flipped: chosen !== side, shift: Math.round(delta),
    maxWidth: Math.floor(maxWidth), maxHeight: Math.floor(maxHeight), arrow: Math.round(arrow),
  };
}

/** ¿El ancla queda fuera (entera) de alguno de los recortes? Entonces la superficie se oculta. */
export function anchorClipped(anchor: AnchorRect, clips: readonly AnchorRect[]): boolean {
  return clips.some((c) =>
    anchor.top + anchor.height < c.top || anchor.top > c.top + c.height ||
    anchor.left + anchor.width < c.left || anchor.left > c.left + c.width);
}
