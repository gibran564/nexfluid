'use client';

/**
 * NexInk para Markdown: los comandos y dos adaptadores.
 *
 * - `applyMarkdownCommand` / `markdownCommandState`: puros, sobre TEXTO y
 *   offsets. Alternan: negrita sobre algo ya en negrita la quita. Sólo tocan
 *   delimitadores que reconocen; lo demás queda igual (fallo seguro).
 * - `createTextareaInkAdapter`: un `<textarea>` con la fuente. Cada comando
 *   es UNA edición mínima aplicada con `insertText`, así que entra en el
 *   deshacer nativo del campo (Ctrl+Z la revierte de una vez).
 * - `createRichTextInkAdapter`: el editor visual de NexMarkdownField
 *   (`contenteditable` construido por `renderRichText`). Usa los comandos
 *   del navegador, que también entran en su deshacer, y lee el estado de
 *   cada formato recorriendo los nodos de texto del rango (activo, mixto o
 *   inactivo). Las islas (`contenteditable=false`) no se tocan.
 */
import { safeUrl } from '@nexfluid/components';
import type { NexInkAdapter, NexInkCommand, NexInkSelection, NexInkState } from '../ink.tsx';
import type { NexVirtualAnchor } from '../anchored.ts';

export type MarkdownInkCommand = 'bold' | 'italic' | 'strike' | 'code' | 'link' | 'heading' | 'list' | 'ordered' | 'quote';

const glyph = (text: string, tag: 'b' | 'i' | 's' | 'code' | 'span' = 'span') => {
  const Tag = tag;
  return <Tag className="nx-ink__glyph" aria-hidden="true">{text}</Tag>;
};

/** Comandos por defecto, en español. Una aplicación puede traducirlos o reordenarlos. */
export const MARKDOWN_INK_COMMANDS: readonly NexInkCommand<MarkdownInkCommand>[] = [
  { id: 'bold', label: 'Negrita', icon: glyph('B', 'b'), shortcut: 'Mod+B' },
  { id: 'italic', label: 'Cursiva', icon: glyph('I', 'i'), shortcut: 'Mod+I' },
  { id: 'code', label: 'Código en línea', icon: glyph('</>', 'code'), shortcut: 'Mod+E' },
  { id: 'link', label: 'Enlace', icon: glyph('↗'), shortcut: 'Mod+K', input: { label: 'Dirección del enlace', placeholder: 'https://' } },
  { id: 'strike', label: 'Tachado', icon: glyph('S', 's'), shortcut: 'Mod+Shift+X', tier: 'more' },
  { id: 'heading', label: 'Título', icon: glyph('H'), tier: 'more' },
  { id: 'list', label: 'Lista', icon: glyph('•'), tier: 'more' },
  { id: 'ordered', label: 'Lista numerada', icon: glyph('1.'), tier: 'more' },
  { id: 'quote', label: 'Cita', icon: glyph('“'), tier: 'more' },
];

// ---- Texto: puro ------------------------------------------------------------------

const MARKER: Partial<Record<MarkdownInkCommand, string>> = { bold: '**', italic: '*', strike: '~~', code: '`' };
const LINE: Partial<Record<MarkdownInkCommand, RegExp>> = {
  heading: /^#{1,6}\s+/, list: /^[-*+]\s+(?!\[[ xX]\]\s)/, ordered: /^\d+[.)]\s+/, quote: /^>\s?/,
};

/** Asteriscos seguidos que terminan en `i` (hacia atrás) o empiezan en `i` (hacia delante). */
const run = (text: string, i: number, dir: -1 | 1, ch: string) => {
  let n = 0;
  for (let k = dir < 0 ? i - 1 : i; k >= 0 && k < text.length && text[k] === ch; k += dir) n++;
  return n;
};

/** ¿Los delimitadores de `command` rodean la selección (por fuera o por dentro)? */
function wrapped(text: string, start: number, end: number, command: MarkdownInkCommand): 'outside' | 'inside' | null {
  const m = MARKER[command];
  if (!m) return null;
  if (m === '*' || m === '**') {
    // `*` cursiva, `**` negrita, `***` las dos.
    const want = (n: number) => (m === '**' ? n >= 2 : n === 1 || n === 3);
    const before = run(text, start, -1, '*');
    const after = run(text, end, 1, '*');
    if (want(before) && want(after)) return 'outside';
    const sel = text.slice(start, end);
    const lead = run(sel, 0, 1, '*');
    const tail = run(sel, sel.length, -1, '*');
    if (sel.length > m.length * 2 && want(lead) && want(tail)) return 'inside';
    return null;
  }
  if (text.slice(start - m.length, start) === m && text.slice(end, end + m.length) === m) return 'outside';
  const sel = text.slice(start, end);
  if (sel.length > m.length * 2 && sel.startsWith(m) && sel.endsWith(m)) return 'inside';
  return null;
}

