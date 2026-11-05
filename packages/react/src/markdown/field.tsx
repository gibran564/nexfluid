'use client';

/**
 * NexMarkdownField: escribir Markdown sin verlo, o verlo cuando hace falta.
 *
 * Tres perspectivas sobre el MISMO valor (siempre Markdown):
 * - Visual: el texto se edita ya compuesto (títulos, listas, citas, negrita,
 *   enlaces…). Lo que la edición visual no sabría devolver igual —tablas,
 *   código, fórmulas, avisos, imágenes— queda como una isla intacta, pintada
 *   por NexMarkdown, que se edita en Markdown (doble clic).
 * - Markdown: la fuente, en un campo que crece con el texto.
 * - Vista: la lectura final, sin herramientas.
 *
 * Divulgación progresiva: no hay barra fija. NexInk aparece al seleccionar
 * texto (Alt+F10 la alcanza con teclado), y el cambio de perspectiva al
 * enfocar el campo. Atajos: Ctrl/⌘ + B, I, E (código), K (enlace).
 *
 * Deshacer: dentro de cada perspectiva, el del navegador (cada comando es
 * una parada). Cambiar de perspectiva conserva el VALOR byte a byte, no la
 * pila de deshacer: cada editor nativo tiene la suya.
 */
import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@nexfluid/components';
import { NexSegmented } from '../segmented.tsx';
import { NexInk, type NexInkAdapter, type NexInkCommand } from '../ink.tsx';
import { NexMarkdown, type NexMarkdownProps } from './markdown.tsx';
import { renderRichText, richTextToMarkdown, type RichIsland } from './rich-text.ts';
import { MARKDOWN_INK_COMMANDS, createRichTextInkAdapter, createTextareaInkAdapter, type MarkdownInkCommand } from './ink.tsx';

export { applyMarkdownCommand } from './ink.tsx';

export type NexMarkdownFieldMode = 'visual' | 'source' | 'view';

export interface NexMarkdownFieldProps {
  value: string;
  onChange: (markdown: string) => void;
  /** Nombre accesible del campo. */
  label: string;
  mode?: NexMarkdownFieldMode;
  defaultMode?: NexMarkdownFieldMode;
  onModeChange?: (mode: NexMarkdownFieldMode) => void;
  /** Muestra el cambio de perspectiva al enfocar. Por defecto, sí. */
  modeSwitch?: boolean;
  placeholder?: string;
  /** Sólo lectura: el Markdown compuesto, sin edición ni cambio de perspectiva. */
  readOnly?: boolean;
  /** Comandos de NexInk (por defecto, MARKDOWN_INK_COMMANDS). */
  commands?: readonly NexInkCommand<MarkdownInkCommand>[];
  /** Para las islas y la lectura. */
  markdown?: Omit<NexMarkdownProps, 'source'>;
  className?: string;
}

export function NexMarkdownField({
  value, onChange, label, mode: controlled, defaultMode = 'visual', onModeChange, modeSwitch = true, placeholder = 'Escribe…', readOnly,
  commands = MARKDOWN_INK_COMMANDS, markdown, className,
}: NexMarkdownFieldProps) {
  const [inner, setInner] = useState<NexMarkdownFieldMode>(defaultMode);
  const mode = controlled ?? inner;
  const setMode = (next: NexMarkdownFieldMode) => { if (controlled === undefined) setInner(next); onModeChange?.(next); };
  const id = useId();
  const editor = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const emitted = useRef<string | null>(null);
  const [islands, setIslands] = useState<RichIsland[]>([]);
  const [adapter, setAdapter] = useState<NexInkAdapter<MarkdownInkCommand> | null>(null);

  const emit = useCallback((md: string) => { emitted.current = md; onChange(md); }, [onChange]);
  const sync = useCallback(() => { if (editor.current) emit(richTextToMarkdown(editor.current)); }, [emit]);
  const syncRef = useRef(sync);
  syncRef.current = sync;

  // Visual: se reconstruye sólo si el valor llega de fuera (no de lo que se acaba de escribir).
  useLayoutEffect(() => {
    if (mode !== 'visual' || readOnly || !editor.current) return;
    if (emitted.current === value && editor.current.childNodes.length) return;
    setIslands(renderRichText(editor.current, value));
    emitted.current = value;
  }, [mode, value, readOnly]);

  // Un adaptador por editor montado: NexInk no sabe cuál es.
  useLayoutEffect(() => {
    if (readOnly) { setAdapter(null); return; }
    if (mode === 'visual' && editor.current) setAdapter(createRichTextInkAdapter(editor.current, { onChange: () => syncRef.current() }));
    else if (mode === 'source' && area.current) setAdapter(createTextareaInkAdapter(area.current));
    else setAdapter(null);
  }, [mode, readOnly]);

  // Markdown: el campo crece con el texto.
  useLayoutEffect(() => {
    const el = area.current;
    if (mode !== 'source' || !el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [mode, value]);

  if (readOnly) return <div className={cx('nx-md-field', className)} data-readonly=""><NexMarkdown {...markdown} source={value} /></div>;

  return (
    <div className={cx('nx-md-field', className)} data-mode={mode}>
      {mode === 'visual' && (
        <div
          ref={editor}
          id={id}
          className="nx-md-field__visual nx-markdown"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          aria-description="Alt+F10: herramientas de formato"
          data-placeholder={placeholder}
          data-nx-empty={value.trim() === '' ? '' : undefined}
          onInput={sync}
          onPaste={(e) => { e.preventDefault(); document.execCommand?.('insertText', false, e.clipboardData.getData('text/plain')); sync(); }}
          onDoubleClick={(e) => { if ((e.target as Element).closest('.nx-md-field__island')) setMode('source'); }}
        />
      )}
      {mode === 'source' && (
        <textarea
          ref={area}
          id={id}
          className="nx-md-field__source"
          aria-label={`${label} (Markdown)`}
          aria-description="Alt+F10: herramientas de formato"
          value={value}
          placeholder={placeholder}
          spellCheck
          rows={3}
          onChange={(e) => emit(e.target.value)}
        />
      )}
      {mode === 'view' && (
        <div id={id} className="nx-md-field__view" role="document" aria-label={label}>
          <NexMarkdown {...markdown} source={value} />
        </div>
      )}
      {mode === 'visual' && islands.map((island, i) => island.element.isConnected && createPortal(
        <div title="Doble clic para editar en Markdown"><NexMarkdown {...markdown} source={island.source} /></div>,
        island.element,
        `${i}:${island.source.length}`,
      ))}
      <NexInk adapter={adapter} commands={commands} label={`Formato de ${label}`} />
      {modeSwitch && (
        <NexSegmented className="nx-md-field__mode" aria-label={`Perspectiva de ${label}`} density="compact" value={mode}
          onValueChange={(v) => setMode(v as NexMarkdownFieldMode)}
          options={[{ value: 'visual', label: 'Visual' }, { value: 'source', label: 'Markdown' }, { value: 'view', label: 'Vista' }]} />
      )}
    </div>
  );
}
