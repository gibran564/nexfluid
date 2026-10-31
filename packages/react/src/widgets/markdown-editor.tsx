'use client';

import { useId, useState, type ReactNode } from 'react';
import { cx } from '@nexfluid/components';
import { NexMarkdown, type NexMarkdownProps } from '../markdown/markdown.tsx';

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
  className?: string;
}

/**
 * Editor de Markdown: un `<textarea>` real y la vista previa que pinta
 * NexMarkdown en cada pulsación (el mismo motor que el resto de NexDocs: GFM,
 * avisos, código resaltado, sin HTML crudo). No ejecuta nada.
 */
export function NexMarkdownEditor({ value, defaultValue = '', onChange, label, layout = 'split', aside, markdown, rows = 12, readOnly, className }: NexMarkdownEditorProps) {
  const [inner, setInner] = useState(defaultValue);
  const text = value ?? inner;
  const id = useId();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <div className={cx('nx-md-editor', className)} data-layout={layout}>
      <div className="nx-md-editor__source">
        <label htmlFor={id} className="nx-md-editor__label">{label}</label>
        <textarea
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
