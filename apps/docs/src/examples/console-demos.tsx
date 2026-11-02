import { useCallback, useEffect, useRef, useState } from 'react';
import { NexConsole, NexLiveConsole, type NexConsoleOutput, type NexConsoleState } from '@eclipsis/react';
import { createSessionStore, splitInputLines, type NexSessionTransport } from '@eclipsis/components';

/**
 * Programas simulados para NexConsole. Los eventos son de mentira; los
 * controles, no: la entrada se entrega de verdad al «programa», Detener lo
 * detiene y cambiar de vista no lo vuelve a ejecutar.
 */
type Out = NexConsoleOutput extends infer O ? (O extends NexConsoleOutput ? Omit<O, 'seq'> : never) : never;
interface Program {
  print: (text: string, stream?: 'stdout' | 'stderr' | 'error') => void;
  emit: (output: Out) => void;
  input: (prompt: string) => Promise<string>;
  sleep: (ms: number) => Promise<void>;
  fail: () => void;
}
type Script = (p: Program) => Promise<void>;

class Stopped extends Error {}

function useProgram(script: Script) {
  const [outputs, setOutputs] = useState<NexConsoleOutput[]>([]);
  const [state, setState] = useState<NexConsoleState>('idle');
  const [duration, setDuration] = useState<number | undefined>();
  const [queued, setQueued] = useState(0);
  const run = useRef(0);
  const seq = useRef(0);
  const pending = useRef<((line: string) => void) | null>(null);
  const ahead = useRef<string[]>([]);
  const failed = useRef(false);

  const start = useCallback(() => {
    const me = ++run.current;
    seq.current = 0;
    ahead.current = [];
    failed.current = false;
    setOutputs([]);
    setQueued(0);
    setState('running');
    const t0 = performance.now();
    const alive = () => { if (run.current !== me) throw new Stopped(); };
    const push = (o: Out) => setOutputs((list) => [...list, { ...o, seq: seq.current++ } as NexConsoleOutput]);
    const p: Program = {
      print: (text, stream = 'stdout') => { alive(); push({ stream, text }); },
      emit: (o) => { alive(); push(o); },
      sleep: (ms) => new Promise((resolve, reject) => setTimeout(() => (run.current === me ? resolve() : reject(new Stopped())), ms)),
      input: (prompt) => new Promise((resolve, reject) => {
        alive();
        push({ stream: 'stdout', text: prompt });
        const answer = (line: string) => { push({ stream: 'input', text: line }); setState('running'); resolve(line); };
        const early = ahead.current.shift();
        if (early !== undefined) { setQueued(ahead.current.length); answer(early); return; }
        setState('waiting_for_input');
        pending.current = (line) => { pending.current = null; if (run.current !== me) reject(new Stopped()); else answer(line); };
      }),
      fail: () => { failed.current = true; },
    };
    script(p).then(
      () => { if (run.current === me) { setState(failed.current ? 'failed' : 'completed'); setDuration(performance.now() - t0); } },
      (error) => { if (!(error instanceof Stopped)) throw error; },
    );
  }, [script]);

  const submit = useCallback((text: string) => {
    if (!pending.current) return false;
    const [first, ...rest] = splitInputLines(text);
    ahead.current.push(...rest);
    setQueued(ahead.current.length);
    pending.current(first ?? '');
    return true;
  }, []);

  const interrupt = useCallback(() => {
    run.current++;
    pending.current = null;
    setOutputs((list) => [...list, { seq: seq.current++, stream: 'error', text: 'Detuviste la ejecución.' }]);
    setState('cancelled');
  }, []);

  return { outputs, state, duration, queued, start, submit, interrupt };
}

function Demo({ script, label, note, height }: { script: Script; label: string; note?: string; height?: number }) {
  // La ejecución (useProgram) está separada de la presentación (NexConsole).
  const program = useProgram(script);
  return (
    <div className="console-demo">
      <NexConsole label={label} outputs={program.outputs} state={program.state} durationMs={program.duration} queued={program.queued}
        onRun={program.start} onSubmitInput={program.submit} onInterrupt={program.interrupt} height={height}
        renderers={{ figure: (o) => <MiniChart data={o.data as number[]} /> }} />
      {note && <p className="console-demo__note">{note}</p>}
    </div>
  );
}

function MiniChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <svg viewBox={`0 0 ${data.length * 28} 100`} role="img" aria-label={`Barras: ${data.join(', ')}`} className="console-demo__chart">
      {data.map((v, i) => <rect key={i} x={i * 28 + 4} y={100 - (v / max) * 92} width="20" height={(v / max) * 92} rx="6" />)}
    </svg>
  );
}

const IMAGE = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120"><rect width="320" height="120" rx="16" fill="#efe7da"/><path d="M20 90 C 80 20, 140 110, 200 50 S 290 40, 300 30" fill="none" stroke="#c2410c" stroke-width="5" stroke-linecap="round"/></svg>')}`;

export const normalRun: Script = async (p) => {
  p.print('Cargando 5 mediciones…\n');
  await p.sleep(400);
  p.print('Media: 4.4 personas por minuto\n');
  p.emit({ stream: 'table', columns: ['servicio', 'espera'], rows: [['Banco', 4.2], ['Cafetería', 7.8], ['Farmacia', 3.4]], totalRows: 3, display: { kind: 'table', pythonType: 'DataFrame', shape: [3, 2], dtypes: ['object', 'float64'] } });
  await p.sleep(300);
  p.emit({ stream: 'json', value: { modelo: 'M/M/1', parametros: { llegada: 0.7, servicio: 1 }, estable: true, colas: [1, 2, 3] } });
  p.print('Listo.\n');
};

export const stdinRun: Script = async (p) => {
  const name = await p.input('¿Cómo te llamas? ');
  const age = await p.input('¿Cuántos años tienes? ');
  const city = await p.input('¿En qué ciudad estudias? ');
  await p.sleep(200);
  p.print(`Hola, ${name}. En 10 años tendrás ${Number(age) + 10 || '¿?'} y seguirás en ${city || 'tu ciudad'}.\n`);
};

export const mixedRun: Script = async (p) => {
  p.print('Matriz de transición:\n[[0.5 0.5]\n [0.2 0.8]]\n');
  await p.sleep(250);
  p.print('main.py:7: UserWarning: la muestra tiene menos de 30 elementos\n  warnings.warn("muestra pequeña")\n', 'stderr');
  p.emit({ stream: 'table', columns: ['k', 'P(k)'], rows: [[0, 0.3], [1, 0.21], [2, 0.147], [3, 0.103]], totalRows: 4 });
  p.emit({ stream: 'image', src: IMAGE, mimeType: 'image/svg+xml', alt: 'Curva de espera frente a la ocupación' });
  p.emit({ stream: 'figure', format: 'barras', title: 'Llegadas por minuto', data: [3, 5, 2, 8, 4] });
  p.print('Fin del análisis.\n');
};

export const failingRun: Script = async (p) => {
  p.print('Calculando la media…\n');
  await p.sleep(300);
  p.emit({
    stream: 'error',
    text: 'Traceback (most recent call last):\n  File "main.py", line 3, in <module>\n    print(medai)\nNameError: name \'medai\' is not defined. Did you mean: \'media\'?\n',
  });
  p.fail();
};

export const longRun: Script = async (p) => {
  for (let i = 1; i <= 400; i++) {
    p.print(`iteración ${String(i).padStart(3, '0')} · cola = ${Math.round(Math.abs(Math.sin(i / 7)) * 12)}\n`);
    if (i % 20 === 0) await p.sleep(60);
  }
};

export function ConsoleShowcase({ which }: { which: 'normal' | 'stdin' | 'mixed' | 'failing' | 'long' }) {
  switch (which) {
    case 'normal': return <Demo script={normalRun} label="Ejecución normal" note="Alterna Consola / NexView: no se vuelve a ejecutar." />;
    case 'stdin': return <Demo script={stdinRun} label="Programa con stdin" note="Pega «Ana⏎20⏎Puebla» para contestar las tres de una vez." />;
    case 'mixed': return <Demo script={mixedRun} label="Salidas mixtas" />;
    case 'failing': return <Demo script={failingRun} label="Ejecución con error" note="En NexView, el error es un diagnóstico con sugerencia." />;
    case 'long': return <Demo script={longRun} label="Salida extensa" note="Sube durante la ejecución: el scroll no te arrastra. Pulsa Detener." height={260} />;
  }
}

