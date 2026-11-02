import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NexButton, NexCodeBlock, NexSegmented } from '@eclipsis/react';
import { NexSheets, createWorkbook, evaluateSheet, sheetFromRows, type Workbook } from '@eclipsis/react/sheets';
import type { ComponentDoc } from '../docs/component-page.tsx';
import { jsx, type Values } from '../docs/kit.tsx';
import { example } from '../examples/index.ts';

/** Libro de ejemplo: proyectos con horas y desvíos (fórmulas reales) y métricas semanales. */
export function sampleWorkbook(): Workbook {
  const projects = sheetFromRows('Proyectos', [
    ['Proyecto', 'Responsable', 'Estado', 'Horas est.', 'Horas reales', 'Desvío', '% usado'],
    ['NexFrame', 'Ana', 'En curso', 120, 134, '=E2-D2', '=REDONDEAR(E2/D2*100;1)'],
    ['NexMorph', 'Luis', 'Hecho', 80, 72, '=E3-D3', '=REDONDEAR(E3/D3*100;1)'],
    ['NexScroll', 'Marta', 'En curso', 60, 41, '=E4-D4', '=REDONDEAR(E4/D4*100;1)'],
    ['NexSheets', 'Iker', 'Diseño', 140, 38, '=E5-D5', '=REDONDEAR(E5/D5*100;1)'],
    ['NexDocs', 'Sara', 'Hecho', 90, 96, '=E6-D6', '=REDONDEAR(E6/D6*100;1)'],
    ['Total', '', '=CONTARA(A2:A6)&" proyectos"', '=SUMA(D2:D6)', '=SUMA(E2:E6)', '=E7-D7', '=REDONDEAR(E7/D7*100;1)'],
  ], { rows: 60, columns: 12 });
  projects.columnWidths = { 0: 132, 1: 110, 2: 104 };
  const metrics = sheetFromRows('Métricas', [
    ['Semana', 'Visitas', 'Conversiones', 'Tasa %'],
    ...Array.from({ length: 12 }, (_, i) => [`Semana ${i + 1}`, 1200 + i * 140 + (i % 3) * 55, 36 + i * 5 + (i % 4) * 3, `=REDONDEAR(C${i + 2}/B${i + 2}*100;2)`]),
    ['Media', '=PROMEDIO(B2:B13)', '=PROMEDIO(C2:C13)', '=REDONDEAR(PROMEDIO(D2:D13);2)'],
  ], { rows: 200, columns: 10 });
  return createWorkbook([projects, metrics]);
}

function LiveSpreadsheet({ v }: { v: Values }) {
  const [workbook, setWorkbook] = useState(sampleWorkbook);
  return (
    <div className="doc-sheets-live">
      <NexSheets
        workbook={workbook}
        onChange={setWorkbook}
        motion={v.motion as never}
        readOnly={Boolean(v.readOnly)}
        inspector={Boolean(v.inspector)}
        height={Number(v.height)}
        label="Libro de proyectos"
      />
    </div>
  );
}

/* ---- Interaction Lab ---------------------------------------------------- */

