'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { cx, normalizeLanguage, splitLines, tokenize, type NexDensity, type Token } from '@eclipsis/components';
import { NexButton } from './button.tsx';
import { NexIcon } from './icon.tsx';

export interface NexCodeBlockProps {
  code: string;
  /** Lenguaje (`ts`, `tsx`, `python`, `json`, `css`, `html`, `bash`, `markdown`…). Desconocido → texto plano. */
  language?: string | null;
  /** Nombre de archivo o título. Se muestra en la cabecera y nombra la región. */
  title?: string;
  showLineNumbers?: boolean;
  /** Líneas resaltadas (desde 1). */
  highlightLines?: readonly number[];
  wrap?: boolean;
  copyable?: boolean;
  /** Alto máximo antes de desplazar (px o longitud CSS). */
  maxHeight?: number | string;
  /**
   * Resaltador propio (p. ej. Monaco en Nextudio). Debe devolver tokens de texto:
   * nunca HTML. `null` → resaltador integrado.
   */
  highlighter?: (code: string, language: string) => Token[] | null;
  density?: NexDensity;
  className?: string;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Bloque de código: membrana de contenido hundida, coloreado sin dependencias y copiable. */
export function NexCodeBlock({
  code, language, title, showLineNumbers = false, highlightLines, wrap = false, copyable = true, maxHeight,
  highlighter, density, className,
}: NexCodeBlockProps) {
  const lang = normalizeLanguage(language);
  const lines = useMemo(() => {
    const tokens = highlighter?.(code, lang) ?? tokenize(code, lang);
    return splitLines(tokens);
  }, [code, lang, highlighter]);
  const highlighted = useMemo(() => new Set(highlightLines ?? []), [highlightLines]);
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = async () => {
    const ok = await copyText(code);
    setStatus(ok ? 'copied' : 'failed');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus('idle'), 2000);
  };
  const regionLabel = title ?? (language ? `Código ${language}` : 'Código');
  const copyButton = copyable ? (
    <NexButton
      appearance="ghost"
      density="compact"
      motion="none"
      className={cx('nx-code__copy', !title && !language && 'nx-code__floating-copy')}
      onClick={copy}
      aria-label={status === 'copied' ? 'Copiado' : `Copiar ${regionLabel.toLowerCase()}`}
      iconStart={<NexIcon name={status === 'copied' ? 'check' : 'copy'} size={14} />}
    >
      {status === 'copied' ? 'Copiado' : status === 'failed' ? 'Selecciona y copia' : 'Copiar'}
    </NexButton>
  ) : null;

  return (
    <div
      className={cx('nx-membrane nx-code', className)}
      data-nx-role="content"
      data-nx-material="sunken"
      data-nx-density={density}
      data-nx-wrap={wrap ? '' : undefined}
      style={maxHeight === undefined ? undefined : ({ '--nx-code-max-height': typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } as CSSProperties)}
    >
      {(title || language) && (
        <div className="nx-code__header">
          <span className="nx-code__title">{title ?? ''}</span>
          {language && <span className="nx-code__language">{language}</span>}
          {copyButton}
        </div>
      )}
      {!title && !language && copyButton}
      <pre className="nx-code__pre" tabIndex={0} role="region" aria-label={regionLabel}>
        <code className="nx-code__code" data-language={lang || undefined}>
          {lines.map((line, i) => (
            <span key={i} className="nx-code__line" data-highlighted={highlighted.has(i + 1) ? '' : undefined}>
              {showLineNumbers && <span className="nx-code__ln" aria-hidden="true">{i + 1}</span>}
              {line.map((t, j) => (t.type === 'plain' ? t.text : <span key={j} data-token={t.type}>{t.text}</span>))}
              {i < lines.length - 1 ? '\n' : null}
            </span>
          ))}
        </code>
      </pre>
      <span className="nx-visually-hidden" role="status" aria-live="polite">
        {status === 'copied' ? 'Código copiado al portapapeles' : status === 'failed' ? 'No se pudo copiar: selecciona el código manualmente' : ''}
      </span>
    </div>
  );
}
