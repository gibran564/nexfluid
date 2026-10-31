import { NexBadge, NexCard, NexCodeBlock } from '@nexfluid/react';
import { NexMarkdown } from '@nexfluid/react/markdown';

/** Tarjeta → panel: «Ampliar» transforma la membrana de la tarjeta en un panel con el detalle. */
export default function CardExpansionExample() {
  return (
    <div style={{ maxWidth: 360, width: '100%' }}>
      <NexCard
        interactive
        expansion={
          <div style={{ display: 'grid', gap: 16 }}>
            <NexMarkdown source={'La espera media teórica de una cola **M/M/1** es `λ / (μ (μ − λ))`.\n\n> [!NOTE]\n> La simulación converge a ±5 % con mil clientes.'} />
            <NexCodeBlock title="colas.py" language="python" code={'def espera_media(lam, mu):\n    return lam / (mu * (mu - lam))'} />
          </div>
        }
      >
        <NexCard.Header>
          <NexCard.Eyebrow>Práctica 03</NexCard.Eyebrow>
          <NexCard.Title>Colas que esperan menos</NexCard.Title>
          <NexCard.Description>Modelo frente a simulación.</NexCard.Description>
        </NexCard.Header>
        <NexCard.Footer><NexBadge tone="accent">Python</NexBadge></NexCard.Footer>
      </NexCard>
    </div>
  );
}
