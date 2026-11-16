import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { factLines, leadingTitle, splitPrompt, textForm } from '../src/console/text-form.ts';
import { layoutNexViewEvents, normalizeNexViewEvents } from '../src/console/model.ts';
import type { NexConsoleOutput } from '../src/console/types.ts';

describe('textForm: prosa editorial o texto literal (sin cambiar bytes)', () => {
  it('texto sencillo es prosa; una cifra no se convierte en métrica', () => {
    assert.equal(textForm('Análisis completado\nSe analizaron 250 registros\nPromedio: 18.4\n'), 'prose');
    assert.equal(textForm('Bienvenido, Ana\n'), 'prose');
  });

  it('lo que depende de la rejilla se queda literal', () => {
    assert.equal(textForm('+-----+-----+\n| a   | b   |\n+-----+-----+\n'), 'literal'); // tabla con caracteres
    assert.equal(textForm('┌──┐\n│ok│\n└──┘\n'), 'literal'); // cajas
    assert.equal(textForm('nombre    edad\nAna       21\n'), 'literal'); // columnas alineadas
    assert.equal(textForm('  /\\_/\\\n ( o.o )\n  > ^ <\n'), 'literal'); // arte ASCII
    assert.equal(textForm('[#######     ] 58%\n'), 'literal'); // barra de progreso
    assert.equal(textForm('def f(x):\n    return x + 1\n'), 'literal'); // código impreso
    assert.equal(textForm('col1\tcol2\n'), 'literal'); // tabuladores
    assert.equal(textForm('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08\n'), 'literal');
  });

  it('ante la duda (vacío), literal', () => {
    assert.equal(textForm('   \n'), 'literal');
  });
});

describe('splitPrompt: la pregunta de input()', () => {
  it('el trozo final sin salto es la pregunta; lo anterior queda intacto', () => {
    assert.deepEqual(splitPrompt('Hola\n¿Cómo te llamas? '), { before: 'Hola\n', prompt: '¿Cómo te llamas? ' });
    assert.equal(splitPrompt('Hola\n'), null);
  });
});

describe('layoutNexViewEvents empareja pregunta y respuesta', () => {
  it('la pregunta viaja con la entrada y no se pierde ningún byte', () => {
    const outputs: NexConsoleOutput[] = [
      { seq: 0, stream: 'stdout', text: 'Registro\n¿Cómo te llamas? ' },
      { seq: 1, stream: 'input', text: 'Ana' },
      { seq: 2, stream: 'stdout', text: 'Bienvenido, Ana\n' },
    ];
    const events = layoutNexViewEvents(normalizeNexViewEvents(outputs, 'ok'));
    assert.deepEqual(events.map((event) => event.kind), ['text', 'input', 'text']);
    const input = events[1] as Extract<(typeof events)[number], { kind: 'input' }>;
    assert.equal(input.prompt, '¿Cómo te llamas? ');
    assert.equal(input.output.text, 'Ana');
    assert.equal((events[0] as { output: { text: string } }).output.text, 'Registro\n');
  });

  it('varios input() seguidos, cada uno con su pregunta', () => {
    const outputs: NexConsoleOutput[] = [
      { seq: 0, stream: 'stdout', text: 'Nombre: ' },
      { seq: 1, stream: 'input', text: 'Ana' },
      { seq: 2, stream: 'stdout', text: 'Edad: ' },
      { seq: 3, stream: 'input', text: '21' },
    ];
    const events = layoutNexViewEvents(normalizeNexViewEvents(outputs, 'ok'));
    assert.deepEqual(events.map((event) => (event.kind === 'input' ? event.prompt : event.kind)), ['Nombre: ', 'Edad: ']);
  });
});

describe('leadingTitle: el título que el programa escribió', () => {
  it('una primera línea corta en prosa, seguida de más salida', () => {
    assert.deepEqual(leadingTitle('Cotizador de pedidos\nNombre del cliente: '), { title: 'Cotizador de pedidos', rest: 'Nombre del cliente: ' });
  });
  it('no: preguntas, etiquetas, frases, una sola línea, literal o indentado', () => {
    for (const text of ['¿Cuántos?\nx', 'Total:\n3', 'Listo.\nx', 'Solo una línea', '  Sangrado\nx', 'a = 1; b = 2;\nx', '====\nx', 'ab\nx']) {
      assert.equal(leadingTitle(text), null, text);
    }
  });
});

describe('factLines: datos Etiqueta: valor', () => {
  it('dos o más líneas seguidas, todas con la forma', () => {
    assert.deepEqual(factLines('Cliente: Ana\nTotal: $625\n'), [{ label: 'Cliente', value: 'Ana' }, { label: 'Total', value: '$625' }]);
  });
  it('una sola línea, una línea distinta o errores: no son datos', () => {
    assert.equal(factLines('Total: 3\n'), null);
    assert.equal(factLines('Cliente: Ana\nPedido calculado correctamente\n'), null);
    assert.equal(factLines('Error: algo\nTotal: 3\n'), null);
    assert.equal(factLines('https://a.b: x\nTotal: 3\n'), null);
  });
});
