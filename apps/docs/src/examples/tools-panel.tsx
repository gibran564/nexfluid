import { useState } from 'react';
import { NexBadge, NexButton, NexCard, NexIcon, NexIconButton } from '@nexfluid/react';

/** Panel de herramientas: acción principal, secundarias, acciones de icono con nombre y estado. */
export default function ToolsPanelExample() {
  const [running, setRunning] = useState(false);
  const run = () => {
    setRunning(true);
    setTimeout(() => setRunning(false), 1400);
  };
  return (
    <NexCard appearance="outlined" density="compact" as="section" aria-label="Herramientas">
      <NexCard.Header actions={<NexBadge tone={running ? 'warning' : 'success'} dot>{running ? 'Ejecutando' : 'Listo'}</NexBadge>}>
        <NexCard.Eyebrow>Herramientas</NexCard.Eyebrow>
        <NexCard.Title>Ejecución</NexCard.Title>
      </NexCard.Header>
      <NexCard.Content>
        <div role="toolbar" aria-label="Acciones del archivo" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <NexButton appearance="filled" motion="elastic" loading={running} loadingLabel="Ejecutando" onClick={run} iconStart={<NexIcon name="play" />}>
            Ejecutar
          </NexButton>
          <NexButton iconStart={<NexIcon name="plus" />}>Nuevo archivo</NexButton>
          <NexIconButton label="Buscar en el proyecto" icon={<NexIcon name="search" />} />
          <NexIconButton label="Ajustes del entorno" icon={<NexIcon name="settings" />} />
          <span style={{ flex: 1 }} />
          <NexButton appearance="ghost" tone="danger">Detener</NexButton>
        </div>
      </NexCard.Content>
    </NexCard>
  );
}
