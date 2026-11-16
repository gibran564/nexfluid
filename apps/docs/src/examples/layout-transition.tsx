import { useRef, useState } from 'react';
import { NexSegmented, useNexLayoutTransition } from '@nexfluid/react';

/**
 * useNexLayoutTransition: el lienzo pasa de una columna a dos (o a lo ancho) y
 * cada superficie viaja desde donde estaba. La disposición final se calcula una
 * vez; sólo se animan transform y clip-path. Con movimiento reducido o con el
 * teclado, el cambio es inmediato.
 */
type Layout = 'code' | 'split' | 'results';

export default function LayoutTransitionExample() {
  const [layout, setLayout] = useState<Layout>('code');
  const [panel, setPanel] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  useNexLayoutTransition(stage, `${layout}:${panel}`, { radius: '12px' });
  const sheet = { border: '1px solid var(--nx-border)', borderRadius: 12, background: 'var(--nx-surface)', padding: 14, minWidth: 0 } as const;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <NexSegmented
          aria-label="Disposición"
          density="compact"
          value={layout}
          onValueChange={(next) => setLayout(next as Layout)}
          options={[{ value: 'code', label: 'Código' }, { value: 'split', label: 'Dividido' }, { value: 'results', label: 'Resultados' }]}
        />
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={panel} onChange={(event) => setPanel(event.target.checked)} /> Panel lateral
        </label>
      </div>
      <div ref={stage} style={{ display: 'flex', gap: 6, height: 220 }}>
        {panel && <aside data-nx-layout-id="panel" style={{ ...sheet, width: 150 }}>Archivos</aside>}
        {layout !== 'results' && (
          <section data-nx-layout-id="editor" style={{ ...sheet, flex: layout === 'split' ? '0 0 50%' : '1 1 0', fontFamily: 'var(--nx-font-mono)' }}>
            print(&quot;hola&quot;)
          </section>
        )}
        {layout !== 'code' && <section data-nx-layout-id="results" style={{ ...sheet, flex: '1 1 0' }}>Resultados</section>}
      </div>
    </div>
  );
}
