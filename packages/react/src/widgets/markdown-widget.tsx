'use client';

import { useState, type ReactNode } from 'react';
import { cx, type NexAppearance, type NexDensity, type NexMotion } from '@nexfluid/components';
import { NexCard, NexCardContent, NexCardDescription, NexCardEyebrow, NexCardHeader, NexCardTitle } from '../card.tsx';
import { NexCodeBlock } from '../code-block.tsx';
import { NexMarkdown, type NexMarkdownProps } from '../markdown/markdown.tsx';
import { NexTab, NexTabs, NexTabsList, NexTabsPanel } from '../tabs.tsx';

export type NexMarkdownWidgetMode = 'preview' | 'source' | 'split';

export interface NexMarkdownWidgetProps {
  title: string;
  source: string;
  eyebrow?: string;
  description?: string;
  /** Controlado. */
  mode?: NexMarkdownWidgetMode;
  defaultMode?: NexMarkdownWidgetMode;
  onModeChange?: (mode: NexMarkdownWidgetMode) => void;
  /** Modos disponibles, en orden. Por defecto vista previa y fuente. */
  modes?: readonly NexMarkdownWidgetMode[];
  actions?: ReactNode;
  appearance?: NexAppearance;
  density?: NexDensity;
  motion?: NexMotion;
  /** Se pasan a NexMarkdown (imágenes, enlaces, renderCode…). */
  markdown?: Omit<NexMarkdownProps, 'source'>;
  /** Alto máximo de la fuente antes de desplazar. */
  maxSourceHeight?: number;
  className?: string;
}

const LABEL: Record<NexMarkdownWidgetMode, string> = { preview: 'Vista previa', source: 'Fuente', split: 'Dividido' };

/**
 * Bloque de documentación: tarjeta + pestañas + Markdown + código.
 * Composición pura de NexCard, NexTabs, NexMarkdown y NexCodeBlock.
 */
export function NexMarkdownWidget({
  title, source, eyebrow, description, mode, defaultMode = 'preview', onModeChange, modes = ['preview', 'source'],
  actions, appearance = 'outlined', density, motion, markdown, maxSourceHeight = 420, className,
}: NexMarkdownWidgetProps) {
  const [inner, setInner] = useState<NexMarkdownWidgetMode>(defaultMode);
  const current = mode ?? inner;
  const change = (next: string) => {
    if (mode === undefined) setInner(next as NexMarkdownWidgetMode);
    onModeChange?.(next as NexMarkdownWidgetMode);
  };
  const preview = <NexMarkdown headingOffset={1} density={density} {...markdown} source={source} />;
  const code = <NexCodeBlock code={source} language="markdown" title={`${title}.md`} showLineNumbers wrap maxHeight={maxSourceHeight} />;
  return (
    <NexCard as="section" appearance={appearance} density={density} motion={motion} className={cx('nx-md-widget', className)} aria-label={title}>
      <NexCardHeader actions={actions}>
        {eyebrow && <NexCardEyebrow>{eyebrow}</NexCardEyebrow>}
        <NexCardTitle>{title}</NexCardTitle>
        {description && <NexCardDescription>{description}</NexCardDescription>}
      </NexCardHeader>
      <NexCardContent>
        {modes.length > 1 ? (
          <NexTabs value={current} onValueChange={change} appearance="compact" motion={motion}>
            <NexTabsList aria-label={`Vista de ${title}`}>
              {modes.map((m) => (
                <NexTab key={m} value={m}>{LABEL[m]}</NexTab>
              ))}
            </NexTabsList>
            {modes.map((m) => (
              <NexTabsPanel key={m} value={m}>
                {m === 'preview' ? preview : m === 'source' ? code : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                    {code}
                    <div>{preview}</div>
                  </div>
                )}
              </NexTabsPanel>
            ))}
          </NexTabs>
        ) : current === 'source' ? code : preview}
      </NexCardContent>
    </NexCard>
  );
}
