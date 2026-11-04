/**
 * Markdown ⇄ DOM editable, para la edición VISUAL de NexMarkdownField.
 *
 * Regla: nada se pierde. Sólo se vuelve editable lo que va y vuelve sin
 * cambiar: títulos, párrafos, citas, listas simples, separadores y, en
 * línea, negrita, cursiva, tachado, código y enlaces seguros. Cualquier otro
 * bloque —tablas, código, fórmulas, avisos, imágenes, HTML, listas anidadas o
 * de tareas— es una ISLA: se pinta tal cual (NexMarkdown) y guarda su fuente
 * exacta en `data-md`.
 *
 * Se construye el DOM con `createElement`/`textContent`, nunca con HTML en
 * texto: el contenido no confiable no puede inyectar marcado.
 */
import { safeUrl } from '@eclipsis/components';

export interface RichIsland { element: HTMLElement; source: string }

const ESC = 0xe000;
/** `\*` → un carácter privado; así el analizador no lo confunde con sintaxis. */
const hide = (text: string) => text.replace(/\\([\\`*_[\]~#>+\-.!()|])/g, (_, c: string) => String.fromCharCode(ESC + c.charCodeAt(0)));
const show = (text: string) => text.replace(/[-]/g, (c) => String.fromCharCode(c.charCodeAt(0) - ESC));

const INLINE: ReadonlyArray<{ re: RegExp; make: (m: RegExpExecArray, doc: Document) => Node | null }> = [
  { re: /`([^`]+)`/, make: (m, d) => { const n = d.createElement('code'); n.textContent = show(m[1]!); return n; } },
  {
    re: /\[([^\]]+)\]\(([^)\s]+)\)/,
    make: (m, d) => {
      const url = safeUrl(show(m[2]!));
      if (!url) return null;
      const a = d.createElement('a');
      a.setAttribute('href', url);
      a.append(...inline(m[1]!, d));
      return a;
    },
  },
  { re: /\*\*(.+?)\*\*|__(.+?)__/, make: (m, d) => wrap('strong', m[1] ?? m[2]!, d) },
  { re: /~~(.+?)~~/, make: (m, d) => wrap('del', m[1]!, d) },
  { re: /\*(?![\s*])(.+?)\*|(?<![A-Za-z0-9])_(?![\s_])(.+?)_(?![A-Za-z0-9])/, make: (m, d) => wrap('em', m[1] ?? m[2]!, d) },
];

function wrap(tag: string, text: string, doc: Document): Node {
  const n = doc.createElement(tag);
  n.append(...inline(text, doc));
  return n;
}

function inline(text: string, doc: Document): Node[] {
  const out: Node[] = [];
  let rest = text;
  while (rest) {
    let best: { m: RegExpExecArray; make: (typeof INLINE)[number]['make'] } | null = null;
    for (const rule of INLINE) {
      const m = rule.re.exec(rest);
      if (m && (!best || m.index < best.m.index)) best = { m, make: rule.make };
    }
    if (!best) { out.push(doc.createTextNode(show(rest))); break; }
    if (best.m.index) out.push(doc.createTextNode(show(rest.slice(0, best.m.index))));
    out.push(best.make(best.m, doc) ?? doc.createTextNode(show(best.m[0])));
    rest = rest.slice(best.m.index + best.m[0].length);
  }
  return out;
}

/** Texto en línea que la edición visual no sabría devolver igual. */
const UNSAFE_INLINE = /!\[|<[a-zA-Z/!]|\[\^|\$|\]\[|^\s*\[[^\]]+\]:/;
const unsafeLinks = (text: string) => [...text.matchAll(/\]\(([^)\s]+)\)/g)].some((m) => !safeUrl(show(m[1]!)));
const editableInline = (text: string) => !UNSAFE_INLINE.test(text) && !unsafeLinks(text);

