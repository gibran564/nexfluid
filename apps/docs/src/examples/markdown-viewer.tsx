import { NexButton } from '@nexfluid/react';
import { NexMarkdownWidget } from '@nexfluid/react/widgets';

const SOURCE = `# Práctica 3 · Colas

Modela una cola **M/M/1** y compara la espera media con la simulación.

- [x] Leer \`llegadas.csv\`
- [ ] Simular 1 000 clientes

| Métrica | Teórica | Simulada |
|---|---|---|
| Espera (min) | 4.0 | 4.2 |

\`\`\`python
lam, mu = 0.5, 0.75
wq = lam / (mu * (mu - lam))
\`\`\`

> El HTML en línea no se interpreta: <script>alert(1)</script>
`;

/** Visualizador Markdown: vista previa, fuente y dividido, sin copiar la implementación del widget. */
export default function MarkdownViewerExample() {
  return (
    <NexMarkdownWidget
      eyebrow="Documentación"
      title="Enunciado"
      description="Markdown con GFM, sanitizado y con bloques de código de NexFluidUI."
      source={SOURCE}
      modes={['preview', 'source', 'split']}
      actions={<NexButton appearance="ghost" density="compact">Editar</NexButton>}
    />
  );
}
