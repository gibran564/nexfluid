/**
 * Matemáticas en NexMarkdown: `$…$` en línea y `$$…$$` en bloque.
 *
 * Portado del Markdown de NexBook (Nextudio): `remark-math` 6 + `rehype-katex` 7
 * (KaTeX 0.16), los plugins oficiales del ecosistema unified para estas
 * versiones de `react-markdown`. KaTeX produce marcado que `rehype-katex`
 * convierte en árbol hast y React en elementos: no hay `dangerouslySetInnerHTML`
 * y el HTML que escriba la persona se sigue descartando (`skipHtml`).
 *
 * - `trust: false`: `\href`, `\url`, `\includegraphics`, `\html*` no producen
 *   enlaces, imágenes ni atributos.
 * - `maxExpand` y `maxSize` acotan macros recursivas y tamaños absurdos.
 * - Una fórmula que no se analiza no rompe el bloque: se enseña su fuente en
 *   color de error con el mensaje en `title`.
 * - «Cuesta $5 y luego $10» sigue siendo texto: la regla de Pandoc
 *   (`remarkMathDollarGuard`). Para un `$` literal que la cumpla, `\$`.
 *
 * Estilos: importa `katex/dist/katex.min.css` una vez en la aplicación.
 */
import type { Options as ReactMarkdownOptions } from 'react-markdown';
import rehypeKatex, { type Options as RehypeKatexOptions } from 'rehype-katex';
import remarkMath from 'remark-math';

export const MARKDOWN_MATH_KATEX_OPTIONS = {
  trust: false,
  strict: 'ignore',
  maxExpand: 1000,
  maxSize: 20,
  output: 'htmlAndMathml',
  errorColor: 'var(--nx-danger)',
} as const satisfies RehypeKatexOptions;

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}

/**
 * Devuelve a texto las fórmulas en línea de un solo `$` que no cumplen la regla
 * de Pandoc: sin espacio tras el `$` de apertura, sin espacio antes del de
 * cierre y sin dígito tras el de cierre. Recupera el texto ORIGINAL por posición.
 */
export function remarkMathDollarGuard() {
  return (tree: MdNode, file: { value?: unknown }) => {
    const source = String(file.value ?? '');
    const walk = (node: MdNode) => {
      const children = node.children;
      if (!children) return;
      for (let index = 0; index < children.length; index++) {
        const child = children[index]!;
        if (child.type === 'inlineMath') {
          const text = literalDollarText(child, source);
          if (text) children[index] = text;
        } else {
          walk(child);
        }
      }
    };
    walk(tree);
  };
}

function literalDollarText(node: MdNode, source: string): MdNode | null {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start === undefined || end === undefined) return null;
  const raw = source.slice(start, end);
  if (!raw.startsWith('$') || raw.startsWith('$$')) return null;
  const inner = raw.slice(1, -1);
  const valid = !/^\s/.test(inner) && !/\s$/.test(inner) && !/[0-9]/.test(source.charAt(end));
  return valid ? null : { type: 'text', value: raw, position: node.position };
}

type PluggableList = NonNullable<ReactMarkdownOptions['remarkPlugins']>;

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: { className?: unknown };
  children?: HastNode[];
}

const hastText = (node: HastNode): string => (node.type === 'text' ? node.value ?? '' : (node.children ?? []).map(hastText).join(''));
const hasClass = (node: HastNode, ...names: string[]) =>
  Array.isArray(node.properties?.className) && names.some((name) => (node.properties!.className as unknown[]).includes(name));

function mathDisplay(node: HastNode): boolean | null {
  if (node.type !== 'element') return null;
  if (node.tagName === 'pre' && node.children?.some((child) => child.tagName === 'code' && hasClass(child, 'language-math'))) return true;
  return hasClass(node, 'language-math', 'math-display', 'math-inline') ? hasClass(node, 'math-display') : null;
}

const KATEX_CACHE_LIMIT = 500;
const katexCache = new Map<string, HastNode[]>();
const clone = <T>(value: T): T => (typeof structuredClone === 'function' ? structuredClone(value) : (JSON.parse(JSON.stringify(value)) as T));

/**
 * `rehype-katex` con memoria por fuente TeX: el Markdown se procesa entero en
 * cada pulsación de un editor en vivo, y KaTeX es lo más caro. Cada fórmula se
 * pinta una vez con las mismas opciones y su árbol se reutiliza (copiado).
 */
export function rehypeKatexCached() {
  const render = rehypeKatex(MARKDOWN_MATH_KATEX_OPTIONS) as unknown as (tree: HastNode, file: unknown) => void;
  return (tree: HastNode, file: unknown) => {
    const walk = (parent: HastNode) => {
      const children = parent.children;
      if (!children) return;
      for (let index = 0; index < children.length; index += 1) {
        const child = children[index]!;
        const display = mathDisplay(child);
        if (display === null) {
          walk(child);
          continue;
        }
        const key = `${display ? 'bloque' : 'línea'}\n${hastText(child)}`;
        let painted = katexCache.get(key);
        if (painted) {
          katexCache.delete(key);
        } else {
          const holder: HastNode = { type: 'element', tagName: 'div', properties: {}, children: [child] };
          render({ type: 'root', children: [holder] }, file);
          painted = holder.children ?? [];
          if (katexCache.size >= KATEX_CACHE_LIMIT) katexCache.delete(katexCache.keys().next().value!);
        }
        katexCache.set(key, painted);
        const fresh = clone(painted);
        children.splice(index, 1, ...fresh);
        index += fresh.length - 1;
      }
    };
    walk(tree);
  };
}

export const MATH_REMARK_PLUGINS: PluggableList = [remarkMath, remarkMathDollarGuard];
export const MATH_REHYPE_PLUGINS: PluggableList = [rehypeKatexCached];
