import { useState } from 'react';
import { NexBadge, NexButton, NexCard, NexFrame, NexIcon, NexSegmented } from '@nexfluid/react';
import { NexExplorerWidget, NexInspectorWidget } from '@nexfluid/react/widgets';

/** Layout con inspector: explorador en árbol, lienzo e inspector plegable dentro de un NexFrame. */
export default function InspectorLayoutExample() {
  const [file, setFile] = useState('colas.py');
  const [layout, setLayout] = useState<'split' | 'focus'>('split');
  return (
    <NexFrame
      height={540}
      canvasAs="div"
      density="compact"
      layout={layout}
      identity={<strong>NexCode</strong>}
      heading={<span>{file}</span>}
      actions={
        <>
          <NexSegmented aria-label="Disposición" density="compact" value={layout} onValueChange={(v) => setLayout(v as 'split' | 'focus')} options={[{ value: 'split', label: 'Dividido' }, { value: 'focus', label: 'Foco' }]} />
          <NexButton appearance="filled" density="compact" iconStart={<NexIcon name="play" />}>Ejecutar</NexButton>
        </>
      }
      explorer={
        <NexExplorerWidget
          aria-label="Archivos"
          selected={file}
          onSelect={setFile}
          defaultExpanded={['src']}
          nodes={[
            { id: 'src', label: 'src', icon: <NexIcon name="folder" />, children: [
              { id: 'colas.py', label: 'colas.py', icon: <NexIcon name="code" /> },
              { id: 'datos.csv', label: 'datos.csv', icon: <NexIcon name="grid" /> },
            ] },
            { id: 'README.md', label: 'README.md', icon: <NexIcon name="file" /> },
          ]}
        />
      }
      inspector={
        <NexInspectorWidget
          sections={[
            { id: 'file', title: 'Archivo', groups: [{ items: [{ label: 'Nombre', value: file }, { label: 'Lenguaje', value: file.endsWith('.py') ? 'Python' : 'Texto' }] }] },
            { id: 'state', title: 'Estado', groups: [{ items: [{ label: 'Guardado', value: <NexBadge tone="success" dot>Al día</NexBadge> }] }] },
          ]}
        />
      }
      inspectorResizable
    >
      <div style={{ padding: 24 }}>
        <NexCard appearance="filled">
          <NexCard.Title>{file}</NexCard.Title>
          <NexCard.Description>El lienzo es el contenido funcional; el marco sólo coloca, retrae y expande.</NexCard.Description>
        </NexCard>
      </div>
    </NexFrame>
  );
}
