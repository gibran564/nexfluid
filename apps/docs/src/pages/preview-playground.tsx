import { useState } from 'react';
import { NexMarkdown } from '@eclipsis/react/markdown';
import { NexMarkdownEditor, NexPreviewWidget } from '@eclipsis/react/widgets';

const PAGE = `# Colas que esperan menos

Una cola **M/M/1** con λ = 0.5 y μ = 0.75 espera de media **4 minutos**.

| Métrica | Valor |
|---|---|
| Llegadas (λ) | 0.5 / min |
| Servicio (μ) | 0.75 / min |

> [!TIP]
> Cambia de dispositivo: el visor estrecha la página y el texto se recompone.
`;

/** Escribe la página publicada y mírala en cada dispositivo: el visor pinta lo que escribes. */
export function PreviewPlayground() {
  const [page, setPage] = useState(PAGE);
  return (
    <div className="doc-preview-playground">
      <NexMarkdownEditor label="pagina.md" value={page} onChange={setPage} layout="editor" rows={10} />
      <NexPreviewWidget title="Página publicada">
        <div style={{ padding: 24 }}><NexMarkdown source={page} headingOffset={1} /></div>
      </NexPreviewWidget>
    </div>
  );
}
