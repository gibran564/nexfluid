'use client';

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '@nexfluid/components';
import { NexMarkdown, type NexMarkdownProps } from '../markdown/markdown.tsx';
import { MARKDOWN_INK_COMMANDS, createTextareaInkAdapter, type MarkdownInkCommand } from '../markdown/ink.tsx';
import { NexInk, type NexInkAdapter } from '../ink.tsx';

export interface NexMarkdownEditorProps {
  /** Controlado. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Nombre accesible del campo de texto. */
  label: string;
  /** `split`: texto y vista previa lado a lado (una columna si el contenedor es estrecho). `editor`: sólo el texto. */
  layout?: 'split' | 'editor';
  /** Contenido extra bajo la vista previa (o en su lugar si `layout="editor"`). */
  aside?: ReactNode;
  /** Se pasan a NexMarkdown. */
  markdown?: Omit<NexMarkdownProps, 'source'>;
  /** Líneas visibles mínimas del campo. */
  rows?: number;
  readOnly?: boolean;
  /** Herramientas de formato (NexInk) al seleccionar texto. Por defecto, no. */
  ink?: boolean;
  className?: string;
}

/**
 * Editor de Markdown: un `<textarea>` real y la vista previa que pinta
 * NexMarkdown en cada pulsación (el mismo motor que el resto de NexDocs: GFM,
 * avisos, código resaltado, sin HTML crudo). No ejecuta nada.
 */
export function NexMarkdownEditor({ value, defaultValue = '', onChange, label, layout = 'split', aside, markdown, rows = 12, readOnly, ink = false, className }: NexMarkdownEditorProps) {
  const [inner, setInner] = useState(defaultValue);
  const text = value ?? inner;
  const id = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const [adapter, setAdapter] = useState<NexInkAdapter<MarkdownInkCommand> | null>(null);
  useLayoutEffect(() => { setAdapter(ink && !readOnly && area.current ? createTextareaInkAdapter(area.current) : null); }, [ink, readOnly]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <div className={cx('nx-md-editor', className)} data-layout={layout}>
      <div className="nx-md-editor__source">
        <label htmlFor={id} className="nx-md-editor__label">{label}</label>
        <textarea
          ref={area}
          id={id}
          className="nx-md-editor__input"
          value={text}
          rows={rows}
          readOnly={readOnly}
          spellCheck
          aria-describedby={`${id}-count`}
          onChange={(e) => {
            if (value === undefined) setInner(e.target.value);
            onChange?.(e.target.value);
          }}
        />
        <span id={`${id}-count`} className="nx-md-editor__count">{words} palabras · {text.length} caracteres</span>
        {adapter && <NexInk adapter={adapter} commands={MARKDOWN_INK_COMMANDS} label={`Formato de ${label}`} />}
      </div>
      {layout === 'split' ? (
        <div className="nx-md-editor__preview" aria-label={`Vista previa de ${label}`} role="region">
          <NexMarkdown headingOffset={1} {...markdown} source={text} />
          {aside}
        </div>
      ) : aside}
    </div>
  );
}