const SCENARIOS = {
  errores: () => createWorkbook([sheetFromRows('Errores', [
    ['Caso', 'Fórmula', 'Resultado'],
    ['División entre cero', "'=10/0", '=10/0'],
    ['Función desconocida', "'=SUMAR(1;2)", '=SUMAR(1;2)'],
    ['Fuera de la hoja', "'=Z999", '=Z999'],
    ['Ciclo', "'=C5+1", '=C5+1'],
    ['Texto en aritmética', "'=\"a\"*2", '="a"*2'],
  ], { rows: 30, columns: 6 })]),
  rangos: () => createWorkbook([sheetFromRows('Rangos', [
    ['Mes', 'Norte', 'Sur', 'Este'],
    ...['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'].map((m, i) => [m, 100 + i * 12, 80 + i * 9, 60 + i * 15]),
  ], { rows: 40, columns: 8 })]),
  relleno: () => createWorkbook([sheetFromRows('Autollenado', [
    ['Serie', 'Texto', 'Fórmula', 'Patrón'],
    [1, 'Semana 1', '=A2*10', 'alto'],
    [3, '', '', 'bajo'],
  ], { rows: 40, columns: 8 })]),
  desplazamiento: () => createWorkbook([sheetFromRows('Grande', Array.from({ length: 2000 }, (_, r) => Array.from({ length: 40 }, (_, c) => (r === 0 ? `Col ${c + 1}` : r * 40 + c))), { rows: 2000, columns: 40 })]),
} as const;
type Scenario = keyof typeof SCENARIOS;
const GUIDE: Record<Scenario, string> = {
  errores: 'Cada error se ve en la celda y se explica en la barra de fórmulas. La columna B guarda la fórmula como texto (comilla inicial).',
  rangos: 'Arrastra o usa Mayús + flechas para un rango: el contorno se extiende con continuidad y la barra de estado resume suma, promedio, mínimo y máximo. Σ Suma escribe =SUMA() debajo.',
  relleno: 'Selecciona A2:A3 y arrastra el tirador hacia abajo: serie 5, 7, 9… B2 → Semana 2, 3…; C2 desplaza su referencia; D repite el patrón. Ctrl+Z lo deshace.',
  desplazamiento: '2 000 × 40 celdas. Sólo se pintan las visibles; los dos carriles representan el desplazamiento nativo. Ctrl + flecha salta a los bordes; Re Pág / Av Pág por pantallas.',
};

function InteractionLab() {
  const [scenario, setScenario] = useState<Scenario>('rangos');
  const [reduced, setReduced] = useState(false);
  const initial = useMemo(() => SCENARIOS[scenario](), [scenario]);
  return (
    <div className="doc-sheets-lab">
      <div className="doc-sheets-lab__bar">
        <NexSegmented aria-label="Escenario" density="compact" value={scenario} onValueChange={(s) => setScenario(s as Scenario)} options={[
          { value: 'rangos', label: 'Rangos' }, { value: 'relleno', label: 'Autollenado' }, { value: 'errores', label: 'Errores' }, { value: 'desplazamiento', label: 'Desplazamiento' },
        ]} />
        <label className="doc-sheets-lab__check"><input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} /> Movimiento reducido</label>
      </div>
      <p className="doc-hint">{GUIDE[scenario]}</p>
      <NexSheets key={scenario} defaultWorkbook={initial} motion={reduced ? 'none' : 'fluid'} height={380} label={`Escenario ${scenario}`} />
    </div>
  );
}

/* ---- Performance (medido en este navegador) -------------------------------- */

interface Measure { rows: number; cells: number; build: number; evaluate: number; mount: number; dom: number; scroll: number | null }

function bigWorkbook(rows: number): Workbook {
  const data = Array.from({ length: rows }, (_, r) => (r === 0
    ? ['Id', 'Valor', 'Doble', 'Acumulado', 'Etiqueta', 'Grupo', 'Peso', 'Total']
    : [r, (r * 37) % 1000, `=B${r + 1}*2`, r === 1 ? '=B2' : `=D${r}+B${r + 1}`, `fila ${r}`, `g${r % 7}`, (r % 13) / 10, `=B${r + 1}*G${r + 1}`]));
  return createWorkbook([sheetFromRows(`${rows.toLocaleString('es-MX')} filas`, data, { rows, columns: 10 })]);
}

