/**
 * Lo que no depende de ningún runtime en la consola de un programa: la
 * transcripción (texto y entrada, en orden), el troceado de lo pegado, los
 * nombres de los estados y los adaptadores desde los contratos de Nextudio.
 * Origen: `lib/execution/interactive-session.ts` de Nextudio.
 */
import type { NexConsoleOutput, NexConsoleState, NexConsoleStatus } from './types.ts';

/** Un trozo de la transcripción. `input` es lo que se escribió (sin el Enter). */
export interface NexConsoleSegment {
  stream: 'stdout' | 'stderr' | 'error' | 'input';
  text: string;
  seq: number;
}

/**
 * La transcripción de texto en el orden real. Lo que no es texto (tablas,
 * imágenes, figuras) queda como marca en su sitio para no perder el orden.
 */
export function consoleTranscript(outputs: readonly NexConsoleOutput[]): Array<NexConsoleSegment | { stream: 'rich'; seq: number; output: NexConsoleOutput }> {
  const out: Array<NexConsoleSegment | { stream: 'rich'; seq: number; output: NexConsoleOutput }> = [];
  for (const output of [...outputs].sort((a, b) => a.seq - b.seq)) {
    if (output.stream === 'stdout' || output.stream === 'stderr' || output.stream === 'error' || output.stream === 'input') {
      const last = out.at(-1);
      // Una respuesta nunca se funde: cada Enter es suyo.
      if (last && last.stream === output.stream && output.stream !== 'input' && 'text' in last) last.text += output.text;
      else out.push({ stream: output.stream, text: output.text, seq: output.seq });
    } else {
      out.push({ stream: 'rich', seq: output.seq, output });
    }
  }
  return out;
}

/** Lo escrito o pegado, en líneas. Un salto final no añade otra línea vacía. */
export function splitInputLines(text: string): string[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length > 1 && lines.at(-1) === '') lines.pop();
  return lines;
}

export function consoleStateLabel(state: NexConsoleState): string {
  switch (state) {
    case 'starting': return 'Preparando…';
    case 'running': return 'Ejecutando…';
    case 'waiting_for_input': return 'Esperando entrada';
    case 'completed': return 'Finalizado';
    case 'failed': return 'Error';
    case 'cancelled': return 'Detenido';
    case 'timed_out': return 'Tiempo excedido';
    default: return 'Listo';
  }
}

/** El estado de ejecución en el vocabulario de los diagnósticos. */
export function consoleStatus(state: NexConsoleState): NexConsoleStatus {
  return state === 'failed' ? 'failed' : state === 'cancelled' ? 'stopped' : state === 'timed_out' ? 'timeout' : 'ok';
}

/** La última línea sin terminar de la salida: el prompt de un `input()`. */
export function pendingPrompt(outputs: readonly NexConsoleOutput[]): string {
  const last = [...outputs].sort((a, b) => a.seq - b.seq).at(-1);
  if (!last || last.stream !== 'stdout' || last.text.endsWith('\n')) return '';
  return last.text.slice(last.text.lastIndexOf('\n') + 1);
}

/** Forma mínima de una salida guardada de NexBook (Nextudio), sin importar sus tipos. */
type NexBookLikeOutput = { seq: number; stream: string; [key: string]: unknown };

/**
 * Salidas de NexBook → NexConsole, sin migrar documentos: texto, tablas, JSON e
 * imágenes pasan tal cual (la imagen resuelve su `assetId` con `imageSrc`);
 * Plotly se convierte en `figure`; el marcado y lo demás, en `custom`.
 */
export function fromNexBookOutputs(outputs: readonly NexBookLikeOutput[], { imageSrc }: { imageSrc?: (assetId: string) => string | undefined } = {}): NexConsoleOutput[] {
  return outputs.map((o): NexConsoleOutput => {
    switch (o.stream) {
      case 'stdout': case 'stderr': case 'error': case 'table': case 'json':
        return o as unknown as NexConsoleOutput;
      case 'image':
        return { ...(o as unknown as NexConsoleOutput & { stream: 'image' }), src: imageSrc?.(String(o.assetId ?? '')) };
      case 'plotly':
        return { seq: o.seq, stream: 'figure', format: 'plotly', title: o.title as string | undefined, data: o.figure ?? null };
      default:
        return { seq: o.seq, stream: 'custom', mime: String(o.mimeType ?? `application/x-nexbook-${o.stream}`), data: o };
    }
  });
}

/** Transcripción de la sesión interactiva de Nextudio (`TerminalSegment[]`) → salidas ordenadas. */
export function fromTerminalSegments(segments: ReadonlyArray<{ stream: 'stdout' | 'stderr' | 'error' | 'input'; text: string }>): NexConsoleOutput[] {
  return segments.map((s, seq) => ({ seq, stream: s.stream, text: s.text }) as NexConsoleOutput);
}
