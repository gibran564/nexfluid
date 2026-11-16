import type { NexConsoleOutput, NexConsoleTextOutput } from './types.ts';

/**
 * Controles de terminal sobre la salida de un programa: lo que una terminal
 * real haría con lo que el programa escribió, antes de presentarlo (Consola y
 * NexView leen el mismo resultado).
 *
 * Sólo se interpretan CONTROLES, nunca texto ordinario: `ESC` + secuencia
 * (CSI `ESC[…`, OSC `ESC]…`, `ESC c`), retorno de carro `\r` y retroceso `\b`.
 * Un «[2J» sin `ESC` es texto.
 *
 *  · Pantalla: `ESC[2J`/`ESC[3J` (borrar todo), `ESC[J`/`0J`/`1J` (desde o
 *    hasta el cursor), `ESC c` (reinicio).
 *  · Línea: `ESC[K`/`0K`/`1K`/`2K`, `\r` (volver al principio: lo siguiente
 *    sobrescribe; barras de progreso), `\b`.
 *  · Cursor: `ESC[H`/`ESC[f` (con o sin fila;columna), `A`/`B`/`C`/`D`/`G`.
 *  · Cualquier otra secuencia completa (colores SGR, ocultar cursor…) se
 *    ignora sin enseñarse como basura. Una secuencia INCOMPLETA al final se
 *    retiene: el resto puede llegar en el siguiente fragmento de stdout.
 *
 * La región de la terminal es el texto (stdout, stderr y lo que se respondió a
 * `input()`). Tablas, imágenes, figuras, widgets y errores no son caracteres de
 * la pantalla: limpiar la pantalla no los borra. `clear_output()` (el evento
 * `clear`, como en Jupyter) sí limpia TODA la salida anterior de la ejecución;
 * con `wait`, en cuanto llega la siguiente salida.
 *
 * Sin controles, devuelve la MISMA lista (ninguna salida cambia de identidad).
 */
export function applyTerminalControls(outputs: readonly NexConsoleOutput[]): readonly NexConsoleOutput[] {
  if (!outputs.some(hasControls)) return outputs;
  const screen = new Screen();
  let waitingClear = false;
  for (const output of [...outputs].sort((a, b) => a.seq - b.seq)) {
    if (output.stream === 'clear') {
      if (output.wait) waitingClear = true;
      else {
        waitingClear = false;
        screen.clearAll();
      }
      continue;
    }
    if (waitingClear) {
      waitingClear = false;
      screen.clearAll();
    }
    if (output.stream === 'stdout' || output.stream === 'stderr') screen.write(output);
    else if (output.stream === 'input') screen.input(output);
    else screen.block(output);
  }
  return screen.outputs();
}

const ESC = '\u001b';

function hasControls(output: NexConsoleOutput): boolean {
  if (output.stream === 'clear') return true;
  if (output.stream !== 'stdout' && output.stream !== 'stderr') return false;
  const text = output.text;
  if (text.includes(ESC) || text.includes('\b')) return true;
  // `\r\n` es un fin de línea, no un retorno que sobrescriba.
  return /\r(?!\n)/.test(text);
}

type Stream = 'stdout' | 'stderr';
interface Cell { ch: string; stream: Stream }
/** Una salida que no es texto de la pantalla, colocada ANTES de la fila `row`. */
interface Anchored { row: number; output: NexConsoleOutput; /** Ocupa el salto de línea de la fila anterior (un `input()` tras su pregunta). */ joined: boolean }

class Screen {
  private rows: (Cell | undefined)[][] = [[]];
  private row = 0;
  private col = 0;
  /** Bloques que sobrevivieron a una limpieza de pantalla: van antes de todo. */
  private kept: NexConsoleOutput[] = [];
  private anchored: Anchored[] = [];
  /** Secuencia incompleta de un fragmento anterior, por flujo. */
  private pending: Record<Stream, string> = { stdout: '', stderr: '' };
  private last?: NexConsoleTextOutput;

