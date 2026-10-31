/**
 * Comportamiento puro y compartido de NexComponents. Sin DOM ni framework:
 * cualquier adaptador (React hoy, otros mañana) llama a estas funciones, así
 * que el teclado de unas pestañas es idéntico en todas partes.
 */

/** Une clases ignorando valores vacíos. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export type Orientation = 'horizontal' | 'vertical';

/**
 * Siguiente índice para el patrón ARIA de pestañas / barras de herramientas.
 * Salta elementos deshabilitados, da la vuelta y respeta la orientación.
 * Devuelve `null` si la tecla no es de navegación.
 */
export function rovingIndex(
  key: string,
  current: number,
  disabled: readonly boolean[],
  orientation: Orientation = 'horizontal',
  dir: 'ltr' | 'rtl' = 'ltr',
): number | null {
  const n = disabled.length;
  if (n === 0) return null;
  const prevKey = orientation === 'horizontal' ? (dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp';
  const nextKey = orientation === 'horizontal' ? (dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown';
  const enabled = (i: number) => !disabled[i];
  const scan = (start: number, step: 1 | -1) => {
    for (let k = 1; k <= n; k++) {
      const i = (((start + step * k) % n) + n) % n;
      if (enabled(i)) return i;
    }
    return null;
  };
  switch (key) {
    case nextKey:
      return scan(current, 1);
    case prevKey:
      return scan(current, -1);
    case 'Home':
      return scan(-1, 1);
    case 'End':
      return scan(n, -1);
    default:
      return null;
  }
}

/** Identificador estable y válido para atributos `id` a partir de un valor libre. */
export function toDomId(...parts: string[]): string {
  return parts
    .join('-')
    .replace(/[^A-Za-z0-9_-]+/g, (m) => `_${[...m].map((c) => c.codePointAt(0)!.toString(36)).join('')}_`);
}

/** Slug para anclas de títulos (`## Instalación` → `instalacion`). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Política de URLs para contenido Markdown (no confiable).
 *
 * Permite http(s), mailto, anclas y rutas relativas. Todo lo demás
 * (`javascript:`, `data:`, `vbscript:`, esquemas propios) se descarta. Es la
 * misma regla de Nextudio (`isRelativeReference` + allowlist), en una sola
 * función comprobable.
 */
export function safeUrl(url: string, { allowMailto = true }: { allowMailto?: boolean } = {}): string | null {
  const trimmed = url.trim();
  if (trimmed === '') return null;
  // Controles y espacios dentro del esquema son un truco clásico (`java\nscript:`).
  const compact = trimmed.replace(/[\u0000- \u007f]+/g, '');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact)?.[1]?.toLowerCase();
  if (scheme === undefined) return compact.startsWith('//') ? null : trimmed;
  if (scheme === 'http' || scheme === 'https') return trimmed;
  if (scheme === 'mailto' && allowMailto) return trimmed;
  return null;
}

export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}
