import { useState } from 'react';
import { NexButton, NexFrame, NexFrameRegion, NexTab, NexTabs } from '@eclipsis/react';

/** NexFrameRegion: una pantalla profunda coloca sus herramientas en la fila del marco sin conocer su DOM. */
function Editor() {
  const [saved, setSaved] = useState(true);
  return (
    <>
      <NexFrameRegion region="tools">
        <NexTabs defaultValue="doc" appearance="thread" density="compact">
          <NexTabs.List aria-label="Modo">
            <NexTab value="doc">Documento</NexTab>
            <NexTab value="outline">Esquema</NexTab>
          </NexTabs.List>
        </NexTabs>
      </NexFrameRegion>
      <NexFrameRegion region="actions">
        <NexButton density="compact" appearance={saved ? 'default' : 'filled'} onClick={() => setSaved(true)}>
          {saved ? 'Guardado' : 'Guardar'}
        </NexButton>
      </NexFrameRegion>
      <div style={{ padding: 24 }}>
        <textarea aria-label="Texto" defaultValue="Escribe y el botón del marco cambia." onInput={() => setSaved(false)} style={{ width: '100%', minHeight: 120 }} />
      </div>
    </>
  );
}

export default function FrameRegionExample() {
  return (
    <NexFrame height={360} canvasAs="div" variant="flush" identity={<strong>NexBook</strong>} heading="Apuntes">
      <Editor />
    </NexFrame>
  );
}
