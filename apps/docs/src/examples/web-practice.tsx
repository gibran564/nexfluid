import { useEffect, useState } from 'react';
import { NexButton, NexPortal, NexSegmented, type NexPortalConsoleEntry } from '@nexfluid/react';

/** Recurso propio servido por NexDocs: se deja incrustar y su JavaScript es real. */
export const REFERENCE_URL = './reference/cola-mm1.html';

export const SANDBOX_START = {
  html: `<h1>Clientes en cola</h1>
<p>Simula llegadas y servicios.</p>
<button id="step">Un minuto más</button>
<ol id="queue"></ol>`,
  css: `body { font: 15px system-ui, sans-serif; padding: 16px; }
h1 { font-size: 20px; margin: 0 0 4px; }
button { padding: 6px 12px; border-radius: 999px; border: 1px solid #ccc; }
li { padding: 2px 0; }`,
  javascript: `const queue = document.getElementById('queue');
let minute = 0;
document.getElementById('step').addEventListener('click', () => {
  minute++;
  if (Math.random() < 0.5) {
    const li = document.createElement('li');
    li.textContent = 'Llega un cliente en el minuto ' + minute;
    queue.append(li);
  }
  if (queue.children.length && Math.random() < 0.75) queue.firstElementChild.remove();
  console.log('minuto', minute, '· en cola:', queue.children.length);
});
console.log('Sandbox iniciado');`,
};

type Lang = 'html' | 'css' | 'javascript';

/** Un editor de HTML, CSS y JavaScript conectado a un NexPortal en modo sandbox. */
export function SandboxWorkbench({ height = 300, layout = 'columns' }: { height?: number; layout?: 'columns' | 'stack' }) {
  const [code, setCode] = useState(SANDBOX_START);
  const [lang, setLang] = useState<Lang>('javascript');
  // El documento aislado se reconstruye al dejar de escribir, no en cada tecla.
  const [applied, setApplied] = useState(SANDBOX_START);
  useEffect(() => { const t = window.setTimeout(() => setApplied(code), 400); return () => window.clearTimeout(t); }, [code]);
  const [log, setLog] = useState<NexPortalConsoleEntry[]>([]);
  useEffect(() => { setLog([]); }, [applied]);

  return (
    <div className="doc-web-bench" data-layout={layout}>
      <div className="doc-web-bench__editor">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <NexSegmented aria-label="Lenguaje" density="compact" value={lang} onValueChange={(v) => setLang(v as Lang)}
            options={[{ value: 'html', label: 'HTML' }, { value: 'css', label: 'CSS' }, { value: 'javascript', label: 'JavaScript' }]} />
          <NexButton appearance="ghost" density="compact" onClick={() => setCode(SANDBOX_START)}>Restablecer</NexButton>
        </div>
        <textarea
          className="nx-md-field__source doc-web-bench__code"
          aria-label={`Código ${lang === 'javascript' ? 'JavaScript' : lang.toUpperCase()}`}
          spellCheck={false}
          value={code[lang]}
          onChange={(e) => setCode({ ...code, [lang]: e.target.value })}
          style={{ height }}
        />
      </div>
      <div className="doc-web-bench__result">
        <NexPortal label="Resultado del código" mode="sandbox" html={applied.html} css={applied.css} javascript={applied.javascript} height={height}
          onConsole={(entry) => setLog((l) => [...l.slice(-49), entry])} />
        <ol className="doc-web-bench__console" aria-label="Consola del resultado" aria-live="polite">
          {log.length === 0 ? <li className="doc-hint">La consola del sandbox aparece aquí.</li> : log.map((e, i) => <li key={i} data-level={e.level}>{e.text}</li>)}
        </ol>
      </div>
    </div>
  );
}
