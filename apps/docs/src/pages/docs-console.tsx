import { useState } from 'react';
import { NexMarkdownField } from '@nexfluid/react/markdown';
import { NexDataView, sheetFromRows, type SheetData } from '@nexfluid/react/sheets';
import type { ComponentDoc } from '../docs/component-page.tsx';
import { ConsoleShowcase, LiveSessionDemo } from '../examples/console-demos.tsx';
import { ViewCases } from '../examples/view-cases.tsx';

export const consoleDoc: ComponentDoc = {
  path: 'componentes/consola',
  name: 'NexConsole',
  eyebrow: 'Componentes · Ejecución',
  summary: 'La entrada y la salida de un programa en una sola superficie. Consola: stdout, stderr y stdin en el orden real, con la línea de entrada detrás de su prompt. NexView: la misma ejecución compuesta (tablas, matrices, JSON, imágenes, figuras, diagnósticos). Cambiar de vista no ejecuta nada.',
  status: 'laboratorio',
  wide: true,
  imports: [{ names: ['NexConsole', 'NexLiveConsole'], from: '@nexfluid/react' }, { names: ['createSessionStore', 'fromNexBookOutputs', 'fromTerminalSegments'], from: '@nexfluid/components' }],
  origin: <>ProgramTerminal, StdinField y NexView de Nextudio</>,
  controls: [],
  render: () => <ConsoleShowcase which="normal" />,
  code: () => `<NexConsole
  outputs={outputs}            // NexConsoleOutput[] ordenadas por seq
  state={state}                // idle · running · waiting_for_input · completed · failed · cancelled…
  view={view} onViewChange={setView}
  onSubmitInput={(text) => session.submit(text)}   // false si ya no espera
  onInterrupt={() => session.interrupt()}
  renderers={{ figure: (o) => <Plot figure={o.data} />, image: (o) => <Asset id={o.assetId} /> }}
/>

// Desde un NexBook guardado, sin migrar:
const outputs = fromNexBookOutputs(result.outputs, { imageSrc: (id) => assetUrl(id) });`,
  showcases: [
    { title: 'Composición de NexView · 14 casos', lead: 'Anclas (texto, avisos, entrada) en su sitio; entre ellas, filas proporcionales y galerías. Cambia el ancho del contenedor: la composición se adapta sin reorganizarse en cada píxel.', render: () => <ViewCases /> },
    { title: 'Sesión persistente (NexLiveSession)', lead: 'El programa sigue vivo: salida incremental, pide entrada, responde, produce nuevas tablas y termina o se interrumpe. Cambiar de vista no pierde nada.', render: () => <LiveSessionDemo /> },
    { title: 'Programa que pide varias entradas', lead: 'La entrada aparece sólo cuando el programa espera; lo pegado en varias líneas contesta las siguientes preguntas.', render: () => <ConsoleShowcase which="stdin" /> },
    { title: 'Salidas mixtas', lead: 'Texto, una matriz reconocida en lo impreso (no confirmada por el runtime), una advertencia, una tabla, una imagen y una figura con el renderizador de la aplicación.', render: () => <ConsoleShowcase which="mixed" /> },
    { title: 'Error y cancelación', lead: 'En NexView, el traceback es un diagnóstico con su sugerencia; el mensaje original sigue a mano.', render: () => <ConsoleShowcase which="failing" /> },
    { title: 'Salida extensa', lead: 'El scroll sigue al final sólo si estás abajo. Detener (o Ctrl+C en la línea de entrada) interrumpe.', render: () => <ConsoleShowcase which="long" /> },
  ],
  api: [{
    component: 'NexConsole',
    rows: [
      { name: 'outputs', type: 'NexConsoleOutput[]', description: 'stdout/stderr/error/input, table, image, json, figure, custom. Se ordenan por `seq`.' },
      { name: 'state', type: 'NexConsoleState', description: 'Ciclo de la sesión interactiva de Nextudio.' },
      { name: 'view · defaultView · onViewChange', type: "'console' | 'nexview'", default: "'console'", description: 'Presentación, controlada o no. No re-ejecuta.' },
      { name: 'onSubmitInput · onInterrupt', type: '(text) => boolean · () => void', description: 'Entrada interactiva (una línea o varias pegadas) y Detener / Ctrl+C.' },
      { name: 'stdin', type: '{ value, onChange, label? }', description: 'Entrada anticipada, para runtimes que la aceptan antes de ejecutar.' },
      { name: 'renderers', type: '{ image?, figure?, custom? }', description: 'Formatos que pinta la aplicación (Plotly, assets…).' },
      { name: 'onRun · runLabel · runDisabled', type: '…', description: 'Ejecutar desde la barra. La ejecución es de la aplicación.' },
      { name: 'connection · dropped · terminal · actions', type: '…', description: 'Sesión viva: conexión, salidas descartadas, superficie de un emulador y acciones.' },
      { name: 'durationMs · truncated · queued · maxRows · maxInputChars · height', type: '…', description: 'Duración, recorte, líneas en espera y límites.' },
    ],
  }, {
    component: 'NexLiveConsole · createSessionStore',
    rows: [
      { name: 'session', type: 'NexSessionStore', description: 'createSessionStore({ id, kind: run | interactive | pty, maxOutputs }). apply(event): output AÑADE, chunk ACTUALIZA la región activa, flush la cierra; state, connection, exit, bytes.' },
      { name: 'transport', type: 'NexSessionTransport', description: 'send, interrupt?, close?, reconnect?, resize?: sólo lo que la sesión admite (SESSION_CAPABILITIES).' },
      { name: 'emulator', type: 'NexTerminalEmulator', description: 'Para pty: mount, write, onData, fit, dispose. Recibe los bytes tal cual; NexFluidUI no interpreta ANSI.' },
    ],
  }],
  keyboard: [['Intro', 'Envía la línea (respeta la composición IME)'], ['Pegar varias líneas', 'La primera contesta; el resto espera'], ['Ctrl + C', 'Detener (sin texto seleccionado)']],
  a11y: [
    'La salida es un role="log" con aria-live; el estado, un role="status".',
    'Los errores fatales de NexView son role="alert"; la marca del diagnóstico no depende sólo del color.',
    'La evidencia se rotula: «runtime» (confirmado) frente a «reconocido» (inferido del texto).',
  ],
};

