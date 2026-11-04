import { NexBadge, NexButton, NexCard, NexIcon } from '@eclipsis/react';

/** Tarjeta de proyecto (equivalente a ProjectCard de Nextudio): toda la tarjeta navega, las acciones siguen siendo botones. */
export default function ProjectCardExample() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
      {[
        { title: 'Análisis de demanda', author: 'Ana Ruiz', context: 'Estadística I · 2026-2', tags: ['Python', 'pandas'], status: ['success', 'Publicado'] as const },
        { title: 'Simulador de colas', author: 'Beto Lara', context: 'Investigación de operaciones', tags: ['NexBook'], status: ['warning', 'No listado'] as const },
      ].map((p) => (
        <NexCard key={p.title} interactive motion="fluid">
          <NexCard.Header>
            <NexCard.Eyebrow>Proyecto</NexCard.Eyebrow>
            <NexCard.Title>
              <NexCard.Link href="#/patrones">{p.title}</NexCard.Link>
            </NexCard.Title>
            <NexCard.Description>{p.author} · {p.context}</NexCard.Description>
          </NexCard.Header>
          <NexCard.Content>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {p.tags.map((t) => <NexBadge key={t}>{t}</NexBadge>)}
            </div>
          </NexCard.Content>
          <NexCard.Footer>
            <NexBadge tone={p.status[0]} dot>{p.status[1]}</NexBadge>
            <NexCard.Actions>
              <NexButton appearance="ghost" density="compact" iconStart={<NexIcon name="copy" />}>Duplicar</NexButton>
            </NexCard.Actions>
          </NexCard.Footer>
        </NexCard>
      ))}
    </div>
  );
}