  write(output: NexConsoleTextOutput): void {
    const stream = output.stream as Stream;
    this.last = output;
    const text = this.pending[stream] + output.text;
    this.pending[stream] = '';
    let i = 0;
    while (i < text.length) {
      const ch = text[i]!;
      if (ch === ESC) {
        const end = sequenceEnd(text, i);
        if (end === null) {
          this.pending[stream] = text.slice(i);
          return;
        }
        this.control(text.slice(i, end));
        i = end;
        continue;
      }
      if (ch === '\r') {
        if (text[i + 1] === '\n') {
          this.newline();
          i += 2;
          continue;
        }
        this.col = 0;
      } else if (ch === '\n') this.newline();
      else if (ch === '\b') this.col = Math.max(0, this.col - 1);
      else this.put(ch, stream);
      i += 1;
    }
  }

  /** Lo que se respondió a `input()`: va tras su pregunta y termina la línea. */
  input(output: NexConsoleOutput): void {
    this.anchored.push({ row: this.row + 1, output, joined: true });
    this.row += 1;
    this.col = 0;
    this.line(this.row);
  }

  /** Un bloque (tabla, imagen, widget, error): entre líneas, nunca dentro de una. */
  block(output: NexConsoleOutput): void {
    const partial = this.col > 0 || (this.rows[this.row]?.length ?? 0) > 0;
    if (partial) {
      this.row += 1;
      this.col = 0;
      this.line(this.row);
    }
    this.anchored.push({ row: this.row, output, joined: partial });
  }

  /** `clear_output()`: toda la salida anterior, bloques incluidos. */
  clearAll(): void {
    this.kept = [];
    this.anchored = [];
    this.resetText();
  }

  outputs(): NexConsoleOutput[] {
    type Item = { output: NexConsoleOutput } | { stream: Stream; text: string };
    const items: Item[] = this.kept.map((output) => ({ output }));
    const add = (stream: Stream, chunk: string) => {
      const previous = items.at(-1);
      if (previous && 'text' in previous && previous.stream === stream) previous.text += chunk;
      else items.push({ stream, text: chunk });
    };
    const lastRow = Math.max(this.row, this.rows.length - 1, ...this.anchored.map((a) => a.row));
    let stream: Stream = 'stdout';
    for (let r = 0; r <= lastRow; r += 1) {
      for (const anchored of this.anchored.filter((a) => a.row === r)) items.push({ output: anchored.output });
      const cells = this.rows[r] ?? [];
      stream = cells.find(Boolean)?.stream ?? stream;
      for (const cell of cells) {
        if (cell) stream = cell.stream;
        add(stream, cell ? cell.ch : ' ');
      }
      const joinedNext = this.anchored.some((a) => a.row === r + 1 && a.joined);
      if (r < lastRow && !joinedNext) add(stream, '\n');
    }
    // El texto reconstruido ocupa el sitio que le toca entre los bloques: su
    // `seq` queda entre el del bloque anterior y el del siguiente.
    const result: NexConsoleOutput[] = [];
    let previous = -1;
    items.forEach((item, index) => {
      if ('output' in item) {
        result.push(item.output);
        previous = item.output.seq;
        return;
      }
      if (!item.text) return;
      const following = items.slice(index + 1).find((next): next is { output: NexConsoleOutput } => 'output' in next)?.output.seq ?? previous + 2;
      const seq = previous + (following - previous) / 2;
      result.push({ seq, stream: item.stream, text: item.text });
      previous = seq;
    });
    // El texto conserva sus marcas: recortado si el original lo estaba; abierto
    // si la región aún recibe fragmentos (o espera el resto de una secuencia).
    const truncated = this.last?.truncated;
    const open = this.last?.open || this.pending.stdout !== '' || this.pending.stderr !== '';
    if (truncated || open) {
      for (let i = result.length - 1; i >= 0; i -= 1) {
        const output = result[i]!;
        if (output.stream === 'stdout' || output.stream === 'stderr') {
          result[i] = { ...output, ...(truncated ? { truncated } : {}), ...(open ? { open } : {}) };
          break;
        }
      }
    }
    return result;
  }