const SAMPLE = `# Plan de la práctica

Medimos **cuatro servicios** del campus y comparamos la espera en *hora punta*.

- Banco y cafetería
- Ventanilla escolar

> La espera es el precio de la variabilidad.

| Servicio | Minutos |
|---|---|
| Banco | 4.2 |

Consulta [la guía](https://example.org/guia) y usa \`numpy\`.`;

function MarkdownFieldDemo() {
  const [value, setValue] = useState(SAMPLE);
  return (
    <div style={{ display: 'grid', gap: 16, width: 'min(640px, 100%)', textAlign: 'left' }}>
      <NexMarkdownField label="Plan de la práctica" value={value} onChange={setValue} />
      <details><summary className="nx-type-small">Markdown guardado</summary><pre className="nx-type-small" style={{ whiteSpace: 'pre-wrap' }}>{value}</pre></details>
    </div>
  );
}

export const markdownFieldDoc: ComponentDoc = {
  path: 'componentes/markdown-field',
  name: 'NexMarkdownField',
  eyebrow: 'Componentes · Contenido',
  summary: 'Escribir Markdown sin verlo, o verlo cuando hace falta. Tres perspectivas del mismo valor: Visual (el texto ya compuesto; tablas, código y fórmulas quedan como islas intactas), Markdown (la fuente) y Vista (la lectura). NexInk aparece al seleccionar.',
  status: 'laboratorio',
  imports: [{ names: ['NexMarkdownField'], from: '@nexfluid/react/markdown' }],
  origin: <>el bloque de texto de NexBook (NexBookMarkdownEditor)</>,
  controls: [],
  render: () => <MarkdownFieldDemo />,
  code: () => `<NexMarkdownField label="Texto" value={markdown} onChange={setMarkdown} />`,
  api: [{
    component: 'NexMarkdownField',
    rows: [
      { name: 'value · onChange', type: 'string', description: 'Siempre Markdown. Los bloques que no se tocan vuelven byte a byte.' },
      { name: 'mode · defaultMode · onModeChange', type: "'visual' | 'source' | 'view'", default: "'visual'", description: 'Edición compuesta, fuente o lectura. El valor no cambia al pasar de una a otra.' },
      { name: 'commands', type: 'NexInkCommand[]', default: 'MARKDOWN_INK_COMMANDS', description: 'Las herramientas de NexInk.' },
      { name: 'modeSwitch · placeholder · readOnly · markdown', type: '…', description: 'Cambio de modo propio, texto vacío, lectura y opciones de NexMarkdown.' },
    ],
  }],
  keyboard: [['Ctrl/⌘ + B · I · E · K', 'Negrita · cursiva · código · enlace'], ['Doble clic en una isla', 'Editarla en Markdown']],
  a11y: ['El editor es un role="textbox" multilínea con nombre.', 'La barra de formato es NexInk: role="toolbar" con aria-pressed (incluido mixed) y atajos; Alt+F10 la alcanza desde el texto.', 'Pegar inserta texto plano.'],
};

