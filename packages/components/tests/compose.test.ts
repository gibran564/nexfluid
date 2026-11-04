import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { columnsFor, composeNexView } from '../src/console/compose.ts';
import { layoutNexViewEvents, normalizeNexViewEvents } from '../src/console/model.ts';
import type { NexConsoleOutput } from '../src/console/types.ts';

let seq = 0;
const o = (x: Record<string, unknown>) => ({ ...x, seq: seq++ }) as NexConsoleOutput;
const text = (t: string) => o({ stream: 'stdout', text: t });
const fig = (extra: Record<string, unknown> = {}) => o({ stream: 'figure', format: 'x', data: [], ...extra });
const img = (w: number, h: number, extra: Record<string, unknown> = {}) => o({ stream: 'image', src: 'data:image/png;base64,', mimeType: 'image/png', width: w, height: h, ...extra });
const table = (cols: number) => o({ stream: 'table', columns: Array.from({ length: cols }, (_, i) => `c${i}`), rows: [[1]], totalRows: 1 });
const compose = (outputs: NexConsoleOutput[], columns: number) => composeNexView(layoutNexViewEvents(normalizeNexViewEvents(outputs, 'ok')), { columns });
const shape = (sections: ReturnType<typeof compose>) => sections.map((s) => (s.kind === 'anchor' ? s.item.role : `${s.kind}:${s.items.map((i) => i.event.output.stream).join(',')}`));
/** Todas las salidas, en el orden en que se pintan. */
const flat = (sections: ReturnType<typeof compose>) => sections.flatMap((s) => (s.kind === 'anchor' ? [s.item] : s.items)).map((i) => i.event.output.seq);

describe('composeNexView', () => {
  it('nada se pierde y el orden de lectura es el de la ejecución', () => {
    const outputs = [text('a\n'), table(2), img(320, 120), fig(), o({ stream: 'stderr', text: 'main.py:4: UserWarning: x\n' }), fig(), fig()];
    for (const cols of [1, 2, 3]) {
      const seqs = flat(compose(outputs, cols));
      assert.deepEqual(seqs, [...seqs].sort((a, b) => a - b));
      assert.equal(new Set(seqs).size, outputs.length);
    }
  });

  it('las anclas (texto, avisos, entrada) nunca se cruzan: lo de antes de un aviso sigue antes', () => {
    const sections = compose([fig(), o({ stream: 'stderr', text: 'main.py:1: UserWarning: x\n' }), fig()], 3);
    assert.deepEqual(shape(sections), ['row:figure', 'notice', 'row:figure']);
  });

  it('un tramo se empaqueta por capacidad: tabla estrecha + imagen + gráfica en una fila a 3 columnas', () => {
    assert.deepEqual(shape(compose([table(2), img(320, 120), fig()], 3)), ['row:table,image,figure']);
    assert.deepEqual(shape(compose([table(2), img(320, 120), fig()], 1)), ['row:table', 'row:image', 'row:figure']);
  });

  it('sólo imágenes: galería; una tabla con muchas columnas ocupa su fila', () => {
    assert.deepEqual(shape(compose([img(100, 100), img(200, 100), img(100, 200)], 3)), ['gallery:image,image,image']);
    assert.deepEqual(shape(compose([fig(), table(12), fig()], 3)), ['row:figure', 'row:table', 'row:figure']);
  });

  it('un group explícito tiene su fila; sin metadatos no se agrupa por nada más que adyacencia', () => {
    const sections = compose([fig({ group: 'A' }), fig({ group: 'A' }), fig({ group: 'B' })], 3);
    assert.deepEqual(sections.map((s) => (s.kind === 'anchor' ? '-' : s.group)), ['A', 'B']);
  });

  it('las proporciones vienen de los datos (aspecto de imagen, aspecto declarado de la figura)', () => {
    const [row] = compose([img(400, 100), fig({ aspect: 1 })], 3);
    assert.ok(row && row.kind === 'row');
    assert.equal(row.items[0]!.aspect, 4);
    assert.ok(row.items[0]!.weight > row.items[1]!.weight);
  });
});

describe('columnsFor (histéresis)', () => {
  it('umbrales', () => {
    assert.equal(columnsFor(300), 1);
    assert.equal(columnsFor(600), 2);
    assert.equal(columnsFor(1000), 3);
  });
  it('no cambia en cada píxel alrededor de un umbral', () => {
    assert.equal(columnsFor(770, 2), 2, 'subir exige pasar el umbral con margen');
    assert.equal(columnsFor(800, 2), 3);
    assert.equal(columnsFor(750, 3), 3, 'bajar exige quedarse claramente por debajo');
    assert.equal(columnsFor(720, 3), 2);
  });
});
