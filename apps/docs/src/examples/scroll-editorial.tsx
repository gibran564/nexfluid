import { useState } from 'react';
import { NexScroll } from '@nexfluid/react';
import { NexMarkdown, markdownOutline } from '@nexfluid/react/markdown';
import { NexMarkdownEditor } from '@nexfluid/react/widgets';

const GUIDE = `## Introducción

NexFluidUI trata la interfaz como materia: superficies que se separan, se unen y se transforman con física medible.

## Componentes

Las piezas comparten un contrato: clases nx-*, atributos data-nx-* y tokens --nx-*. React es un adaptador, no el motor.

## API

NexScroll.Area resuelve la anatomía según la variante. Las secciones salen aquí de los títulos del propio texto.

## Accesibilidad

El área es una región con nombre; los marcadores son botones de navegación con aria-current.`;

/** Escribe la guía: cada «## título» es una sección del carril (mismos id que pinta NexMarkdown). */
export default function EditorialScroll() {
  const [source, setSource] = useState(GUIDE);
  const [active, setActive] = useState<string | null>(null);
  const sections = markdownOutline(source, 'guia-').filter((h) => h.level === 2).map((h) => ({ id: h.id, label: h.text }));
  return (
    <div style={{ display: 'grid', gap: 10, width: '100%' }}>
      <NexMarkdownEditor label="guia.md" value={source} onChange={setSource} layout="editor" rows={8} />
      <p className="nx-type-small" style={{ margin: 0 }} aria-live="polite">
        Sección actual: <strong>{sections.find((s) => s.id === active)?.label ?? '—'}</strong> · {sections.length} secciones
      </p>
      <NexScroll.Area variant="editorial" label="Guía de NexFluidUI" sections={sections} maxHeight={320} onSectionChange={setActive}>
        <article style={{ padding: '8px 4px 24px 2px' }}>
          <NexMarkdown source={source} idPrefix="guia-" headingOffset={1} measure />
        </article>
      </NexScroll.Area>
    </div>
  );
}
