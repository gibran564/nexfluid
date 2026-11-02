/**
 * Reordenar una lista vertical: comportamiento puro, sin DOM ni framework.
 *
 * Lo comparten el arrastre con puntero y el teclado de `NexBlockList`, así
 * que «dónde cae un bloque» se decide en un único sitio. Las medidas
 * (centros, bordes) las toma el adaptador; aquí sólo hay aritmética.
 */

/**
 * Posición final de un elemento arrastrado: cuántos de los DEMÁS elementos
 * quedan con su centro por encima del puntero. `centers` excluye el elemento
 * que se arrastra y va en orden de documento.
 */
export function reorderSlot(centers: readonly number[], pointer: number): number {
  let slot = 0;
  for (const center of centers) if (center < pointer) slot++;
  return slot;
}

/** Copia de `list` con el elemento de `from` movido a `to` (recortado al rango). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from < 0 || from >= next.length) return next;
  const at = Math.max(0, Math.min(Math.trunc(to), next.length - 1));
  const [item] = next.splice(from, 1);
  next.splice(at, 0, item as T);
  return next;
}

/**
 * Desplazamiento automático cerca de los bordes de lo que se desplaza: negativo
 * hacia arriba, positivo hacia abajo, 0 fuera de las franjas. Crece con la
 * profundidad dentro de la franja, hasta `max` píxeles por fotograma.
 */
export function edgeScrollStep(pointer: number, start: number, end: number, edge = 56, max = 18): number {
  if (pointer < start + edge) return -Math.ceil(((start + edge - pointer) / edge) * max);
  if (pointer > end - edge) return Math.ceil(((pointer - (end - edge)) / edge) * max);
  return 0;
}

/**
 * Destino de un movimiento con teclado desde el asa: ↑/↓ un puesto, Inicio/Fin
 * a los extremos. `null` si la tecla no mueve o el destino es el mismo sitio.
 */
export function keyboardMove(key: string, index: number, total: number): number | null {
  const target = key === 'ArrowUp' ? index - 1 : key === 'ArrowDown' ? index + 1 : key === 'Home' ? 0 : key === 'End' ? total - 1 : null;
  if (target === null || target < 0 || target >= total || target === index) return null;
  return target;
}
