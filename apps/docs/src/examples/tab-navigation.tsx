import { NexBadge, NexCodeBlock, NexIcon, NexTab, NexTabs } from '@eclipsis/react';

/** Navegación por pestañas: el mismo trabajo como documento, código o resultado (patrón CellViewTabs). */
export default function TabNavigationExample() {
  return (
    <NexTabs defaultValue="code" appearance="liquid" motion="fluid">
      <NexTabs.List aria-label="Vista del trabajo">
        <NexTab value="book" icon={<NexIcon name="file" />}>NexBook</NexTab>
        <NexTab value="code" icon={<NexIcon name="code" />}>NexCode</NexTab>
        <NexTab value="output" icon={<NexIcon name="eye" />} trailing={<NexBadge density="compact" tone="accent">3</NexBadge>} textValue="Salidas">
          Salidas
        </NexTab>
      </NexTabs.List>
      <NexTabs.Panel value="book">
        <p style={{ margin: 0 }}>La demanda semanal sube un 12 % tras la campaña.</p>
      </NexTabs.Panel>
      <NexTabs.Panel value="code">
        <NexCodeBlock title="solucion.py" language="python" code={'demanda = [18, 24, 16]\ntotal = sum(demanda)\nprint(total)'} />
      </NexTabs.Panel>
      <NexTabs.Panel value="output">
        <NexCodeBlock language="shell" code="58" copyable={false} />
      </NexTabs.Panel>
    </NexTabs>
  );
}
