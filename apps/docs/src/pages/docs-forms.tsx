import { useState } from 'react';
import { NexCheckbox, NexIcon, NexInput, NexSelect, type NexSelectOption } from '@eclipsis/react';
import type { ComponentDoc } from '../docs/component-page.tsx';
import { jsx } from '../docs/kit.tsx';

/* ---- Lenguajes, como el selector de NexBook ------------------------------------ */

/**
 * Imagen de ejemplo para el patrón «Powered by [logotipo]». En Nextudio va el
 * logotipo oficial del motor que de verdad ejecuta el lenguaje (p. ej. CheerpJ
 * para Java): sus condiciones de atribución limitan su uso a ese caso, así que
 * aquí se muestra una marca neutra dibujada para la demostración.
 */
const ENGINE_MARK = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="92" height="24" viewBox="0 0 92 24"><rect x="1" y="3" width="18" height="18" rx="6" fill="#ad3f1c"/><circle cx="10" cy="12" r="3.4" fill="#fff"/><text x="25" y="17" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#22232a">Runtime</text></svg>')}`;

export const SIMPLE_LANGUAGES: NexSelectOption[] = [
  { value: 'python', label: 'Python' },
  { value: 'r', label: 'R' },
  { value: 'java', label: 'Java' },
  { value: 'prolog', label: 'Prolog' },
  { value: 'cpp', label: 'C++', disabled: true },
  { value: 'html', label: 'Página HTML' },
];

export const DETAILED_LANGUAGES: NexSelectOption[] = [
  { value: 'python', label: 'Python', description: 'Ejecución local · Pyodide · listo', media: <NexIcon name="play" /> },
  { value: 'r', label: 'R', description: 'Ejecución local · webR · listo', media: <NexIcon name="play" /> },
  {
    value: 'java', label: 'Java', keywords: 'Java 17 Powered by motor',
    description: <>Java 17 · Powered by <img src={ENGINE_MARK} alt="Runtime (logotipo de ejemplo)" width={69} height={18} /> · listo</>,
    media: <NexIcon name="play" />,
  },
  { value: 'prolog', label: 'Prolog', description: 'Ejecución local · Tau Prolog · listo', media: <NexIcon name="play" /> },
  { value: 'cpp', label: 'C++', description: 'Nube · no disponible ahora', media: <NexIcon name="external" />, disabled: true },
  { value: 'html', label: 'Página HTML', description: 'Edición · proyecto web', media: <NexIcon name="file" /> },
];

const GROUPED: NexSelectOption[] = [
  ...['Python', 'R', 'Julia', 'Octave'].map((l) => ({ value: l.toLowerCase(), label: l, group: 'Datos y ciencia' })),
  ...['Java', 'Kotlin', 'C++', 'C', 'Rust', 'Go'].map((l) => ({ value: l.toLowerCase(), label: l, group: 'Sistemas' })),
  ...['JavaScript', 'TypeScript', 'Página HTML'].map((l) => ({ value: l.toLowerCase().replace(/\s/g, '-'), label: l, group: 'Web' })),
  ...['Prolog', 'Haskell'].map((l) => ({ value: l.toLowerCase(), label: l, group: 'Lógica y funcional' })),
];

function SelectPreview({ density, showDescription, error }: { density: string; showDescription: boolean; error: boolean }) {
  const [simple, setSimple] = useState<string | null>('python');
  const [detailed, setDetailed] = useState<string | null>('java');
  const [grouped, setGrouped] = useState<string | null>(null);
  return (
    <div className="doc-forms">
      <NexSelect label="Lenguaje (lista simple)" options={SIMPLE_LANGUAGES} value={simple} onValueChange={setSimple} density={density as never} />
      <NexSelect
        label="Lenguaje del bloque"
        options={DETAILED_LANGUAGES}
        value={detailed}
        onValueChange={setDetailed}
        showDescription={showDescription}
        density={density as never}
        description="Cada opción dice dónde se ejecuta y con qué motor, como en NexBook."
      />
      <NexSelect
        label="Lenguaje (agrupado, con búsqueda)"
        options={GROUPED}
        value={grouped}
        onValueChange={setGrouped}
        placeholder="Elige un lenguaje"
        searchLabel="Buscar lenguaje"
        density={density as never}
        required
        error={error && !grouped ? 'Elige un lenguaje para continuar.' : undefined}
      />
      <p className="doc-hint" style={{ margin: 0 }} aria-live="polite">Valores: <code>{simple ?? '—'}</code> · <code>{detailed ?? '—'}</code> · <code>{grouped ?? '—'}</code></p>
    </div>
  );
}