function PerformanceBench() {
  const [size, setSize] = useState<number | null>(null);
  const [wb, setWb] = useState<Workbook | null>(null);
  const [results, setResults] = useState<Measure[]>([]);
  const pending = useRef<Partial<Measure> & { t0?: number } | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const run = (rows: number) => {
    const t0 = performance.now();
    const next = bigWorkbook(rows);
    const t1 = performance.now();
    evaluateSheet(next.sheets[0]!);
    const t2 = performance.now();
    pending.current = { rows, cells: Object.keys(next.sheets[0]!.cells).length, build: t1 - t0, evaluate: t2 - t1, t0: performance.now() };
    setSize(rows);
    setWb(next);
  };
  useLayoutEffect(() => {
    const p = pending.current;
    if (!p || !wb) return;
    const mount = performance.now() - p.t0!;
    const dom = host.current?.querySelectorAll('.nx-sheet__cell').length ?? 0;
    pending.current = null;
    // Desplazamiento: 30 saltos de pantalla, midiendo el tiempo hasta pintar la nueva ventana.
    const viewport = host.current?.querySelector<HTMLElement>('.nx-sheet__viewport');
    const finish = (scroll: number | null) => setResults((r) => [{ rows: p.rows!, cells: p.cells!, build: p.build!, evaluate: p.evaluate!, mount, dom, scroll }, ...r].slice(0, 8));
    if (!viewport) { finish(null); return; }
    let i = 0;
    const times: number[] = [];
    const step = () => {
      const t = performance.now();
      viewport.scrollTop += viewport.clientHeight;
      viewport.dispatchEvent(new Event('scroll'));
      requestAnimationFrame(() => {
        times.push(performance.now() - t);
        if (++i < 30) step();
        else { viewport.scrollTop = 0; finish(times.reduce((a, b) => a + b, 0) / times.length); }
      });
    };
    requestAnimationFrame(step);
  }, [wb]);
  const ms = (n: number | null) => (n === null ? '—' : `${n.toFixed(1)} ms`);
  return (
    <div className="doc-sheets-perf">
      <div className="doc-sheets-lab__bar">
        {[1_000, 10_000, 50_000].map((n) => <NexButton key={n} density="compact" appearance={size === n ? 'filled' : 'default'} onClick={() => run(n)}>{n.toLocaleString('es-MX')} filas</NexButton>)}
      </div>
      <div className="doc-table-wrap" role="region" aria-label="Mediciones" tabIndex={0}>
        <table className="doc-table">
          <caption>Medido ahora, en este navegador (no son cifras de referencia)</caption>
          <thead><tr><th>Filas</th><th>Celdas</th><th>Crear libro</th><th>Evaluar fórmulas</th><th>Montar rejilla</th><th>Celdas en el DOM</th><th>Desplazamiento (media por pantalla, hasta el siguiente fotograma)</th></tr></thead>
          <tbody>
            {results.length === 0 && <tr><td colSpan={7}>Pulsa un tamaño para medir.</td></tr>}
            {results.map((r, i) => <tr key={i}><th>{r.rows.toLocaleString('es-MX')}</th><td>{r.cells.toLocaleString('es-MX')}</td><td>{ms(r.build)}</td><td>{ms(r.evaluate)}</td><td>{ms(r.mount)}</td><td>{r.dom}</td><td>{ms(r.scroll)}</td></tr>)}
          </tbody>
        </table>
      </div>
      <div ref={host}>{wb && <NexSheets key={size ?? 0} defaultWorkbook={wb} height={320} toolbar={false} label="Hoja de rendimiento" />}</div>
    </div>
  );
}

const INTEGRATION = `// Adaptador NexBook ⇄ NexSheets (futuro, en Nextudio).
// La hoja de NexBook y la de NexSheets comparten contrato: { rows, columns, cells: { "r:c": { input } }, headers? }.
import { NexSheets, createSheet, createWorkbook, type Workbook } from '@eclipsis/react/sheets';

const NEXBOOK_LIMITS = { maxRows: 200, maxColumns: 40, maxCells: 2_000, maxCellChars: 300 };

export function toWorkbook(block: { id: string; name: string; sheet: NexBookSheetData }): Workbook {
  return createWorkbook([createSheet(block.name, block.sheet, block.id)]);
}

export function fromWorkbook(workbook: Workbook): NexBookSheetData {
  const { rows, columns, cells, headers } = workbook.sheets[0]!;
  return { rows, columns, cells, ...(headers ? { headers } : {}) };
}

<NexSheets
  workbook={toWorkbook(block)}
  onChange={(wb) => onChange(fromWorkbook(wb))}
  limits={NEXBOOK_LIMITS}
  readOnly={!editable}
/>`;

const editing = example('sheets-basic');
const composed = example('sheets-composed');