/**
 * Una sesión que sigue viva: una pequeña calculadora de colas «remota». El
 * proceso es simulado; el contrato es el real: eventos al almacén, entrada y
 * cierre por el transporte, y NexLiveConsole en medio.
 */
export function LiveSessionDemo() {
  const [store] = useState(() => createSessionStore({ id: 'demo', kind: 'interactive', maxOutputs: 400 }));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };
  const stream = (text: string, then?: () => void, at = 0) => {
    // Salida incremental: fragmentos de pocos caracteres que actualizan la región activa.
    for (let i = 0; i < text.length; i += 3) later(at + i * 6, () => store.apply({ type: 'chunk', stream: 'stdout', text: text.slice(i, i + 3) }));
    later(at + text.length * 6 + 10, () => { then?.(); });
  };
  const prompt = () => store.apply([{ type: 'chunk', stream: 'stdout', text: '> ' }, { type: 'state', state: 'waiting_for_input' }]);
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const start = () => {
    stop();
    store.reset();
    store.apply([{ type: 'connection', connection: 'connecting' }, { type: 'state', state: 'starting' }]);
    later(500, () => {
      store.apply([{ type: 'connection', connection: 'connected' }, { type: 'state', state: 'running' }]);
      stream('Calculadora de colas M/M/1 · escribe «ayuda»\n', prompt);
    });
  };

  const transport: NexSessionTransport = {
    send: (text) => {
      if (store.getSnapshot().state !== 'waiting_for_input') return false;
      const [line = ''] = splitInputLines(text);
      store.apply([{ type: 'flush' }, { type: 'output', output: { stream: 'input', text: line } }, { type: 'state', state: 'running' }]);
      const [cmd, arg] = line.trim().split(/\s+/);
      if (cmd === 'ayuda') stream('Órdenes: espera <λ>, tabla, salir\n', prompt, 80);
      else if (cmd === 'espera') {
        const rate = Number(arg);
        if (!(rate > 0 && rate < 1)) { later(80, () => { store.apply({ type: 'output', output: { stream: 'stderr', text: `ValueError: λ debe estar entre 0 y 1 (recibido «${arg ?? ''}»)\n` } }); prompt(); }); }
        else stream(`Con λ = ${rate}, la espera media es ${(rate / (1 - rate)).toFixed(2)} min\n`, prompt, 80);
      } else if (cmd === 'tabla') {
        stream('Calculando…\n', () => {
          store.apply({ type: 'output', output: { stream: 'table', columns: ['λ', 'espera (min)'], rows: [0.3, 0.5, 0.7, 0.9].map((r) => [r, Number((r / (1 - r)).toFixed(2))]), totalRows: 4, display: { kind: 'table', shape: [4, 2] } } });
          prompt();
        }, 80);
      } else if (cmd === 'salir') stream('Hasta luego.\n', () => store.apply([{ type: 'exit', state: 'completed', code: 0 }, { type: 'connection', connection: 'disconnected' }]), 80);
      else stream(`Orden desconocida: «${line}»\n`, prompt, 80);
      return true;
    },
    interrupt: () => { stop(); store.apply([{ type: 'output', output: { stream: 'error', text: 'Detuviste la ejecución.' } }, { type: 'exit', state: 'cancelled' }]); },
    close: () => { stop(); store.apply([{ type: 'output', output: { stream: 'stdout', text: '\n[sesión cerrada]\n' } }, { type: 'exit', state: 'completed' }, { type: 'connection', connection: 'disconnected' }]); },
  };

  useEffect(() => stop, []);
  return (
    <div className="console-demo">
      <NexLiveConsole session={store} transport={transport} label="Sesión persistente" onRun={start} runLabel="Iniciar sesión" height={280}
        emptyHint="Inicia la sesión y prueba «espera 0.7», «tabla» o «salir»." />
    </div>
  );
}