function DataViewDemo() {
  const [sheet, setSheet] = useState<SheetData>(() => {
    const s = sheetFromRows('Esperas', [['Servicio', 'Hora punta', 'Resto'], ['Banco', 4.2, 3.1], ['Cafetería', 7.8, 2.4], ['Ventanilla', 12.5, 6.9], ['Total', '=SUMA(B2:B4)', '=SUMA(C2:C4)']]);
    return { rows: s.rows, columns: s.columns, cells: s.cells };
  });
  return <div style={{ width: 'min(640px, 100%)', textAlign: 'left' }}><NexDataView title="Minutos de espera" sheet={sheet} onChange={setSheet} /></div>;
}

export const dataViewDoc: ComponentDoc = {
  path: 'componentes/data-view',
  name: 'NexDataView',
  eyebrow: 'Componentes · Datos',
  summary: 'Los datos de una hoja dentro de un documento, como tabla o gráfico, con las fórmulas evaluadas. «Abrir en NexSheets» transforma la vista en el editor completo; o lo delega en la aplicación con onOpenSheets. Un solo dato: tabla, gráfico y editor no se desincronizan.',
  status: 'laboratorio',
  imports: [{ names: ['NexDataView'], from: '@nexfluid/react/sheets' }],
  origin: <>la tabla y la gráfica de un bloque de hoja de NexBook</>,
  controls: [],
  render: () => <DataViewDemo />,
  code: () => `<NexDataView title="Esperas" sheet={sheet} onChange={setSheet} />

// La experiencia completa la pone la aplicación:
<NexDataView title="Esperas" sheet={sheet} onChange={setSheet}
  onOpenSheets={({ sheet, commit }) => openFocus(sheet, commit)} />`,
  api: [{
    component: 'NexDataView',
    rows: [
      { name: 'sheet · onChange', type: 'SheetData', description: 'El formato de NexSheets Core. Sin onChange, sólo lectura.' },
      { name: 'view · defaultView · onViewChange', type: "'table' | 'chart'", default: "'table'", description: 'Vista.' },
      { name: 'onOpenSheets', type: '(request) => void', description: 'Delegar el editor: recibe { sheet, title, commit }.' },
      { name: 'title · headerRow · controls · motion', type: '…', description: 'Título, primera fila como encabezado, controles propios y movimiento.' },
    ],
  }],
  keyboard: [['Tab', 'Llega a Tabla / Gráfico y a «Abrir en NexSheets»'], ['Escape (editor abierto)', 'Vuelve al documento']],
  a11y: ['La tabla tiene caption y encabezados de fila y columna.', 'El gráfico es role="img" con un resumen de los valores.', 'El editor abierto es modal con título y botón de vuelta.'],
};