export const sheetsDoc: ComponentDoc = {
  path: 'widgets/sheets',
  name: 'NexSheets',
  eyebrow: 'Widgets · Hojas de cálculo',
  summary: 'Un editor de hojas de cálculo real: rejilla virtual, barra de fórmulas, pestañas, autollenado, historial, CSV y portapapeles TSV. El motor de fórmulas y el modelo de datos proceden del editor de hojas de Nextudio; la selección es una superficie fluida que viaja con precisión.',
  status: 'laboratorio',
  wide: true,
  imports: [{ names: ['NexSheets', 'createWorkbook', 'sheetFromRows'], from: '@eclipsis/react/sheets' }, { names: ['evaluateSheet', 'fillRange', 'createHistory'], from: '@eclipsis/sheets' }],
  origin: <>editor de hojas de NexBook y su modo enfoque (motor de fórmulas, direcciones, ediciones y CSV)</>,
  controls: [
    { kind: 'select', name: 'motion', label: 'Movimiento', options: ['none', 'subtle', 'fluid', 'elastic'], initial: 'fluid' },
    { kind: 'boolean', name: 'inspector', label: 'Inspector de celda', initial: true },
    { kind: 'boolean', name: 'readOnly', label: 'Sólo lectura', initial: false },
    { kind: 'number', name: 'height', label: 'Altura', initial: 520, min: 320, max: 760, step: 20 },
  ],
  render: (v) => <LiveSpreadsheet v={v} />,
  showcases: [
    { title: 'Interaction Lab', lead: 'Selección, rangos, edición, autollenado, desplazamiento, errores y movimiento reducido, cada uno con datos pensados para probarlo.', render: () => <InteractionLab /> },
    { title: 'Rendimiento', lead: 'Hojas generadas de distintos tamaños, medidas en tu navegador: crear, evaluar, montar y desplazarse. La rejilla sólo pinta las celdas visibles.', render: () => <PerformanceBench /> },
    { title: 'Integración con Nextudio', lead: 'NexSheets no importa nada de Nextudio. El contrato de hoja es el mismo, así que un adaptador es una conversión de identidad más los límites de NexBook.', render: () => <NexCodeBlock language="tsx" title="nexbook-adapter.tsx" code={INTEGRATION} /> },
  ],
  code: (v) => jsx('NexSheets', {
    workbook: { code: 'workbook' }, onChange: { code: 'setWorkbook' }, motion: v.motion as string, inspector: Boolean(v.inspector) || undefined,
    readOnly: Boolean(v.readOnly) || undefined, height: { code: String(v.height) },
  }, undefined, { motion: 'fluid' }),
  api: [
    {
      component: 'NexSheets',
      rows: [
        { name: 'workbook / defaultWorkbook', type: 'Workbook', description: 'Libro controlado o inicial. `createWorkbook`, `sheetFromRows` y `parseWorkbook` lo construyen.' },
        { name: 'onChange', type: '(workbook: Workbook) => void', description: 'Cada cambio de datos (una edición, un pegado, un relleno, deshacer…). El libro es inmutable.' },
        { name: 'readOnly', type: 'boolean', default: 'false', description: 'Se navega, selecciona y copia; no se edita.' },
        { name: 'motion', type: "'none' | 'subtle' | 'fluid' | 'elastic'", default: 'contexto', description: 'Movimiento de la selección. none o movimiento reducido: salta, sin animación.' },
        { name: 'limits', type: 'SheetLimits', default: 'DEFAULT_SHEET_LIMITS', description: 'Topes de filas, columnas, celdas y caracteres (NexBook: 200 × 40, 2 000 celdas).' },
        { name: 'toolbar / formulaBar / tabs / statusBar / inspector', type: 'boolean', description: 'Piezas del editor completo.' },
        { name: 'height', type: 'number | string', default: '560', description: 'Alto del editor.' },
      ],
    },
    {
      component: 'Piezas',
      rows: [
        { name: 'NexSheets.Provider', type: 'NexSheetsProviderProps', description: 'Estado compartido sin interfaz, para componer.' },
        { name: 'NexSheets.Grid', type: '{ label? }', description: 'Rejilla virtual (role=grid) con selección fluida, editor en celda y autollenado.' },
        { name: 'NexSheets.FormulaBar', type: '—', description: 'Referencia, lo escrito y el error con su explicación.' },
        { name: 'NexSheets.Tabs · Toolbar · StatusBar · Inspector', type: '—', description: 'Pestañas de hojas, herramientas, estado con resumen numérico, inspector de celda.' },
        { name: 'useNexSheets()', type: 'NexSheetsController', description: 'select, move, write, paste, fill, undo, redo, addSheet, importCsv, exportCsv…' },
      ],
    },
    {
      component: '@eclipsis/sheets (Core)',
      rows: [
        { name: 'Libro', type: 'createWorkbook · addSheet · renameSheet · removeSheet · updateSheet', description: 'Operaciones puras e inmutables.' },
        { name: 'Fórmulas', type: 'evaluateSheet · FORMULA_NAMES', description: 'Intérprete cerrado sin eval, en español e inglés. Sin referencias entre hojas, matrices ni fechas.' },
        { name: 'Edición', type: 'setCellInput · pasteGrid · clearRange · fillRange · shiftFormula', description: 'Pegado TSV, autollenado (series, texto numerado, fórmulas relativas).' },
        { name: 'E/S', type: 'csvToSheet · toCsv · serializeWorkbook · parseWorkbook', description: 'CSV con detección de delimitador y protección contra fórmulas inyectadas; JSON validado.' },
        { name: 'Interacción', type: 'createHistory · moveSelection · stepInside · createAxis', description: 'Historial por instantáneas, teclado de hoja y ejes para virtualizar.' },
      ],
    },
  ],
  examples: [
    { title: 'Editor completo', description: 'Un libro controlado con datos propios.', ...editing },
    { title: 'Composición propia', description: 'Provider + Grid + FormulaBar + StatusBar, sin barra de herramientas ni pestañas.', ...composed },
  ],
  keyboard: [
    ['Flechas', 'Mover la celda activa'], ['Mayús + flechas', 'Extender el rango'], ['Ctrl/⌘ + flecha', 'Saltar al borde de los datos'],
    ['Intro / Mayús + Intro', 'Editar (o bajar al confirmar) / subir'], ['Tab / Mayús + Tab', 'Siguiente / anterior celda (recorre el rango)'],
    ['F2 o escribir', 'Editar la celda (escribir sustituye)'], ['Escape', 'Cancelar la edición'], ['Supr / Retroceso', 'Vaciar la selección'],
    ['Ctrl/⌘ + C, X, V', 'Copiar, cortar, pegar (TSV, compatible con otras hojas)'], ['Ctrl/⌘ + Z, Y', 'Deshacer, rehacer'],
    ['Re Pág / Av Pág, Inicio, Fin', 'Por pantallas y extremos de fila (con Ctrl: de la hoja)'], ['Ctrl/⌘ + A', 'Seleccionar todo'],
  ],
  a11y: [
    'La rejilla es role="grid" con aria-rowcount/colcount: aunque sólo se pinten las celdas visibles, los lectores conocen el tamaño real.',
    'El foco se queda en la rejilla; la celda activa se anuncia con aria-activedescendant y siempre está en el DOM.',
    'Encabezados de fila y columna reales (rowheader, columnheader). Las acciones (copiar, pegar, deshacer) se anuncian en una región viva.',
    'El editor en celda y la barra de fórmulas comparten el borrador; el foco nunca salta de uno a otro.',
    'Los errores de fórmula se explican en texto (aria-describedby), no sólo con color.',
    'Con movimiento reducido o motion="none", la selección salta sin animación. La animación nunca retrasa la edición: el dato cambia al instante.',
  ],
  requires: ['@eclipsis/sheets (dependencia de @eclipsis/react).', 'Pendiente: XLSX (el lector de Nextudio depende de fflate), referencias entre hojas, formato de celdas, inmovilizar paneles.'],
};