const lineRange = (text: string, start: number, end: number) => {
  const from = text.lastIndexOf('\n', start - 1) + 1;
  const nl = text.indexOf('\n', Math.max(start, end - (end > start && text[end - 1] === '\n' ? 1 : 0)));
  return { from, to: nl < 0 ? text.length : nl };
};

/** Estado de un comando sobre la selección [start, end) de `text`. */
export function markdownCommandState(text: string, start: number, end: number, command: MarkdownInkCommand): NexInkState {
  const line = LINE[command];
  if (line) {
    const { from, to } = lineRange(text, start, end);
    const lines = text.slice(from, to).split('\n').filter((l) => l.trim() !== '');
    const hits = lines.filter((l) => line.test(l)).length;
    return hits === 0 ? false : hits === lines.length ? true : 'mixed';
  }
  if (command === 'link') return text[start - 1] === '[' && /^\]\([^)\s]*\)/.test(text.slice(end));
  return wrapped(text, start, end, command) !== null;
}

/**
 * Aplica (o quita) un formato Markdown a la selección de un texto. Pura:
 * devuelve el texto y la selección nuevos.
 */
export function applyMarkdownCommand(text: string, start: number, end: number, command: MarkdownInkCommand, url = ''): { text: string; start: number; end: number } {
  const sel = text.slice(start, end);
  const marker = MARKER[command];
  if (marker) {
    const where = wrapped(text, start, end, command);
    const k = marker.length;
    if (where === 'outside') return { text: text.slice(0, start - k) + sel + text.slice(end + k), start: start - k, end: end - k };
    if (where === 'inside') { const inner = sel.slice(k, sel.length - k); return { text: text.slice(0, start) + inner + text.slice(end), start, end: start + inner.length }; }
    return { text: text.slice(0, start) + marker + sel + marker + text.slice(end), start: start + k, end: end + k };
  }
  if (command === 'link') {
    if (markdownCommandState(text, start, end, 'link') === true) {
      const close = /^\]\([^)\s]*\)/.exec(text.slice(end))![0].length;
      return { text: text.slice(0, start - 1) + sel + text.slice(end + close), start: start - 1, end: end - 1 };
    }
    const safe = safeUrl(url) ?? 'https://';
    return { text: `${text.slice(0, start)}[${sel}](${safe})${text.slice(end)}`, start: start + 1, end: end + 1 };
  }
  const pattern = LINE[command]!;
  const { from, to } = lineRange(text, start, end);
  const lines = text.slice(from, to).split('\n');
  const on = markdownCommandState(text, start, end, command) === true;
  const strip = (l: string) => l.replace(pattern, '');
  let n = 0;
  const next = lines.map((l) => {
    if (l.trim() === '') return l;
    if (on) return strip(l);
    // Las listas se excluyen entre sí; el título sustituye a otro nivel.
    const base = command === 'list' || command === 'ordered' ? l.replace(LINE.list!, '').replace(LINE.ordered!, '') : command === 'heading' ? strip(l) : l;
    const prefix = command === 'heading' ? '## ' : command === 'list' ? '- ' : command === 'ordered' ? `${++n}. ` : '> ';
    return pattern.test(l) && command === 'quote' ? l : prefix + base;
  }).join('\n');
  return { text: text.slice(0, from) + next + text.slice(to), start: from, end: from + next.length };
}

// ---- Medir la selección de un textarea --------------------------------------------

const MIRRORED = [
  'boxSizing', 'width', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'lineHeight', 'fontFamily', 'textAlign', 'textTransform', 'textIndent', 'letterSpacing', 'wordSpacing', 'tabSize', 'direction',
] as const;

