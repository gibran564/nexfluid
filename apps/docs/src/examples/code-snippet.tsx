import { useState } from 'react';
import { NexCodeBlock } from '@nexfluid/react';

const INITIAL = `import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@nexfluid/react', '@nexfluid/components', '@nexfluid/core', '@nexfluid/foundation'],
};

export default config;`;

/** Escribe el fragmento: NexCodeBlock lo resalta en vivo. Elige lenguaje y la línea que destacar. */
export default function CodeSnippetExample() {
  const [code, setCode] = useState(INITIAL);
  const [language, setLanguage] = useState('ts');
  const [line, setLine] = useState(4);
  const lines = code.split('\n').length;
  return (
    <div style={{ display: 'grid', gap: 10, width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '0.8125rem' }}>
        <label>Lenguaje <select value={language} onChange={(e) => setLanguage(e.target.value)}>{['ts', 'tsx', 'python', 'css', 'json', 'markdown', 'shell'].map((l) => <option key={l}>{l}</option>)}</select></label>
        <label>Destacar línea <input type="number" min={0} max={lines} value={line} onChange={(e) => setLine(Number(e.target.value))} style={{ width: 64 }} /></label>
      </div>
      <textarea
        aria-label="Código del fragmento"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={8}
        spellCheck={false}
        style={{ width: '100%', padding: 12, border: 0, borderRadius: 14, background: 'var(--nx-surface-sunken)', color: 'var(--nx-fg)', font: '450 0.8125rem/1.7 var(--nx-font-mono)', resize: 'vertical' }}
      />
      <NexCodeBlock title={`archivo.${language === 'python' ? 'py' : language === 'markdown' ? 'md' : language === 'shell' ? 'sh' : language}`} language={language} showLineNumbers highlightLines={line > 0 ? [line] : undefined} code={code} />
    </div>
  );
}
