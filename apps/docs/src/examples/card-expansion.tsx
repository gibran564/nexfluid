import { useState } from 'react';
import { NexBadge, NexCard } from '@nexfluid/react';
import { NexMarkdown } from '@nexfluid/react/markdown';
import { NexMarkdownEditor } from '@nexfluid/react/widgets';

/**
 * Tarjeta → panel: «Ampliar» transforma la membrana de la tarjeta en un panel.
 * Dentro, el detalle es Markdown editable: lo que escribas se ve en la tarjeta.
 */
export default function CardExpansionExample() {
  const [title, setTitle] = useState('Colas que esperan menos');
  const [detail, setDetail] = useState('La espera media teórica de una cola **M/M/1** es `λ / (μ (μ − λ))`.\n\n> [!NOTE]\n> Edita este texto: la tarjeta lo resume al cerrar el panel.');
  const summary = detail.replace(/[#>*`_[\]]|!\w+/g, '').split('\n').map((l) => l.trim()).filter(Boolean)[0] ?? '';
  return (
    <div style={{ maxWidth: 380, width: '100%' }}>
      <NexCard
        interactive
        expansion={
          <div style={{ display: 'grid', gap: 16 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: '0.8125rem' }}>Título
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ minHeight: 34, padding: '0 12px', border: 0, borderRadius: 9999, background: 'var(--nx-surface-sunken)', color: 'var(--nx-fg)', font: 'inherit' }} />
            </label>
            <NexMarkdownEditor label="detalle.md" value={detail} onChange={setDetail} rows={8} />
          </div>
        }
      >
        <NexCard.Header>
          <NexCard.Eyebrow>Práctica 03</NexCard.Eyebrow>
          <NexCard.Title>{title || 'Sin título'}</NexCard.Title>
          <NexCard.Description>{summary}</NexCard.Description>
        </NexCard.Header>
        <NexCard.Content><NexMarkdown source={detail} density="compact" headingOffset={2} /></NexCard.Content>
        <NexCard.Footer><NexBadge tone="accent">{detail.trim().split(/\s+/).filter(Boolean).length} palabras</NexBadge></NexCard.Footer>
      </NexCard>
    </div>
  );
}