export const selectDoc: ComponentDoc = {
  path: 'componentes/select',
  name: 'NexSelect',
  eyebrow: 'Componentes · Formularios',
  summary: 'Elegir una opción de una lista con opciones ricas: detalle en segunda línea, imagen o logotipo, grupos, deshabilitadas y búsqueda. Es el selector de lenguajes de NexBook convertido en componente.',
  status: 'piloto',
  wide: true,
  imports: [{ names: ['NexSelect'], from: '@eclipsis/react' }],
  origin: <>selector de lenguaje de NexBook (lista con motor y atribución)</>,
  controls: [
    { kind: 'select', name: 'density', label: 'Densidad', options: ['compact', 'comfortable', 'spacious'], initial: 'comfortable' },
    { kind: 'boolean', name: 'showDescription', label: 'Detalle en el disparador', initial: true },
    { kind: 'boolean', name: 'error', label: 'Mostrar error si está vacío', initial: true },
  ],
  render: (v) => <SelectPreview density={String(v.density)} showDescription={Boolean(v.showDescription)} error={Boolean(v.error)} />,
  code: (v) => jsx('NexSelect', {
    label: 'Lenguaje del bloque', options: { code: 'languages' }, value: { code: 'language' }, onValueChange: { code: 'setLanguage' },
    showDescription: Boolean(v.showDescription) || undefined, density: v.density as string,
  }, undefined, { density: 'comfortable' }),
  api: [
    {
      component: 'NexSelect',
      rows: [
        { name: 'options', type: 'NexSelectOption[]', description: '{ value, label, description?, media?, disabled?, group?, keywords? }' },
        { name: 'value / defaultValue / onValueChange', type: 'string | null', description: 'Controlado o no.' },
        { name: 'label', type: 'ReactNode', description: 'Obligatoria (hideLabel la oculta sin quitarle el nombre).' },
        { name: 'searchable', type: 'boolean', default: '> 8 opciones', description: 'Campo de búsqueda que filtra por etiqueta, detalle de texto y keywords (sin acentos).' },
        { name: 'showDescription', type: 'boolean', default: 'false', description: 'La opción elegida enseña también su detalle.' },
        { name: 'placeholder · description · error · required · disabled', type: '…', description: 'Como el resto de campos.' },
        { name: 'name', type: 'string', description: 'Se envía en formularios con un input oculto.' },
        { name: 'density · motion', type: 'NexDensity · NexMotion', description: 'La gota líquida marca la opción activa.' },
      ],
    },
  ],
  keyboard: [
    ['↓ / ↑, Intro, Espacio', 'Abrir; con la lista abierta, recorrer'], ['Inicio / Fin, Re Pág / Av Pág', 'Primera / última, saltos de 8'],
    ['Intro, Espacio', 'Elegir la opción activa y cerrar'], ['Tab', 'Elegir y salir'], ['Escape', 'Cerrar sin cambiar'],
    ['Escribir', 'Saltar a la opción que empieza así (con búsqueda: filtrar)'],
  ],
  a11y: [
    'Patrón WAI-ARIA combobox + listbox: el disparador conserva el foco y señala la opción activa con aria-activedescendant.',
    'Con búsqueda, el campo es el combobox (aria-autocomplete="list") y la lista se filtra mientras se escribe.',
    'Las opciones deshabilitadas se anuncian (aria-disabled) y el teclado las salta.',
    'Las imágenes de una opción necesitan su texto alternativo; los iconos decorativos van ocultos.',
    'Los logotipos de terceros (p. ej. CheerpJ en NexBook) se usan según sus condiciones de atribución: sólo donde ese motor ejecuta de verdad.',
  ],
};

/* ---- NexInput ------------------------------------------------------------------ */

function InputPreview({ density, invalid }: { density: string; invalid: boolean }) {
  const [title, setTitle] = useState('Colas que esperan menos');
  const [url, setUrl] = useState('nexfluid.dev/practica-3');
  const [minutes, setMinutes] = useState('45');
  const slug = title.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return (
    <div className="doc-forms">
      <NexInput label="Título de la práctica" value={title} onChange={(e) => setTitle(e.target.value)} density={density as never} required
        description={`Dirección: /${slug || '…'}`} error={invalid && !title.trim() ? 'El título no puede estar vacío.' : undefined} maxLength={80} />
      <NexInput label="Buscar" type="search" placeholder="Archivos, bloques…" leading={<NexIcon name="search" />} density={density as never} />
      <NexInput label="Publicar en" value={url} onChange={(e) => setUrl(e.target.value)} leading="https://" density={density as never}
        error={invalid && /\s/.test(url) ? 'Una dirección no lleva espacios.' : undefined} />
      <NexInput label="Duración" type="number" min={5} max={240} step={5} value={minutes} onChange={(e) => setMinutes(e.target.value)} trailing="min" density={density as never}
        description={Number(minutes) ? `≈ ${(Number(minutes) / 60).toFixed(2)} h` : 'Escribe minutos'} />
    </div>
  );
}

