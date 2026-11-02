'use client';

/**
 * NexMarkdownField: escribir Markdown sin verlo, o verlo cuando hace falta.
 *
 * - Visual: el texto se edita ya compuesto (títulos, listas, citas, negrita,
 *   enlaces…). Lo que la edición visual no sabría devolver igual —tablas,
 *   código, fórmulas, avisos, imágenes— queda como una isla intacta, pintada
 *   por NexMarkdown, que se edita en Markdown (doble clic).
 * - Markdown: la fuente, en un campo que crece con el texto.
 *
 * Divulgación progresiva: no hay barra fija. La barra de formato aparece al
 * seleccionar texto, y el cambio Visual/Markdown al enfocar el campo. Atajos:
 * Ctrl/⌘ + B, I, E (código), K (enlace).
 *
 * El valor es siempre Markdown; la aplicación lo guarda tal cual.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx, safeUrl } from '@eclipsis/components';
import { NexSegmented } from '../segmented.tsx';
import { NexMarkdown, type NexMarkdownProps } from './markdown.tsx';
import { renderRichText, richTextToMarkdown, type RichIsland } from './rich-text.ts';

export type NexMarkdownFieldMode = 'visual' | 'source';

export interface NexMarkdownFieldProps {
  value: string;
  onChange: (markdown: string) => void;
  /** Nombre accesible del campo. */
  label: string;
  mode?: NexMarkdownFieldMode;
  defaultMode?: NexMarkdownFieldMode;
  onModeChange?: (mode: NexMarkdownFieldMode) => void;
  /** Muestra el cambio Visual/Markdown al enfocar. Por defecto, sí. */
  modeSwitch?: boolean;
  placeholder?: string;
  /** Sólo lectura: el Markdown compuesto, sin edición. */
  readOnly?: boolean;
  /** Para las islas y la lectura. */
  markdown?: Omit<NexMarkdownProps, 'source'>;
  className?: string;
}

type Command = 'bold' | 'italic' | 'strike' | 'code' | 'link' | 'heading' | 'list' | 'quote';
const COMMANDS: ReadonlyArray<{ id: Command; label: string; glyph: ReactNode; keys?: string }> = [
  { id: 'bold', label: 'Negrita', glyph: <b>B</b>, keys: 'Control+B' },
  { id: 'italic', label: 'Cursiva', glyph: <i>I</i>, keys: 'Control+I' },
  { id: 'strike', label: 'Tachado', glyph: <s>S</s> },
  { id: 'code', label: 'Código', glyph: <code>{'</>'}</code>, keys: 'Control+E' },
  { id: 'link', label: 'Enlace', glyph: <span>↗</span>, keys: 'Control+K' },
  { id: 'heading', label: 'Título', glyph: <span>H</span> },
  { id: 'list', label: 'Lista', glyph: <span>•</span> },
  { id: 'quote', label: 'Cita', glyph: <span>“</span> },
];

/** Aplica un formato Markdown a la selección de un textarea. Pura: devuelve texto y selección nuevos. */
export function applyMarkdownCommand(text: string, start: number, end: number, command: Command, url = ''): { text: string; start: number; end: number } {
  const sel = text.slice(start, end);
  const wrap = (open: string, close = open) => ({ text: text.slice(0, start) + open + sel + close + text.slice(end), start: start + open.length, end: end + open.length });
  const linePrefix = (prefix: string) => {
    const from = text.lastIndexOf('\n', start - 1) + 1;
    const block = text.slice(from, end);
    const toggled = block.split('\n').every((l) => l.startsWith(prefix))
      ? block.split('\n').map((l) => l.slice(prefix.length)).join('\n')
      : block.split('\n').map((l) => prefix + l).join('\n');
    return { text: text.slice(0, from) + toggled + text.slice(end), start: from, end: from + toggled.length };
  };
  switch (command) {
    case 'bold': return wrap('**');
    case 'italic': return wrap('*');
    case 'strike': return wrap('~~');
    case 'code': return wrap('`');
    case 'link': return wrap('[', `](${url || 'https://'})`);
    case 'heading': return linePrefix('## ');
    case 'list': return linePrefix('- ');
    case 'quote': return linePrefix('> ');
  }
}

