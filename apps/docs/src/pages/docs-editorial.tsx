import { NexMenu, type NexMenuItem } from '@eclipsis/react';
import type { ComponentDoc } from '../docs/component-page.tsx';
import { jsx } from '../docs/kit.tsx';
import { EditorialDocument } from '../examples/editorial-document.tsx';

const MENU_ITEMS: NexMenuItem[] = [
  { id: 'dup', label: 'Duplicar', hint: 'Ctrl+D', onSelect: () => {} },
  { id: 'clear', label: 'Borrar resultado', onSelect: () => {} },
  { id: 'wide', label: 'Salida amplia', group: 'Vista', checked: true, onSelect: () => {} },
  { id: 'del', label: 'Eliminar', tone: 'danger', onSelect: () => {} },
];

export const menuDoc: ComponentDoc = {
  path: 'componentes/menu',
  name: 'NexMenu',
  eyebrow: 'Componentes · Acciones',
  summary: 'Un botón que abre una lista de acciones: grupos, pistas, interruptores y acciones destructivas. Sube a la capa superior del navegador, sigue a su disparador y no escucha nada mientras está cerrado. NexCommandMenu es su variante con búsqueda para «/».',
  status: 'laboratorio',
  imports: [{ names: ['NexMenu', 'NexCommandMenu'], from: '@eclipsis/react' }],
  origin: <>los menús de acciones y de inserción de NexBook</>,
  controls: [
    { kind: 'select', name: 'align', label: 'Alineación', options: ['start', 'end'], initial: 'start' },
    { kind: 'select', name: 'placement', label: 'Lado', options: ['bottom', 'top'], initial: 'bottom' },
    { kind: 'boolean', name: 'text', label: 'Con texto', initial: false },
  ],
  render: (v) => (
    <NexMenu label="Acciones" items={MENU_ITEMS} align={v.align as never} placement={v.placement as never}>
      {v.text ? 'Acciones' : undefined}
    </NexMenu>
  ),
  code: (v) => jsx('NexMenu', { label: 'Acciones', align: v.align as string, placement: v.placement as string }, v.text ? 'Acciones' : undefined, { align: 'start', placement: 'bottom' }),
  api: [
    {
      component: 'NexMenu',
      rows: [
        { name: 'items', type: 'NexMenuItem[]', description: 'Acciones. Las del mismo `group` se agrupan y las flechas las recorren en el orden en que se ven.' },
        { name: 'label', type: 'string', description: 'Nombre accesible del disparador y del menú. Si hay texto visible, debe contenerlo.' },
        { name: 'children · icon', type: 'ReactNode', description: 'Texto visible e icono del disparador (por defecto, `more`).' },
        { name: 'align · placement', type: "'start' | 'end' · 'bottom' | 'top'", description: 'Alineación y lado preferido; se da la vuelta si no cabe.' },
        { name: 'open · defaultOpen · onOpenChange', type: '…', description: 'Control opcional de la apertura.' },
      ],
    },
    {
      component: 'NexMenuItem',
      rows: [
        { name: 'id · label · onSelect', type: '…', description: '`onSelect` corre DESPUÉS de cerrar y devolver el foco.' },
        { name: 'hint · icon · group · checked · tone · disabled', type: '…', description: 'Pista, icono, grupo, interruptor (`menuitemcheckbox`), peligro y deshabilitada.' },
      ],
    },
    {
      component: 'NexCommandMenu',
      rows: [
        { name: 'open · anchor · onClose', type: '…', description: 'Abierto junto a un ancla que decide la aplicación (la línea donde se escribió «/»).' },
        { name: 'items · label · initialQuery · returnFocus', type: '…', description: 'Opciones, nombre, filtro inicial y a dónde vuelve el foco si se descarta.' },
      ],
    },
  ],
  keyboard: [
    ['↓ / ↑ en el disparador', 'Abre en la primera / la última acción'],
    ['↓ / ↑ · Inicio / Fin · letra', 'Recorren y saltan'],
    ['Intro / Espacio', 'Elige, cierra y devuelve el foco'],
    ['Escape', 'Cierra sin propagarse'],
    ['Paleta: escribir · Retroceso vacío', 'Filtra · descarta y devuelve el foco a la línea'],
  ],
  a11y: [
    'NexMenu: patrón «menu button». NexCommandMenu: combobox con listbox y aria-activedescendant (el foco no sale del campo).',
    'Objetivos de 44 px con puntero grueso.',
  ],
};

const FLOW_CODE = `<NexFlow mode={mode} selectedId={selected} onSelect={setSelected}
  onReorder={move} insertItems={(at) => choicesFor(at)}>
  {doc.map((node, i) => (
    <NexEditorialBlock key={node.id} blockId={node.id} label={\`\${name(node)} \${i + 1} de \${doc.length}\`}
      kind={node.kind} width={node.kind === 'figure' ? 'wide' : 'text'}
      actions={actionsFor(node)} tools={toolsFor(node)}>
      {render(node)}
    </NexEditorialBlock>
  ))}
</NexFlow>

// «/» en una línea vacía, desde el editor de la aplicación:
const flow = useNexFlow();
flow?.openInsert({ at: index + 1, anchor: line, returnFocus: line });`;

