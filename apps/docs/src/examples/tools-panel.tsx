import { useState } from 'react';
import { NexBadge, NexButton, NexCard, NexIcon, NexIconButton } from '@nexfluid/react';

/**
 * Panel de herramientas sobre un texto real: guardar una versión, crear un
 * archivo nuevo, buscar (cuenta coincidencias), ajustar líneas y descartar
 * los cambios. Acción principal, secundarias, botones de icono con nombre y estado.
 */
export default function ToolsPanelExample() {
  const [text, setText] = useState('Colas que esperan menos.\nLa espera media teórica es 4 minutos.');
  const [saved, setSaved] = useState(text);
  const [versions, setVersions] = useState(0);
  const [query, setQuery] = useState<string | null>(null);
  const [wrap, setWrap] = useState(true);
  const dirty = text !== saved;
  const matches = query ? text.toLowerCase().split(query.toLowerCase()).length - 1 : 0;
  return (
    <NexCard appearance="outlined" density="compact" as="section" aria-label="Herramientas">
      <NexCard.Header actions={<NexBadge tone={dirty ? 'warning' : 'success'} dot>{dirty ? 'Cambios sin guardar' : `Guardado · v${versions}`}</NexBadge>}>
        <NexCard.Eyebrow>Herramientas</NexCard.Eyebrow>
        <NexCard.Title>notas.md</NexCard.Title>
      </NexCard.Header>
      <NexCard.Content>
        <div role="toolbar" aria-label="Acciones del archivo" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <NexButton appearance="filled" motion="elastic" disabled={!dirty} onClick={() => { setSaved(text); setVersions((v) => v + 1); }} iconStart={<NexIcon name="check" />}>
            Guardar versión
          </NexButton>
          <NexButton iconStart={<NexIcon name="plus" />} onClick={() => setText('')}>Nuevo archivo</NexButton>
          <NexIconButton label="Buscar en el archivo" icon={<NexIcon name="search" />} aria-pressed={query !== null} onClick={() => setQuery((q) => (q === null ? '' : null))} />
          <NexIconButton label={wrap ? 'Desactivar ajuste de línea' : 'Activar ajuste de línea'} icon={<NexIcon name="settings" />} aria-pressed={wrap} onClick={() => setWrap((w) => !w)} />
          <span style={{ flex: 1 }} />
          <NexButton appearance="ghost" tone="danger" disabled={!dirty} onClick={() => setText(saved)}>Descartar cambios</NexButton>
        </div>
        {query !== null && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: '0.8125rem' }}>
            Buscar <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, minHeight: 32, padding: '0 12px', border: 0, borderRadius: 9999, background: 'var(--nx-surface-sunken)', color: 'var(--nx-fg)' }} />
            <span aria-live="polite">{query ? `${matches} coincidencia${matches === 1 ? '' : 's'}` : ''}</span>
          </label>
        )}
        <textarea
          aria-label="Contenido de notas.md"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          wrap={wrap ? 'soft' : 'off'}
          style={{ width: '100%', marginTop: 10, padding: 12, border: 0, borderRadius: 14, background: 'var(--nx-surface-sunken)', color: 'var(--nx-fg)', font: '450 0.8125rem/1.7 var(--nx-font-mono)', resize: 'vertical', whiteSpace: wrap ? 'pre-wrap' : 'pre' }}
        />
      </NexCard.Content>
    </NexCard>
  );
}