export const inputDoc: ComponentDoc = {
  path: 'componentes/input',
  name: 'NexInput',
  eyebrow: 'Componentes · Formularios',
  summary: 'Campo de texto nativo con etiqueta, ayuda, error y adornos delante o detrás. Todo atributo de <input> funciona (type, pattern, autocomplete…).',
  status: 'piloto',
  wide: true,
  imports: [{ names: ['NexInput'], from: '@eclipsis/react' }],
  origin: <><code>.field</code> de Nextudio</>,
  controls: [
    { kind: 'select', name: 'density', label: 'Densidad', options: ['compact', 'comfortable', 'spacious'], initial: 'comfortable' },
    { kind: 'boolean', name: 'invalid', label: 'Validar', initial: true },
  ],
  render: (v) => <InputPreview density={String(v.density)} invalid={Boolean(v.invalid)} />,
  code: (v) => jsx('NexInput', { label: 'Título de la práctica', value: { code: 'title' }, onChange: { code: '(e) => setTitle(e.target.value)' }, required: true, error: { code: "!title ? 'El título no puede estar vacío.' : undefined" }, density: v.density as string }, undefined, { density: 'comfortable' }),
  api: [{
    component: 'NexInput',
    rows: [
      { name: 'label', type: 'ReactNode', description: 'Obligatoria; hideLabel la oculta visualmente.' },
      { name: 'description · error', type: 'ReactNode', description: 'Unidos con aria-describedby; error activa aria-invalid.' },
      { name: 'leading · trailing', type: 'ReactNode', description: 'Iconos, prefijos («https://») o unidades («min»).' },
      { name: '…props', type: 'InputHTMLAttributes', description: 'Se reenvían al <input> (ref incluida).' },
    ],
  }],
  keyboard: [['Tab', 'Entrar y salir del campo'], ['(nativo)', 'Edición, autocompletado y validación del navegador']],
  a11y: ['Etiqueta real (<label for>), obligatoria.', 'Ayuda y error unidos con aria-describedby; el error marca aria-invalid.', 'Un asterisco visual acompaña a required; el lector anuncia «obligatorio» por el atributo nativo.'],
};

/* ---- NexCheckbox --------------------------------------------------------------- */

const TASKS = ['Calcular la espera teórica', 'Completar la hoja de resultados', 'Escribir el informe'];

function CheckboxPreview({ density }: { density: string }) {
  const [done, setDone] = useState<boolean[]>([true, false, false]);
  const [terms, setTerms] = useState(false);
  const all = done.every(Boolean);
  const some = done.some(Boolean) && !all;
  return (
    <div className="doc-forms">
      <fieldset className="doc-forms__set">
        <legend>Tareas de la práctica</legend>
        <NexCheckbox label="Todas" checked={all} indeterminate={some} onChange={() => setDone(done.map(() => !all))} density={density as never} />
        <div className="doc-forms__nested">
          {TASKS.map((t, i) => <NexCheckbox key={t} label={t} checked={done[i]} onChange={(e) => setDone(done.map((d, j) => (j === i ? e.target.checked : d)))} density={density as never} />)}
        </div>
      </fieldset>
      <NexCheckbox label="Publicar el informe al entregar" description="Se verá en la página del curso." checked={terms} onChange={(e) => setTerms(e.target.checked)} density={density as never} />
      <NexCheckbox label="Ejecutar en la nube" description="No disponible en este curso." disabled density={density as never} />
      <p className="doc-hint" style={{ margin: 0 }} aria-live="polite">{done.filter(Boolean).length} de {TASKS.length} tareas hechas.</p>
    </div>
  );
}

export const checkboxDoc: ComponentDoc = {
  path: 'componentes/checkbox',
  name: 'NexCheckbox',
  eyebrow: 'Componentes · Formularios',
  summary: 'Casilla nativa con marca trazada, estado mixto real (indeterminate) y descripción. La membrana se redondea al marcarse.',
  status: 'piloto',
  imports: [{ names: ['NexCheckbox'], from: '@eclipsis/react' }],
  origin: <>casillas de tareas y ajustes de Nextudio</>,
  controls: [{ kind: 'select', name: 'density', label: 'Densidad', options: ['compact', 'comfortable', 'spacious'], initial: 'comfortable' }],
  render: (v) => <CheckboxPreview density={String(v.density)} />,
  code: () => jsx('NexCheckbox', { label: 'Todas', checked: { code: 'all' }, indeterminate: { code: 'some' }, onChange: { code: 'toggleAll' } }),
  api: [{
    component: 'NexCheckbox',
    rows: [
      { name: 'label · description · error', type: 'ReactNode', description: 'Etiqueta real y ayuda unida con aria-describedby.' },
      { name: 'indeterminate', type: 'boolean', description: 'Estado mixto (propiedad del DOM, la anuncian los lectores como «mixto»).' },
      { name: '…props', type: 'InputHTMLAttributes', description: 'checked, defaultChecked, onChange, name, value, disabled, ref…' },
    ],
  }],
  keyboard: [['Espacio', 'Marcar / desmarcar'], ['Tab', 'Siguiente control']],
  a11y: ['Es un <input type="checkbox"> nativo con apariencia propia: rol, estado y teclado son los del navegador.', 'indeterminate se aplica como propiedad del DOM: se anuncia como mixto.', 'La marca se dibuja con un trazo; con movimiento reducido aparece sin animación.'],
};
