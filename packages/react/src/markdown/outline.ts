/**
 * El índice de un Markdown: sus títulos, con los mismos `id` que les pone
 * NexMarkdown (slug del texto y sufijo `-n` en los repetidos, contando todos
 * los niveles). Sirve para navegar lo que alguien está escribiendo —por
 * ejemplo, las secciones de NexScroll— sin volver a pintar el documento.
 *
 * Lee títulos ATX (`#`… `######`) fuera de bloques de código cercados. El
 * texto se toma sin marcas en línea (énfasis, código, enlaces).
 */
import { slugify } from '@eclipsis/components';

export interface MarkdownHeading {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  /** `id` que tendrá el título al pintarlo con el mismo `idPrefix`. */
  id: string;
  /** Línea del título en la fuente (desde 1). */
  line: number;
}

const inline = (s: string) => s
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/`([^`]*)`/g, '$1')
  .replace(/(\*\*|__|\*|_|~~)(.+?)\1/g, '$2')
  .replace(/\s+#+\s*$/, '')
  .trim();

export function markdownOutline(source: string, idPrefix = ''): MarkdownHeading[] {
  const out: MarkdownHeading[] = [];
  const seen = new Map<string, number>();
  let fence: string | null = null;
  let mathBlock = false;
  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    const f = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (f) {
      if (!fence) fence = f[1]![0]!;
      else if (f[1]![0] === fence) fence = null;
      continue;
    }
    if (fence) continue;
    // Bloques de fórmula `$$` en su propia línea: su contenido no son títulos.
    if (/^\s{0,3}\$\$\s*$/.test(line)) { mathBlock = !mathBlock; continue; }
    if (mathBlock) continue;
    const m = /^\s{0,3}(#{1,6})\s+(.*)$/.exec(line);
    if (!m) continue;
    const text = inline(m[2]!);
    const base = slugify(text) || 'seccion';
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.push({ level: m[1]!.length as MarkdownHeading['level'], text, id: `${idPrefix}${n ? `${base}-${n}` : base}`, line: index + 1 });
  }
  return out;
}
