import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyTerminalControls } from '../src/console/terminal.ts';
import { normalizeNexViewEvents, layoutNexViewEvents } from '../src/console/model.ts';
import { consoleTranscript } from '../src/console/session.ts';
import type { NexConsoleOutput } from '../src/console/types.ts';

const out = (seq: number, text: string): NexConsoleOutput => ({ seq, stream: 'stdout', text });
const err = (seq: number, text: string): NexConsoleOutput => ({ seq, stream: 'stderr', text });
const input = (seq: number, text: string): NexConsoleOutput => ({ seq, stream: 'input', text });
const image = (seq: number): NexConsoleOutput => ({ seq, stream: 'image', mimeType: 'image/png', src: 'data:image/png;base64,AA==' });
const widget = (seq: number): NexConsoleOutput => ({ seq, stream: 'custom', mime: 'application/vnd.jupyter.widget-view+json', data: { model_id: 'm1' } });
const texts = (outputs: readonly NexConsoleOutput[]) => outputs.map((o) => ('text' in o ? `${o.stream}:${o.text}` : o.stream));
const ordered = (outputs: readonly NexConsoleOutput[]) => [...outputs].sort((a, b) => a.seq - b.seq);

describe('applyTerminalControls', () => {
  it('1 · stdout normal: la MISMA lista, sin tocar nada', () => {
    const outputs = [out(0, 'hola\n'), input(1, 'Ana'), out(2, 'adiós\r\n')];
    assert.equal(applyTerminalControls(outputs), outputs);
  });

  it('2 · limpieza completa (ESC[2J ESC[H, ESC[H ESC[2J, ESC c): lo anterior desaparece', () => {
    for (const clear of ['\u001b[2J\u001b[H', '\u001b[H\u001b[2J', '\u001b[H\u001b[J', '\u001bc']) {
      assert.deepEqual(texts(applyTerminalControls([out(0, `antes\nmás\n${clear}`)])), [], clear);
    }
  });

  it('3 · limpieza seguida de nuevas impresiones (en otro fragmento y en el mismo)', () => {
    assert.deepEqual(texts(applyTerminalControls([out(0, 'menú viejo\n'), out(1, '\u001b[2J\u001b[Hmenú nuevo\n')])), ['stdout:menú nuevo\n']);
    assert.deepEqual(texts(applyTerminalControls([out(0, 'a\n\u001b[2J\u001b[Hb\nc\n')])), ['stdout:b\nc\n']);
  });

  it('4 · limpieza seguida de stdin: la pregunta posterior y su respuesta se conservan, emparejadas', () => {
    const shown = applyTerminalControls([out(0, 'viejo\n\u001b[2J\u001b[HNombre: '), input(1, 'Ana'), out(2, 'Hola, Ana\n')]);
    assert.deepEqual(texts(ordered(shown)), ['stdout:Nombre: ', 'input:Ana', 'stdout:Hola, Ana\n']);
    const events = layoutNexViewEvents(normalizeNexViewEvents(ordered(shown), 'ok'));
    assert.deepEqual(events.map((e) => (e.kind === 'input' ? `input:${e.prompt}` : e.kind)), ['input:Nombre: ', 'text']);
    // Una pregunta pendiente (sin respuesta aún) sigue siendo el final del texto.
    const pending = applyTerminalControls([out(0, 'x\n\u001b[2J\u001b[HOpción: ')]);
    assert.deepEqual(texts(pending), ['stdout:Opción: ']);
  });

  it('5 · actualización con \\r: la línea se sobrescribe (barras de progreso), y ESC[K borra el resto', () => {
    assert.deepEqual(texts(applyTerminalControls([out(0, 'Cargando 10%'), out(1, '\rCargando 50%'), out(2, '\rListo\u001b[K\n')])), ['stdout:Listo\n']);
    assert.deepEqual(texts(applyTerminalControls([out(0, 'abcdef\rXY\n')])), ['stdout:XYcdef\n']);
    assert.deepEqual(texts(applyTerminalControls([out(0, 'abcdef\r\u001b[2KXY\n')])), ['stdout:XY\n']);
    assert.deepEqual(texts(applyTerminalControls([out(0, 'abcdef\u001b[3D\u001b[1KZ\n')])), ['stdout:   Zef\n']);
  });

  it('6 · limpieza tras mostrar un widget o una imagen: el texto se va; los bloques no son caracteres de la pantalla', () => {
    const shown = applyTerminalControls([out(0, 'Mueve el control\n'), widget(1), image(2), out(3, '\u001b[2J\u001b[Hvalor: 3\n')]);
    assert.deepEqual(texts(ordered(shown)), ['custom', 'image', 'stdout:valor: 3\n']);
  });

  it('7 · Consola y NexView leen lo mismo: la transcripción literal también refleja la limpieza', () => {
    const shown = ordered(applyTerminalControls([out(0, 'viejo\n'), out(1, '\u001b[2J\u001b[Hnuevo\n')]));
    assert.deepEqual(consoleTranscript(shown).map((s) => ('text' in s ? s.text : '')), ['nuevo\n']);
  });

  it('8 · clear_output(): limpia TODA la salida anterior (bloques incluidos); con wait, al llegar la siguiente', () => {
    assert.deepEqual(texts(ordered(applyTerminalControls([out(0, 'a\n'), image(1), { seq: 2, stream: 'clear' }, out(3, 'b\n')]))), ['stdout:b\n']);
    // wait=True sin nada después: lo anterior sigue a la vista.
    assert.deepEqual(texts(ordered(applyTerminalControls([out(0, 'a\n'), { seq: 1, stream: 'clear', wait: true }]))), ['stdout:a\n']);
    assert.deepEqual(texts(ordered(applyTerminalControls([out(0, 'a\n'), { seq: 1, stream: 'clear', wait: true }, out(2, 'b\n')]))), ['stdout:b\n']);
  });

  it('9 · secuencias incompletas (fragmentadas) y no compatibles', () => {
    // ESC al final de un fragmento y el resto en el siguiente: se aplica igual.
    assert.deepEqual(texts(applyTerminalControls([out(0, 'viejo\n\u001b'), out(1, '[2'), out(2, 'J\u001b[Hnuevo\n')])), ['stdout:nuevo\n']);
    // Todavía incompleta: no se enseña como basura y la región queda abierta.
    const half = applyTerminalControls([out(0, 'texto\n\u001b[2')]);
    assert.deepEqual(texts(half), ['stdout:texto\n']);
    assert.equal((half[0] as { open?: boolean }).open, true);
    // No compatibles (colores, cursor oculto, OSC): se ignoran; el texto queda.
    assert.deepEqual(texts(applyTerminalControls([out(0, '\u001b[31mrojo\u001b[0m \u001b[?25lsin cursor\u001b]0;título\u0007\n')])), ['stdout:rojo sin cursor\n']);
    // Texto ordinario que PARECE un control no es un control.
    const literal = [out(0, 'pulsa [2J o ^[[H\n'), out(1, 'r\\n literal\n')];
    assert.equal(applyTerminalControls(literal), literal);
  });

  it('stdout y stderr conservan su flujo y su orden', () => {
    assert.deepEqual(texts(ordered(applyTerminalControls([out(0, 'uno\n'), err(1, 'aviso\n'), out(2, 'progreso 1\rprogreso 2\n')]))), ['stdout:uno\n', 'stderr:aviso\n', 'stdout:progreso 2\n']);
  });

  it('un input() respondido es texto de la pantalla: una limpieza también lo retira', () => {
    assert.deepEqual(texts(ordered(applyTerminalControls([out(0, 'Edad: '), input(1, '30'), out(2, '\u001b[2J\u001b[HListo\n')]))), ['stdout:Listo\n']);
  });
});