export const flowDoc: ComponentDoc = {
  path: 'componentes/hoja',
  name: 'NexFlow',
  eyebrow: 'Componentes · Editorial',
  summary: 'Living Editorial Blocks. En reposo, el documento es editorial; al acercarse, cada bloque revela su contorno con la membrana de NexSurface; al seleccionarlo, su límite se vuelve explícito. Identidad, orden, inserción y Focus siguen ahí: sólo cambia cuándo se ven.',
  status: 'laboratorio',
  wide: true,
  imports: [{ names: ['NexFlow', 'NexEditorialBlock', 'useNexFlow'], from: '@eclipsis/react' }],
  origin: <>el documento de NexBook: texto, código, datos e interacción en una sola hoja</>,
  controls: [
    { kind: 'select', name: 'mode', label: 'Modo', options: ['read', 'edit'], initial: 'edit' },
    { kind: 'select', name: 'motion', label: 'Movimiento', options: ['none', 'subtle', 'fluid'], initial: 'fluid' },
  ],
  render: (v) => <EditorialDocument initialMode={v.mode as never} motion={String(v.motion)} />,
  code: () => FLOW_CODE,
  api: [
    {
      component: 'NexFlow',
      rows: [
        { name: 'mode', type: "'read' | 'edit'", default: "'read'", description: 'En lectura no se pinta ningún control: sólo contenido.' },
        { name: 'selectedId · onSelect', type: 'string | null · (id) => void', description: 'Se selecciona al pulsar y al enfocar con teclado; el límite del bloque se vuelve explícito.' },
        { name: 'onReorder', type: '(from, to) => void', description: 'Asa en el margen: arrastrar con puntero o dedo, ↑/↓/Inicio/Fin con teclado.' },
        { name: 'insertItems', type: '(at) => NexMenuItem[]', description: 'Qué se puede insertar en el hueco `at`. Activa el punto de inserción, el «+» del seleccionado y `openInsert`.' },
        { name: 'insertLabel · announceMove · motion · density', type: '…', description: 'Nombre de la paleta, anuncio tras mover, movimiento y densidad.' },
      ],
    },
    {
      component: 'NexEditorialBlock',
      rows: [
        { name: 'blockId · label', type: 'string', description: 'Identidad estable y nombre accesible (sólo se anuncia al editar).' },
        { name: 'presence', type: "'quiet' | 'subtle'", default: "'quiet'", description: 'En reposo: sin límite (texto) o apenas insinuado (código, datos).' },
        { name: 'busy · error · readOnly', type: 'boolean', description: 'Ejecución (pulso del contorno), error (contorno y marca «!») y sólo lectura.' },
        { name: 'onFocusRequest · focusLabel', type: '() => void · string', description: 'Añade «Expandir» y pide a la aplicación su entorno especializado.' },
        { name: 'kind', type: 'string', description: 'Categoría semántica (`heading`, `code`, `figure`…), para la aplicación y el ritmo.' },
        { name: 'width', type: "'text' | 'wide' | 'full'", default: "'text'", description: 'La medida de lectura, o sale a los márgenes (figuras, tablas).' },
        { name: 'actions · tools', type: 'NexMenuItem[] · ReactNode', description: 'Acciones en el margen izquierdo («⋯») y herramientas del seleccionado en el derecho.' },
        { name: 'movable · selected · motion', type: '…', description: 'Sin asa; selección forzada (fuera de NexFlow); movimiento.' },
      ],
    },
    {
      component: 'useNexFlow()',
      rows: [
        { name: 'openInsert({ at, anchor, query?, returnFocus? })', type: '() => void', description: 'Abre la paleta desde el editor de la aplicación («/», un atajo).' },
        { name: 'mode · selectedId · canInsert · closeInsert', type: '…', description: 'Estado de la hoja.' },
      ],
    },
  ],
  keyboard: [
    ['Tab', 'Entrar en un elemento lo selecciona y revela su margen'],
    ['↑ / ↓ · Inicio / Fin en el asa', 'Mueve el elemento; el foco se queda en el asa y se anuncia la posición'],
    ['«+» del margen (seleccionado)', 'Insertar después, con teclado o con el dedo'],
    ['Escape durante un arrastre', 'Cancela'],
    ['Demo: «/» · Intro · Retroceso · Ctrl+Z', 'Paleta · nuevo párrafo · borrar línea vacía · deshacer (de la aplicación)'],
  ],
  a11y: [
    'En lectura, los elementos no tienen rol ni nombre: un lector de pantalla lee un documento, no cuarenta regiones.',
    'En edición, cada elemento es un grupo con nombre y su margen es alcanzable con Tab.',
    'Los controles del margen nunca dependen sólo del hover: también aparecen al enfocar y al seleccionar.',
    'Movimiento reducido: los cambios de estructura son inmediatos.',
  ],
};