/** Bloques de la fuente: separados por líneas en blanco, sin partir código cercado ni `$$`. */
export function markdownBlocks(source: string): string[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;
  const flush = () => { if (current.length) blocks.push(current.join('\n')); current = []; };
  for (const line of lines) {
    const opener = /^\s*(```+|~~~+|\$\$)/.exec(line)?.[1];
    if (fence) {
      current.push(line);
      if (opener && opener.startsWith(fence.slice(0, 2)) && line.trim().startsWith(fence)) { fence = null; flush(); }
      continue;
    }
    if (opener && !(opener === '$$' && line.trim().length > 2 && line.trim().endsWith('$$'))) { flush(); fence = opener; current.push(line); continue; }
    if (line.trim() === '') { flush(); continue; }
    current.push(line);
  }
  flush();
  return blocks;
}

/** Construye el DOM editable de `source` dentro de `root`. Devuelve las islas para pintarlas. */
export function renderRichText(root: HTMLElement, source: string): RichIsland[] {
  const doc = root.ownerDocument;
  root.replaceChildren();
  const islands: RichIsland[] = [];
  const island = (md: string) => {
    const el = doc.createElement('div');
    el.className = 'nx-md-field__island';
    el.contentEditable = 'false';
    el.dataset.md = md;
    root.append(el);
    islands.push({ element: el, source: md });
  };
  const sources = new Map<Node, string>();
  for (const block of markdownBlocks(source)) {
    const before = root.lastChild;
    const raw = hide(block);
    const lines = raw.split('\n');
    const heading = /^(#{1,6})\s+(.*)$/.exec(raw);
    if (heading && lines.length === 1 && editableInline(heading[2]!)) {
      const h = doc.createElement(`h${heading[1]!.length}`);
      h.append(...inline(heading[2]!, doc));
      root.append(h);
    } else if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(raw) && lines.length === 1) {
      root.append(doc.createElement('hr'));
    } else if (lines.every((l) => /^>\s?/.test(l)) && !/^>\s*\[!/.test(raw) && lines.every((l) => editableInline(l.replace(/^>\s?/, '')))) {
      const q = doc.createElement('blockquote');
      const p = doc.createElement('p');
      lines.forEach((l, i) => { if (i) p.append(doc.createElement('br')); p.append(...inline(l.replace(/^>\s?/, ''), doc)); });
      q.append(p);
      root.append(q);
    } else if (lines.every((l) => /^[-*+]\s+(?!\[[ xX]\]\s)/.test(l) && editableInline(l.replace(/^[-*+]\s+/, '')))) {
      const ul = doc.createElement('ul');
      for (const l of lines) { const li = doc.createElement('li'); li.append(...inline(l.replace(/^[-*+]\s+/, ''), doc)); ul.append(li); }
      root.append(ul);
    } else if (lines.every((l, i) => l.startsWith(`${i + 1}.`) && /^\d+\.\s+/.test(l) && editableInline(l.replace(/^\d+\.\s+/, '')))) {
      // Sólo 1., 2., 3.…: otra numeración se renumeraría al guardar.
      const ol = doc.createElement('ol');
      for (const l of lines) { const li = doc.createElement('li'); li.append(...inline(l.replace(/^\d+[.)]\s+/, ''), doc)); ol.append(li); }
      root.append(ol);
    } else if (!/^\s*([#>|`~$<]|[-*+]\s|\d+[.)]\s|\s{4})/.test(raw) && lines.every((l) => !/^\s*\|/.test(l) && editableInline(l))) {
      const p = doc.createElement('p');
      lines.forEach((l, i) => { if (i) p.append(doc.createElement('br')); p.append(...inline(l, doc)); });
      root.append(p);
    } else {
      island(block);
    }
    if (root.lastChild && root.lastChild !== before) sources.set(root.lastChild, block);
  }
  // Cada bloque editable recuerda su fuente y su forma: si nadie lo toca, vuelve tal cual
  // (`__x__` sigue siendo `__x__`, no `**x**`).
  for (const [node, block] of sources) {
    if (!(node instanceof HTMLElement) || node.dataset.md !== undefined) continue;
    node.dataset.src = block;
    node.dataset.sig = blockMd(node) ?? '';
  }
  return islands;
}

/** Escapa lo que el texto escrito tiene de sintaxis Markdown. */
const escapeText = (text: string) => text.replace(/([\\`*_[\]~])/g, '\\$1').replace(/ /g, ' ');

function inlineMd(node: Node): string {
  let out = '';
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) { out += escapeText(child.textContent ?? ''); return; }
    if (!(child instanceof HTMLElement)) return;
    const inner = inlineMd(child);
    switch (child.tagName) {
      case 'STRONG': case 'B': out += inner.trim() ? `**${inner}**` : inner; break;
      case 'EM': case 'I': out += inner.trim() ? `*${inner}*` : inner; break;
      case 'DEL': case 'S': case 'STRIKE': out += inner.trim() ? `~~${inner}~~` : inner; break;
      case 'CODE': out += `\`${child.textContent ?? ''}\``; break;
      case 'A': { const url = safeUrl(child.getAttribute('href') ?? ''); out += url ? `[${inner}](${url})` : inner; break; }
      case 'BR': out += '\n'; break;
      default: out += inner;
    }
  });
  return out;
}

/** El Markdown de lo que hay ahora en `root`. */
export function richTextToMarkdown(root: HTMLElement): string {
  const blocks: string[] = [];
  const loose: Node[] = [];
  const flushLoose = () => {
    if (!loose.length) return;
    const holder = root.ownerDocument.createElement('p');
    loose.splice(0).forEach((n) => holder.append(n.cloneNode(true)));
    const text = inlineMd(holder).trim();
    if (text) blocks.push(text);
  };
  root.childNodes.forEach((node) => {
    if (!(node instanceof HTMLElement) || ['B', 'STRONG', 'EM', 'I', 'A', 'CODE', 'SPAN', 'BR', 'DEL', 'S'].includes(node.tagName)) {
      loose.push(node);
      return;
    }
    flushLoose();
    if (node.dataset.md !== undefined) { blocks.push(node.dataset.md); return; }
    const md = blockMd(node);
    if (md === null) return;
    blocks.push(node.dataset.sig !== undefined && node.dataset.sig === md ? node.dataset.src! : md);
  });
  flushLoose();
  return blocks.join('\n\n');
}

/** El Markdown de UN bloque editable; `null` si está vacío. */
function blockMd(node: HTMLElement): string | null {
  const tag = node.tagName;
  const text = () => inlineMd(node).replace(/\n+$/, '');
  if (/^H[1-6]$/.test(tag)) return `${'#'.repeat(Number(tag[1]))} ${text().replace(/\n/g, ' ')}`;
  if (tag === 'HR') return '---';
  if (tag === 'UL' || tag === 'OL') {
    const items = [...node.children].filter((li) => li.tagName === 'LI')
      .map((li, i) => `${tag === 'UL' ? '-' : `${i + 1}.`} ${inlineMd(li).replace(/\n+/g, ' ').trim()}`);
    return items.length ? items.join('\n') : null;
  }
  if (tag === 'BLOCKQUOTE') return inlineMd(node).replace(/\n+$/, '').split('\n').map((l) => `> ${l}`.trimEnd()).join('\n');
  if (tag === 'PRE') return `\`\`\`\n${node.textContent ?? ''}\n\`\`\``;
  const t = text();
  return t.trim() ? t : null;
}