  private control(sequence: string): void {
    if (sequence === `${ESC}c`) {
      this.clearScreen();
      return;
    }
    if (sequence[1] !== '[') return;
    const final = sequence.at(-1)!;
    const body = sequence.slice(2, -1);
    // Parámetros privados (`ESC[?25l`): no afectan a la pantalla.
    if (/^[?<=>]/.test(body)) return;
    const params = body.split(';').map((p) => (p === '' ? NaN : Number(p)));
    const n = (index: number, fallback: number) => (Number.isFinite(params[index]) ? params[index]! : fallback);
    switch (final) {
      case 'J': {
        const mode = n(0, 0);
        if (mode === 2 || mode === 3) this.clearScreen();
        else if (mode === 0) {
          this.rows[this.row] = (this.rows[this.row] ?? []).slice(0, this.col);
          this.rows.length = this.row + 1;
          this.anchored = this.anchored.filter((a) => !isText(a.output) || a.row <= this.row);
        } else if (mode === 1) {
          for (let r = 0; r < this.row; r += 1) this.rows[r] = [];
          this.blankLine(0, this.col + 1);
          this.anchored = this.anchored.filter((a) => !isText(a.output) || a.row > this.row);
        }
        return;
      }
      case 'K': {
        const mode = n(0, 0);
        const line = this.line(this.row);
        if (mode === 0) line.length = Math.min(line.length, this.col);
        else if (mode === 1) this.blankLine(0, this.col + 1);
        else if (mode === 2) this.rows[this.row] = [];
        return;
      }
      case 'H':
      case 'f':
        this.row = Math.max(0, n(0, 1) - 1);
        this.col = Math.max(0, n(1, 1) - 1);
        this.line(this.row);
        return;
      case 'A':
        this.row = Math.max(0, this.row - n(0, 1));
        return;
      case 'B':
        this.row += n(0, 1);
        this.line(this.row);
        return;
      case 'C':
        this.col += n(0, 1);
        return;
      case 'D':
        this.col = Math.max(0, this.col - n(0, 1));
        return;
      case 'G':
        this.col = Math.max(0, n(0, 1) - 1);
        return;
      default:
        // SGR (colores) y el resto: se ignoran.
        return;
    }
  }

  /** Borrar la pantalla: el texto (y sus respuestas); los bloques se conservan, antes de lo nuevo. */
  private clearScreen(): void {
    this.kept.push(...this.anchored.filter((a) => !isText(a.output)).map((a) => a.output));
    this.anchored = [];
    this.resetText();
  }

  private resetText(): void {
    this.rows = [[]];
    this.row = 0;
    this.col = 0;
  }

  private newline(): void {
    this.row += 1;
    this.col = 0;
    this.line(this.row);
  }

  private put(ch: string, stream: Stream): void {
    const line = this.line(this.row);
    line[this.col] = { ch, stream };
    this.col += 1;
  }

  private blankLine(from: number, to: number): void {
    const line = this.line(this.row);
    for (let c = from; c < Math.min(to, line.length); c += 1) {
      const cell = line[c];
      if (cell) line[c] = { ch: ' ', stream: cell.stream };
    }
  }

  private line(row: number): (Cell | undefined)[] {
    while (this.rows.length <= row) this.rows.push([]);
    return this.rows[row]!;
  }
}

/** Un `input()` respondido es texto de la pantalla; tablas, imágenes, widgets y errores, no. */
function isText(output: NexConsoleOutput): boolean {
  return output.stream === 'input';
}

/**
 * Dónde termina la secuencia que empieza en `start` (un `ESC`), o `null` si
 * está incompleta (el resto puede llegar en el siguiente fragmento).
 */
function sequenceEnd(text: string, start: number): number | null {
  const next = text[start + 1];
  if (next === undefined) return null;
  if (next === '[') {
    for (let i = start + 2; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      if (code >= 0x40 && code <= 0x7e) return i + 1;
      // Sólo parámetros e intermedios: cualquier otra cosa corta una secuencia mal formada.
      if (code < 0x20 || code > 0x3f) return i;
    }
    return null;
  }
  if (next === ']') {
    for (let i = start + 2; i < text.length; i += 1) {
      if (text[i] === '\u0007') return i + 1;
      if (text[i] === ESC && text[i + 1] === '\\') return i + 2;
    }
    return null;
  }
  return start + 2;
}

