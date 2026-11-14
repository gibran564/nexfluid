import type { NexConsoleInputOutput, NexConsoleStatus, NexConsoleOutput, NexConsoleTextOutput } from './types.ts';
import { diagnoseOutput, type NexViewDiagnostic } from './diagnostics.ts';
import { recognizePrintedStructures, type PrintedStructure } from './printed.ts';
import { splitPrompt } from './text-form.ts';

export type NexViewEvent =
  | { kind: 'diagnostic'; output: NexConsoleTextOutput; diagnostic: NexViewDiagnostic }
  | { kind: 'text'; output: NexConsoleTextOutput }
  /**
   * Lo que se escribió en stdin, en su sitio de la ejecución. `prompt`: la
   * pregunta del `input()` (lo impreso justo antes en la misma línea), que
   * NexView presenta como pregunta; la Consola la sigue mostrando literal.
   */
  | { kind: 'input'; output: NexConsoleInputOutput; prompt?: string }
  | { kind: 'printed'; confidence: 'parsed'; output: NexConsoleTextOutput; structure: PrintedStructure; label?: string }
  | { kind: 'structured'; confidence: 'confirmed'; output: Exclude<NexConsoleOutput, NexConsoleTextOutput | NexConsoleInputOutput> };

/** Preserve stored events; recovered print formatting never becomes type evidence. */
export function normalizeNexViewEvents(outputs: readonly NexConsoleOutput[], status: NexConsoleStatus): NexViewEvent[] {
  return [...outputs].sort((a, b) => a.seq - b.seq).flatMap((output): NexViewEvent[] => {
    if (output.stream === 'input') return [{ kind: 'input', output }];
    if (output.stream !== 'stdout' && output.stream !== 'stderr' && output.stream !== 'error') return [{ kind: 'structured', confidence: 'confirmed', output: output as Exclude<NexConsoleOutput, NexConsoleTextOutput | NexConsoleInputOutput> }];
    // Una región que aún recibe fragmentos puede estar a medias: nunca se interpreta.
    if (output.stream === 'stdout' && !output.truncated && !output.open) {
      const structures = recognizePrintedStructures(output.text);
      if (structures.length) {
        const events: NexViewEvent[] = [];
        let start = 0;
        for (const structure of structures) {
          if (structure.start > start) events.push({ kind: 'text', output: { ...output, text: output.text.slice(start, structure.start) } });
          events.push({ kind: 'printed', confidence: 'parsed', output: { ...output, text: output.text.slice(structure.start, structure.end) }, structure });
          start = structure.end;
        }
        if (start < output.text.length) events.push({ kind: 'text', output: { ...output, text: output.text.slice(start) } });
        return events;
      }
    }
    // A recorder can coalesce ordinary stderr and several warnings. Split only
    // at interpreter warning headers; every byte stays in its original place.
    const chunks = output.stream === 'stderr'
      ? output.text.split(/(?=^(?:[^\n]*?:\d+:\s*)?(?:[\w.]+\.)?[A-Za-z]\w*Warning:)/m).filter(Boolean)
      : [output.text];
    return chunks.map((text) => {
      const part = text === output.text ? output : { ...output, text };
      const diagnostic = diagnoseOutput(part, status);
      return diagnostic ? { kind: 'diagnostic', output: part, diagnostic } : { kind: 'text', output: part };
    });
  });
}

/** Join short print captions to their values, without changing normalized bytes. */
export function layoutNexViewEvents(input: NexViewEvent[]): NexViewEvent[] {
  const events = pairPrompts(input);
  if (!events.some((event) => event.kind === 'printed')) return events;
  const laidOut: NexViewEvent[] = [];
  for (const event of events) {
    if (event.kind === 'printed') {
      const previous = laidOut.at(-1);
      if (previous?.kind === 'text' && previous.output.stream === 'stdout') {
        const match = previous.output.text.match(/(?:^|\n)[ \t]*([^\n]{1,120}:)[ \t]*(?:\n[ \t]*)?$/);
        if (match) {
          const prefix = previous.output.text.slice(0, match.index);
          laidOut.pop();
          if (prefix.trim()) laidOut.push({ ...previous, output: { ...previous.output, text: prefix } });
          laidOut.push({ ...event, label: match[1]!.trim() });
          continue;
        }
      }
    }
    laidOut.push(event);
  }
  return laidOut.flatMap((event): NexViewEvent[] => {
    if (event.kind !== 'text' || event.output.stream !== 'stdout') return [event];
    // print(..., "\\n") separators belong to layout, not empty output cards.
    const text = event.output.text.replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, '');
    return text.trim() ? [{ ...event, output: { ...event.output, text } }] : [];
  });
}

/**
 * Une cada respuesta de stdin a su pregunta: el trozo final, sin salto de
 * línea, de lo impreso justo antes. Ningún byte se pierde: lo anterior a la
 * pregunta queda como texto y la pregunta viaja con la entrada.
 */
function pairPrompts(events: NexViewEvent[]): NexViewEvent[] {
  if (!events.some((event) => event.kind === 'input')) return events;
  const paired: NexViewEvent[] = [];
  for (const event of events) {
    const previous = paired.at(-1);
    if (event.kind === 'input' && previous?.kind === 'text' && previous.output.stream === 'stdout') {
      const split = splitPrompt(previous.output.text);
      if (split) {
        paired.pop();
        if (split.before) paired.push({ ...previous, output: { ...previous.output, text: split.before } });
        paired.push({ ...event, prompt: split.prompt });
        continue;
      }
    }
    paired.push(event);
  }
  return paired;
}