/** Rectángulo (viewport) del texto [start, end) de un textarea, con un espejo fuera de pantalla. */
export function textareaSelectionRect(area: HTMLTextAreaElement, start: number, end: number) {
  const doc = area.ownerDocument;
  const mirror = doc.createElement('div');
  const style = getComputedStyle(area);
  for (const p of MIRRORED) mirror.style[p] = style[p];
  Object.assign(mirror.style, { position: 'absolute', visibility: 'hidden', top: '0', left: '-9999px', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', overflow: 'hidden', height: 'auto' });
  mirror.textContent = area.value.slice(0, start);
  const mark = doc.createElement('span');
  mark.textContent = area.value.slice(start, end) || '​';
  mirror.append(mark);
  doc.body.append(mirror);
  const box = area.getBoundingClientRect();
  const rects = [...mark.getClientRects()];
  const first = rects[0] ?? mark.getBoundingClientRect();
  const m = mirror.getBoundingClientRect();
  // Sólo la primera línea: la barra se ancla donde empieza lo seleccionado.
  const sameLine = rects.filter((r) => Math.abs(r.top - first.top) < 1);
  const right = Math.max(...sameLine.map((r) => r.right), first.right);
  mirror.remove();
  const left = box.left + (first.left - m.left) - area.scrollLeft;
  const top = box.top + (first.top - m.top) - area.scrollTop;
  return { left, top, width: right - first.left, height: first.height };
}

// ---- Adaptador: textarea ------------------------------------------------------------

/** Aplica una edición como `insertText` (entra en el deshacer); si no se puede, `setRangeText` + `input`. */
function replaceRange(area: HTMLTextAreaElement, from: number, to: number, insert: string) {
  area.focus({ preventScroll: true });
  area.setSelectionRange(from, to);
  const ok = typeof document.execCommand === 'function' && insert !== '' && document.execCommand('insertText', false, insert);
  if (ok && area.value.slice(from, from + insert.length) === insert) return;
  if (!ok && insert === '' && from !== to && typeof document.execCommand === 'function' && document.execCommand('delete', false) && area.value.length) return;
  area.setRangeText(insert, from, to, 'end');
  area.dispatchEvent(new Event('input', { bubbles: true }));
}

export function createTextareaInkAdapter(area: HTMLTextAreaElement): NexInkAdapter<MarkdownInkCommand> {
  let cache: { key: string; anchor: NexVirtualAnchor } | null = null;
  return {
    element: () => area,
    selection(): NexInkSelection | null {
      if (!area.isConnected || area.ownerDocument.activeElement !== area) return null;
      const { selectionStart: s, selectionEnd: e } = area;
      const key = `${s}:${e}:${area.value.length}`;
      if (cache?.key !== key) cache = { key, anchor: { getBoundingClientRect: () => textareaSelectionRect(area, area.selectionStart, area.selectionEnd), contextElement: area } };
      return { collapsed: s === e, anchor: cache.anchor };
    },
    state: (command) => markdownCommandState(area.value, area.selectionStart, area.selectionEnd, command),
    enabled: () => !area.readOnly && !area.disabled,
    run(command, value) {
      const before = area.value;
      const next = applyMarkdownCommand(before, area.selectionStart, area.selectionEnd, command, value);
      // Edición mínima: lo que cambia entre el prefijo y el sufijo comunes.
      let a = 0;
      while (a < before.length && a < next.text.length && before[a] === next.text[a]) a++;
      let b = 0;
      while (b < before.length - a && b < next.text.length - a && before[before.length - 1 - b] === next.text[next.text.length - 1 - b]) b++;
      replaceRange(area, a, before.length - b, next.text.slice(a, next.text.length - b));
      area.setSelectionRange(next.start, next.end);
    },
    bookmark: () => ({ start: area.selectionStart, end: area.selectionEnd, dir: area.selectionDirection }),
    restore(mark) {
      const m = mark as { start: number; end: number; dir: 'forward' | 'backward' | 'none' } | null;
      area.focus({ preventScroll: true });
      if (m) area.setSelectionRange(m.start, m.end, m.dir);
    },
    subscribe(listener) {
      const events = ['select', 'input', 'keyup', 'pointerup', 'focus', 'blur', 'scroll'] as const;
      const onSelection = () => { if (area.ownerDocument.activeElement === area) listener(); };
      events.forEach((e) => area.addEventListener(e, listener));
      area.ownerDocument.addEventListener('selectionchange', onSelection);
      return () => {
        events.forEach((e) => area.removeEventListener(e, listener));
        area.ownerDocument.removeEventListener('selectionchange', onSelection);
      };
    },
  };
}

// ---- Adaptador: editor visual (contenteditable) --------------------------------------

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const INLINE_TAGS: Partial<Record<MarkdownInkCommand, string[]>> = {
  bold: ['STRONG', 'B'], italic: ['EM', 'I'], strike: ['DEL', 'S', 'STRIKE'], code: ['CODE'], link: ['A'],
};
const BLOCK_TAGS: Partial<Record<MarkdownInkCommand, (el: Element) => boolean>> = {
  heading: (el) => /^H[1-6]$/.test(el.tagName),
  list: (el) => el.tagName === 'UL',
  ordered: (el) => el.tagName === 'OL',
  quote: (el) => el.tagName === 'BLOCKQUOTE',
};

export interface RichTextInkOptions {
  /** Tras un comando: la aplicación vuelve a serializar a Markdown. */
  onChange?: () => void;
}

export function createRichTextInkAdapter(root: HTMLElement, { onChange }: RichTextInkOptions = {}): NexInkAdapter<MarkdownInkCommand> {
  const doc = root.ownerDocument;
  let cache: { range: Range; anchor: NexVirtualAnchor } | null = null;
  const current = (): Range | null => {
    const sel = doc.getSelection();
    if (!sel?.rangeCount) return null;
    const r = sel.getRangeAt(0);
    return root.contains(r.commonAncestorContainer) ? r : null;
  };
  const closest = (node: Node | null, test: (el: Element) => boolean): Element | null => {
    for (let n: Node | null = node; n && n !== root; n = n.parentNode) if (n instanceof Element && test(n)) return n;
    return null;
  };
  const textNodes = (range: Range): Text[] => {
    const out: Text[] = [];
    const walker = doc.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) return [range.commonAncestorContainer as Text];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (range.intersectsNode(n) && (n.textContent ?? '').trim() !== '' && !closest(n, (e) => e.getAttribute('contenteditable') === 'false')) out.push(n as Text);
    }
    return out;
  };
  const stateOf = (command: MarkdownInkCommand, range: Range): NexInkState => {
    const tags = INLINE_TAGS[command];
    const block = BLOCK_TAGS[command];
    const test = tags ? (el: Element) => tags.includes(el.tagName) : block!;
    if (range.collapsed) return Boolean(closest(range.startContainer, test));
    const nodes = textNodes(range);
    if (!nodes.length) return Boolean(closest(range.startContainer, test));
    const hits = nodes.filter((n) => closest(n, test)).length;
    return hits === 0 ? false : hits === nodes.length ? true : 'mixed';
  };
  const exec = (command: string, value?: string) => typeof doc.execCommand === 'function' && doc.execCommand(command, false, value);

  return {
    element: () => root,
    selection(): NexInkSelection | null {
      const r = current();
      if (!r || !root.contains(doc.activeElement)) return null;
      const same = cache && cache.range.startContainer === r.startContainer && cache.range.startOffset === r.startOffset
        && cache.range.endContainer === r.endContainer && cache.range.endOffset === r.endOffset;
      if (!same) {
        const range = r.cloneRange();
        cache = {
          range,
          anchor: {
            contextElement: root,
            getBoundingClientRect: () => {
              const rect = range.getBoundingClientRect();
              if (rect.width || rect.height) return rect;
              return range.getClientRects()[0] ?? (range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement ?? root).getBoundingClientRect();
            },
          },
        };
      }
      return { collapsed: r.collapsed, anchor: cache!.anchor };
    },
    state(command) {
      const r = current();
      return r ? stateOf(command, r) : false;
    },
    enabled: () => root.isContentEditable,
    run(command, value) {
      const r = current();
      if (!r) return;
      const on = stateOf(command, r) === true;
      switch (command) {
        case 'bold': exec('bold'); break;
        case 'italic': exec('italic'); break;
        case 'strike': exec('strikeThrough'); break;
        case 'code': {
          // Por el deshacer del navegador: insertar HTML ESCAPADO, nunca mutar el DOM a mano.
          const code = closest(r.commonAncestorContainer, (e) => e.tagName === 'CODE');
          if (on && code) {
            const range = doc.createRange();
            range.selectNode(code);
            const sel = doc.getSelection()!;
            sel.removeAllRanges();
            sel.addRange(range);
            exec('insertText', code.textContent ?? '');
          } else if (!r.collapsed) {
            exec('insertHTML', `<code>${escapeHtml(r.toString())}</code>`);
          }
          break;
        }
        case 'link': {
          if (on && !value) { exec('unlink'); break; }
          const safe = safeUrl(value ?? '');
          if (safe) exec('createLink', safe);
          break;
        }
        case 'heading': exec('formatBlock', on ? 'p' : 'h2'); break;
        case 'list': exec('insertUnorderedList'); break;
        case 'ordered': exec('insertOrderedList'); break;
        case 'quote': if (on) exec('outdent'); else exec('formatBlock', 'blockquote'); break;
      }
      onChange?.();
    },
    bookmark: () => current()?.cloneRange() ?? null,
    restore(mark) {
      root.focus({ preventScroll: true });
      if (!(mark instanceof Range)) return;
      const sel = doc.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(mark);
    },
    subscribe(listener) {
      const onSelection = () => { if (root.contains(doc.activeElement)) listener(); };
      doc.addEventListener('selectionchange', onSelection);
      root.addEventListener('input', listener);
      root.addEventListener('focusin', listener);
      root.addEventListener('focusout', listener);
      return () => {
        doc.removeEventListener('selectionchange', onSelection);
        root.removeEventListener('input', listener);
        root.removeEventListener('focusin', listener);
        root.removeEventListener('focusout', listener);
      };
    },
  };
}
