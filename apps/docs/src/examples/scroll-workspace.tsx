import { NexScroll } from '@eclipsis/react';

const FILES = Array.from({ length: 28 }, (_, i) => `practica-${String(i + 1).padStart(2, '0')}.py`);
const LOG = Array.from({ length: 60 }, (_, i) => `[${String(i).padStart(2, '0')}:00] cliente ${i + 1} atendido · espera ${(Math.sin(i) * 2 + 4).toFixed(2)} min`);

/** Dos regiones independientes: cada una se desplaza sola y, al llegar al extremo, la rueda pasa a la página. */
export default function WorkspaceScroll() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
      <NexScroll.Area variant="spatial" label="Archivos" maxHeight={260} style={{ background: 'var(--nx-surface)' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 12, display: 'grid', gap: 4, fontFamily: 'var(--nx-font-mono)', fontSize: '0.8125rem' }}>
          {FILES.map((f) => <li key={f}>{f}</li>)}
        </ul>
      </NexScroll.Area>
      <NexScroll.Area variant="fluid" label="Registro de la simulación" maxHeight={260} style={{ background: 'var(--nx-surface-sunken)', borderRadius: 18 }}>
        <pre style={{ margin: 0, padding: 12, fontSize: '0.75rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{LOG.join('\n')}</pre>
      </NexScroll.Area>
    </div>
  );
}
