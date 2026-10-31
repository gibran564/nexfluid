'use client';

import { Children, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cx, isExternalUrl, safeUrl, slugify, toDomId, type NexDensity } from '@nexfluid/components';
import { NexCodeBlock } from '../code-block.tsx';
import { NexIcon } from '../icon.tsx';

const ALERTS = {
  note: { label: 'Nota', icon: 'info' },
  tip: { label: 'Consejo', icon: 'check' },
  important: { label: 'Importante', icon: 'drop' },
  warning: { label: 'Advertencia', icon: 'alert' },
  caution: { label: 'Precaución', icon: 'alert' },
} as const;

export interface NexMarkdownProps {
  /** Markdown (GFM) no confiable. El HTML en línea NUNCA se interpreta. */
  source: string;
  density?: NexDensity;
  /** Limita el ancho a la medida de lectura. */
  measure?: boolean;
  /** Numera las secciones (h2) con un índice editorial. */
  numbered?: boolean;
  /** Añade `id` a los títulos para enlazarlos (`#instalacion`). */
  headingIds?: boolean;
  /** Prefijo de los `id` de títulos; por defecto, uno único por instancia. */
  idPrefix?: string;
  /** Desplaza los niveles: con 1, `#` se pinta como `<h2>`. Útil dentro de tarjetas. */
  headingOffset?: 0 | 1 | 2;
  /** `link` (por defecto): una imagen se muestra como enlace a su URL. `https`: se pinta si es https. */
  images?: 'link' | 'https';
  /** Enlaces externos en una pestaña nueva (`rel="noopener noreferrer"` siempre). */
  externalLinksInNewTab?: boolean;
  /** Cómo pintar un bloque de código cercado. Por defecto, `NexCodeBlock`. */
  renderCode?: (code: string, language: string | null) => ReactNode;
  /** Componentes de más (van detrás de los de NexMarkdown y pueden sustituirlos). */
  components?: Partial<Components>;
  className?: string;
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

/**
 * Renderizador Markdown seguro e independiente del editor.
 *
 * Tubería: `react-markdown` (mdast → hast → React, sin `dangerouslySetInnerHTML`)
 * + `remark-gfm`. No se incluye `rehype-raw`, se activa `skipHtml` y toda URL
 * pasa por `safeUrl` (http, https, mailto y relativas). Los avisos de GFM se
 * pintan como membranas de contenido; las citas, en serif con una gota.
 */
export function NexMarkdown({
  source, density, measure, numbered, headingIds = true, idPrefix, headingOffset = 0, images = 'link',
  externalLinksInNewTab = true, renderCode, components, className,
}: NexMarkdownProps) {
  const instance = toDomId('md', useId());
  const prefix = idPrefix ?? `${instance}-`;
  const seen = new Map<string, number>();
  const heading = (level: 1 | 2 | 3 | 4 | 5 | 6) =>
    function Heading({ children }: { children?: ReactNode }) {
      const Tag = `h${Math.min(6, level + headingOffset)}` as 'h1';
      if (!headingIds) return <Tag>{children}</Tag>;
      const base = slugify(textOf(children)) || 'seccion';
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      return <Tag id={`${prefix}${n ? `${base}-${n}` : base}`}>{children}</Tag>;
    };

  const base: Partial<Components> = {
    h1: heading(1), h2: heading(2), h3: heading(3), h4: heading(4), h5: heading(5), h6: heading(6),
    a({ href, children }) {
      const url = href ? safeUrl(href) : null;
      if (!url) return <span>{children}</span>;
      const external = isExternalUrl(url);
      return (
        <a href={url} rel={external ? 'noopener noreferrer' : undefined} target={external && externalLinksInNewTab ? '_blank' : undefined}>
          {children}
          {external && externalLinksInNewTab && <span className="nx-visually-hidden"> (se abre en una pestaña nueva)</span>}
        </a>
      );
    },
    img({ src, alt }) {
      const url = typeof src === 'string' ? safeUrl(src, { allowMailto: false }) : null;
      const text = alt || 'imagen sin descripción';
      if (!url) return <span>{text}</span>;
      if (images === 'https' && /^https:\/\//i.test(url)) return <img src={url} alt={alt ?? ''} loading="lazy" decoding="async" />;
      return (
        <a className="nx-markdown__image-link" href={url} rel="noopener noreferrer" target={externalLinksInNewTab ? '_blank' : undefined}>
          Imagen: {text}
        </a>
      );
    },
    pre({ children }) {
      const child = Children.toArray(children)[0] as ReactElement<{ className?: string; children?: ReactNode }> | undefined;
      const language = /language-([\w+#-]+)/.exec(child?.props.className ?? '')?.[1] ?? null;
      const code = textOf(child?.props.children).replace(/\n$/, '');
      return <>{renderCode ? renderCode(code, language) : <NexCodeBlock code={code} language={language} />}</>;
    },
    // Las casillas de tareas de GFM llegan sin nombre (axe: label). Se nombran por su estado.
    input({ type, checked }) {
      if (type !== 'checkbox') return null;
      return <input type="checkbox" checked={Boolean(checked)} disabled readOnly aria-label={checked ? 'Tarea hecha' : 'Tarea pendiente'} />;
    },
    // Avisos de GFM (> [!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION]) como membranas tintadas.
    blockquote({ children }) {
      const items = Children.toArray(children);
      const firstIndex = items.findIndex((c) => isValidElement(c));
      const first = items[firstIndex] as ReactElement<{ children?: ReactNode }> | undefined;
      const head = first ? Children.toArray(first.props.children) : [];
      const marker = typeof head[0] === 'string' ? /^\[!(note|tip|important|warning|caution)\]\s*/i.exec(head[0]) : null;
      if (!marker) return <blockquote>{children}</blockquote>;
      const kind = marker[1]!.toLowerCase() as keyof typeof ALERTS;
      const rest = [(head[0] as string).slice(marker[0].length), ...head.slice(1)];
      const body = [...items.slice(0, firstIndex), <p key="nx-alert-first">{rest}</p>, ...items.slice(firstIndex + 1)];
      return (
        <div className="nx-membrane nx-callout" data-nx-role="content" data-nx-material="base" data-nx-kind={kind} role="note" aria-label={ALERTS[kind].label}>
          <NexIcon name={ALERTS[kind].icon} />
          <p className="nx-callout__label">{ALERTS[kind].label}</p>
          <div className="nx-callout__body">{body}</div>
        </div>
      );
    },
    table({ children }) {
      return (
        <div className="nx-membrane nx-markdown__table" data-nx-role="content" data-nx-material="base" role="region" aria-label="Tabla" tabIndex={0}>
          <table>{children}</table>
        </div>
      );
    },
  };

  return (
    <div className={cx('nx-markdown', className)} data-nx-density={density} data-nx-measure={measure ? '' : undefined} data-nx-numbered={numbered ? '' : undefined}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={(url) => safeUrl(url) ?? ''}
        components={{ ...base, ...components }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
