import { useEffect, useState } from 'react';
import { NexConsole, NexSelect, type NexConsoleOutput } from '@eclipsis/react';

/** Los 14 casos de composición de NexView, como salidas del contrato real. */
type O = NexConsoleOutput;
let n = 0;
const s = (o: Record<string, unknown>) => ({ ...o, seq: n++ }) as O;
const text = (t: string) => s({ stream: 'stdout', text: t });
const chart = (title: string, data: number[], extra: Record<string, unknown> = {}) => s({ stream: 'figure', format: 'barras', title, data, ...extra });
const table = (columns: string[], rows: (string | number)[][], extra: Record<string, unknown> = {}) => s({ stream: 'table', columns, rows, totalRows: rows.length, ...extra });
const svg = (w: number, h: number, hue: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" rx="18" fill="#efe7da"/><circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 3}" fill="${hue}"/></svg>`)}`;
const image = (w: number, h: number, hue: string, alt: string, extra: Record<string, unknown> = {}) => s({ stream: 'image', src: svg(w, h, hue), mimeType: 'image/svg+xml', width: w, height: h, alt, ...extra });
const warn = (t: string) => s({ stream: 'stderr', text: `main.py:4: UserWarning: ${t}\n  warnings.warn(...)\n` });

const CASES: Record<string, { label: string; outputs: () => O[] }> = {
  text: { label: '1 · Sólo texto', outputs: () => [text('Leyendo datos…\n'), text('Se procesaron 1 240 registros en 0.8 s.\n')] },
  chart: { label: '2 · Una gráfica', outputs: () => [chart('Llegadas por minuto', [3, 5, 2, 8, 4, 6, 7])] },
  two: { label: '3 · Dos gráficas', outputs: () => [chart('Hora punta', [8, 9, 7, 10], { group: 'Comparación por franja' }), chart('Resto del día', [3, 2, 4, 3], { group: 'Comparación por franja' })] },
  tableChart: { label: '4 · Tabla y gráfica', outputs: () => [table(['servicio', 'espera'], [['Banco', 4.2], ['Cafetería', 7.8], ['Farmacia', 3.4]]), chart('Espera por servicio', [4.2, 7.8, 3.4])] },
  imageTable: { label: '5 · Imagen y tabla', outputs: () => [image(640, 360, '#c2410c', 'Distribución de llegadas'), table(['k', 'P(k)'], [[0, 0.3], [1, 0.21], [2, 0.147]])] },
  narrative: { label: '6 · Texto, advertencia y gráficas', outputs: () => [text('Simulación de 3 escenarios:\n'), warn('la muestra tiene menos de 30 elementos'), chart('Escenario A', [2, 3, 4]), chart('Escenario B', [5, 4, 6]), chart('Escenario C', [7, 8, 6])] },
  tables: { label: '7 · Varias tablas', outputs: () => [table(['λ', 'Wq'], [[0.3, 0.43], [0.5, 1], [0.7, 2.33]]), table(['servidor', 'uso'], [['A', '70 %'], ['B', '55 %']]), table(['día', 'colas'], [['lun', 12], ['mar', 9], ['mié', 15]])] },
  mixed: {
    label: '8 · Mixtos extensos (regresión)',
    outputs: () => [
      text('Matriz de transición:\n[[0.5 0.5]\n [0.2 0.8]]\n'), warn('la muestra tiene menos de 30 elementos'),
      table(['k', 'P(k)'], [[0, 0.3], [1, 0.21], [2, 0.147], [3, 0.103]]), image(320, 120, '#c2410c', 'Curva de espera frente a la ocupación'),
      chart('Llegadas por minuto', [3, 5, 2, 8, 4]), text('Fin del análisis.\n'),
      s({ stream: 'json', value: { modelo: 'M/M/1', estable: true, parametros: { lambda: 0.7, mu: 1 } } }), image(200, 200, '#1f1a17', 'Diagrama del servidor'), image(400, 200, '#ea8a5a', 'Histograma'),
    ],
  },
  error: { label: '9 · Con errores', outputs: () => [text('Calculando…\n'), table(['x'], [[1], [2]]), s({ stream: 'error', text: "Traceback (most recent call last):\n  File \"main.py\", line 7, in <module>\nKeyError: 'espera'\n" })] },
  dynamic: { label: '10 · Dinámico (llegan resultados)', outputs: () => [] },
  large: { label: '12 · Elementos muy grandes', outputs: () => [table(Array.from({ length: 24 }, (_, i) => `c${i}`), Array.from({ length: 120 }, (_, r) => Array.from({ length: 24 }, (_, c) => r * c))), image(4000, 3000, '#c2410c', 'Imagen de 4000 × 3000')] },
  ordered: { label: '13 · Relacionados con orden', outputs: () => [text('Antes de limpiar:\n'), table(['fila', 'valor'], [[1, 'NaN'], [2, 7]]), text('Después de limpiar:\n'), table(['fila', 'valor'], [[2, 7]])] },
  bare: { label: '14 · Sin metadatos de relación', outputs: () => [chart('', [1, 4, 2]), image(300, 300, '#1f1a17', 'Figura sin título'), s({ stream: 'json', value: [1, 2, 3] }), chart('', [5, 3, 6])] },
};

function MiniChart({ data, title }: { data: number[]; title?: string }) {
  const max = Math.max(...data, 1);
  return (
    <svg viewBox={`0 0 ${data.length * 30} 110`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${title || 'Barras'}: ${data.join(', ')}`} className="view-case__chart">
      {data.map((v, i) => <rect key={i} x={i * 30 + 5} y={104 - (v / max) * 96} width="20" height={(v / max) * 96} rx="6" />)}
    </svg>
  );
}

export function ViewCases() {
  const [which, setWhich] = useState('mixed');
  const [width, setWidth] = useState(100);
  const [outputs, setOutputs] = useState<O[]>(() => CASES.mixed!.outputs());
  useEffect(() => {
    if (which !== 'dynamic') { setOutputs(CASES[which]!.outputs()); return; }
    // Caso 10: los resultados llegan uno a uno; los anteriores no se mueven salvo que cambie la composición.
    const queue = CASES.mixed!.outputs();
    setOutputs([]);
    const timer = setInterval(() => setOutputs((list) => (queue.length ? [...list, queue.shift()!] : list)), 600);
    return () => clearInterval(timer);
  }, [which]);
  return (
    <div className="view-cases">
      <div className="view-cases__controls">
        <NexSelect label="Caso" value={which} onValueChange={setWhich} options={Object.entries(CASES).map(([value, c]) => ({ value, label: c.label }))} />
        <label className="view-cases__width">Ancho del contenedor <b>{width} %</b> <span className="nx-visually-hidden">(caso 11: pantallas estrechas)</span>
          <input type="range" min={30} max={100} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
        </label>
      </div>
      <div style={{ width: `${width}%` }}>
        <NexConsole label="NexView" outputs={outputs} state={which === 'error' ? 'failed' : 'completed'} defaultView="nexview" onFocusOutput={() => {}}
          renderers={{ figure: (o) => <MiniChart data={o.data as number[]} title={o.title} /> }} />
      </div>
    </div>
  );
}