export function NexMarkdownField({
  value, onChange, label, mode: controlled, defaultMode = 'visual', onModeChange, modeSwitch = true, placeholder = 'Escribe…', readOnly, markdown, className,
}: NexMarkdownFieldProps) {
  const [inner, setInner] = useState<NexMarkdownFieldMode>(defaultMode);
  const mode = controlled ?? inner;
  const setMode = (next: NexMarkdownFieldMode) => { if (controlled === undefined) setInner(next); onModeChange?.(next); };
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const emitted = useRef<string | null>(null);
  const [islands, setIslands] = useState<RichIsland[]>([]);
  const [bar, setBar] = useState<{ x: number; y: number } | null>(null);
  const [linking, setLinking] = useState<string | null>(null);
  const savedRange = useRef<Range | null>(null);

  // Visual: se reconstruye sólo si el valor llega de fuera (no de lo que se acaba de escribir).
  useLayoutEffect(() => {
    if (mode !== 'visual' || readOnly || !editor.current) return;
    if (emitted.current === value && editor.current.childNodes.length) return;
    setIslands(renderRichText(editor.current, value));
    emitted.current = value;
  }, [mode, value, readOnly]);

  // Markdown: el campo crece con el texto.
  useLayoutEffect(() => {
    const el = area.current;
    if (mode !== 'source' || !el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [mode, value]);

  const emit = useCallback((md: string) => { emitted.current = md; onChange(md); }, [onChange]);
  const sync = () => { if (editor.current) emit(richTextToMarkdown(editor.current)); };

  // La barra de formato sigue a la selección mientras el campo tiene el foco.
  useEffect(() => {
    const onSelection = () => {
      const host = root.current;
      if (!host || !host.contains(document.activeElement)) { if (!linking) setBar(null); return; }
      const box = host.getBoundingClientRect();
      if (mode === 'source') {
        const el = area.current;
        if (el && document.activeElement === el && el.selectionEnd > el.selectionStart) setBar({ x: box.width / 2, y: 0 });
        else if (!linking) setBar(null);
        return;
      }
      const sel = getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount || !editor.current?.contains(sel.anchorNode)) { if (!linking) setBar(null); return; }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      setBar({ x: r.left + r.width / 2 - box.left, y: r.top - box.top });
    };
    document.addEventListener('selectionchange', onSelection);
    return () => document.removeEventListener('selectionchange', onSelection);
  }, [mode, linking]);

  const run = (command: Command, url?: string) => {
    if (mode === 'source') {
      const el = area.current;
      if (!el) return;
      const next = applyMarkdownCommand(el.value, el.selectionStart, el.selectionEnd, command, url);
      emit(next.text);
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(next.start, next.end); });
      return;
    }
    editor.current?.focus();
    if (savedRange.current) { const sel = getSelection(); sel?.removeAllRanges(); sel?.addRange(savedRange.current); savedRange.current = null; }
    const exec = (c: string, v?: string) => document.execCommand?.(c, false, v);
    switch (command) {
      case 'bold': exec('bold'); break;
      case 'italic': exec('italic'); break;
      case 'strike': exec('strikeThrough'); break;
      case 'code': {
        const sel = getSelection();
        if (sel?.rangeCount) { const code = document.createElement('code'); const r = sel.getRangeAt(0); code.append(r.extractContents()); r.insertNode(code); }
        break;
      }
      case 'link': { const safe = safeUrl(url ?? ''); if (safe) exec('createLink', safe); break; }
      case 'heading': exec('formatBlock', 'h2'); break;
      case 'list': exec('insertUnorderedList'); break;
      case 'quote': exec('formatBlock', 'blockquote'); break;
    }
    sync();
  };

  const startLink = () => {
    const sel = getSelection();
    if (mode === 'visual' && sel?.rangeCount) savedRange.current = sel.getRangeAt(0).cloneRange();
    setLinking('');
  };

  const shortcuts = (event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const k = event.key.toLowerCase();
    const command = k === 'b' ? 'bold' : k === 'i' ? 'italic' : k === 'e' ? 'code' : k === 'k' ? 'link' : null;
    if (!command) return;
    event.preventDefault();
    if (command === 'link') startLink(); else run(command);
  };

  if (readOnly) return <div className={cx('nx-md-field', className)} data-readonly=""><NexMarkdown {...markdown} source={value} /></div>;

  return (
    <div ref={root} className={cx('nx-md-field', className)} data-mode={mode}>
      {mode === 'visual' ? (
        <div
          ref={editor}
          id={id}
          className="nx-md-field__visual nx-markdown"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          data-placeholder={placeholder}
          data-nx-empty={value.trim() === '' ? '' : undefined}
          onInput={sync}
          onKeyDown={shortcuts}
          onPaste={(e) => { e.preventDefault(); document.execCommand?.('insertText', false, e.clipboardData.getData('text/plain')); sync(); }}
          onDoubleClick={(e) => { if ((e.target as Element).closest('.nx-md-field__island')) setMode('source'); }}
        />
      ) : (
        <textarea
          ref={area}
          id={id}
          className="nx-md-field__source"
          aria-label={`${label} (Markdown)`}
          value={value}
          placeholder={placeholder}
          spellCheck
          rows={3}
          onChange={(e) => emit(e.target.value)}
          onKeyDown={shortcuts}
        />
      )}
      {islands.map((island, i) => island.element.isConnected && createPortal(
        <div title="Doble clic para editar en Markdown"><NexMarkdown {...markdown} source={island.source} /></div>,
        island.element,
        `${i}:${island.source.length}`,
      ))}
      {bar && (
        <div className="nx-md-field__bar" role="toolbar" aria-label="Formato" style={{ left: bar.x, top: bar.y }}
          onPointerDown={(e) => { if (!(e.target as Element).closest('input')) e.preventDefault(); }}>
          {linking === null ? COMMANDS.map((c) => (
            <button key={c.id} type="button" className="nx-md-field__cmd" aria-label={c.label} title={c.label} aria-keyshortcuts={c.keys}
              onClick={() => (c.id === 'link' ? startLink() : run(c.id))}>{c.glyph}</button>
          )) : (
            <form className="nx-md-field__link" onSubmit={(e) => { e.preventDefault(); run('link', linking); setLinking(null); }}>
              <input autoFocus aria-label="Dirección del enlace" placeholder="https://" value={linking} onChange={(e) => setLinking(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setLinking(null); } }} />
            </form>
          )}
        </div>
      )}
      {modeSwitch && (
        <NexSegmented className="nx-md-field__mode" aria-label={`Edición de ${label}`} density="compact" value={mode}
          onValueChange={(v) => { setBar(null); setLinking(null); setMode(v as NexMarkdownFieldMode); }}
          options={[{ value: 'visual', label: 'Visual' }, { value: 'source', label: 'Markdown' }]} />
      )}
    </div>
  );
}
