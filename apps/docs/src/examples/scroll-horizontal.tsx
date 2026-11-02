import { NexCard, NexScroll } from '@eclipsis/react';

const WEEKS = ['Colas M/M/1', 'Little', 'Simulación', 'Varianza', 'Intervalos', 'Redes', 'Prioridades', 'Informe'];

export default function HorizontalScroll() {
  return (
    <NexScroll.Area variant="minimal" orientation="horizontal" label="Semanas del curso">
      <ol style={{ listStyle: 'none', margin: 0, padding: '4px 2px', display: 'flex', gap: 12 }}>
        {WEEKS.map((w, i) => (
          <li key={w} style={{ width: 200, flex: 'none' }}>
            <NexCard density="compact">
              <NexCard.Eyebrow>Semana {i + 1}</NexCard.Eyebrow>
              <NexCard.Title>{w}</NexCard.Title>
            </NexCard>
          </li>
        ))}
      </ol>
    </NexScroll.Area>
  );
}
