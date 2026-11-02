# NexAnchoredLayer y NexInk — decisiones de arquitectura

Estado: **laboratorio** (2026-11-01). Este documento recoge qué se reutilizó,
qué se creó, por qué, y qué queda propuesto. Las demos están en NexDocs:
`#/componentes/capa-anclada`, `#/componentes/ink`, `#/componentes/markdown-field`
y el editor de `.md` del Composition Lab.

> **Cambio de nombre (2026-11-02).** Esta capa contextual se llamó
> provisionalmente `NexPortal`. Ese nombre pertenece a la superficie web
> (ver [NEXPORTAL.md](NEXPORTAL.md)). Se renombró sin alias —nunca se
> publicó en npm ni se fusionó—: `NexPortal` → `NexAnchoredLayer`,
> `NexPortalProps` → `NexAnchoredLayerProps`, `NexPortalAnchor` →
> `NexLayerAnchor`, `NexPortalDismissReason` → `NexLayerDismissReason`,
> clase `.nx-portal` → `.nx-anchored-layer`. NexInk sólo cambió el import.

## 1. Matriz de decisiones

| Capacidad | Implementación encontrada | Decisión | Justificación |
|---|---|---|---|
| Movimiento | `@eclipsis/core` (`FluidValue`, `MOTION_PRESETS`, `sharedClock`) y `springs.ts` | Reutilizar | El deslizamiento de NexAnchoredLayer al cambiar de ancla usa `useSprings` + `presetFor`; ninguna física nueva. |
| Morphing | `NexMorph` (`MorphTransition`, monta su destino) | Reutilizar, no envolver | NexAnchoredLayer no transforma contenido. Una superficie que nace de otra es NexMorph. |
| Capas | `useAnchoredLayer` (Popover API) en NexMenu/NexCommandMenu; NexSelect con su propio cálculo | Extender y unificar | Un solo hook para los cuatro; NexSelect pierde su copia. Nueva pila `layers.ts` para Escape/clic fuera/anidamiento. |
| Posicionamiento | Cálculo inline (sólo arriba/abajo, sin RTL ni límites) | Crear geometría pura | `placeFloating` en `@eclipsis/components`: flip, shift, RTL, lados L/R, `maxWidth/maxHeight`, `arrow`. Sin DOM, probado en Node. |
| Formato Markdown | `applyMarkdownCommand` (sin alternancia) y barra propia dentro de NexMarkdownField | Extender y extraer | Comandos con toggle + `markdownCommandState`; la barra propia se sustituye por NexInk. |
| Edición visual | `renderRichText` / `richTextToMarkdown` (islas) | Reutilizar | Ya preserva lo no representable como isla con su fuente exacta. NexInk se le conecta con un adaptador. |
| Selección | `selectionchange` + rango guardado sólo para el enlace | Adaptar | Contrato `bookmark/restore` en el adaptador; la barra no toma el foco al pulsar. |
| Documentación | Registro de fichas (`ComponentDoc`) | Integrar | Dos fichas nuevas con controles sobre instancias reales; el Lab activa `ink` en su editor. |

Dependencias externas: **ninguna nueva**. Floating UI resolvería lo mismo,
pero la geometría necesaria cabe en ~100 líneas puras y probadas, y la
infraestructura de capas (Popover API, viewport visual) ya existía. CSS
Anchor Positioning no se usa: no está en todos los navegadores objetivo y la
capa debe recolocarse con el viewport visual (teclado en pantalla).

## 2. NexAnchoredLayer

- **API elegida:** un solo componente controlado (`open`, `onOpenChange`,
  `anchor`). Se descartó la forma compuesta `Root/Trigger/Content`: NexInk y
  los menús de bloque necesitan anclas virtuales (rangos), y el disparador ya
  es responsabilidad de NexButton/NexMenu.
- **No muda el contenido.** Se pinta donde se declara y sube a la capa
  superior (Popover API o `<dialog>`). Conserva contexto de React, orden de
  tabulación e identidad de lo que contiene: continuidad de identidad, no
  sólo visual. Es la misma razón por la que el modo enfoque de NexBook usa
  Popover API en vez de un portal que remonte editores.
- **Variantes:** *anchored* (por defecto), *adaptive* (hoja inferior bajo
  `adaptiveBelow`), *floating/re-anchor* (cambiar de ancla desliza con
  resortes), *expanding* = NexMorph (no se duplica).
- **Modalidad:** no modal sin trampa de foco ni `aria-modal`; modal con
  `<dialog>.showModal()` (inercia y rol nativos). Escape pasa siempre por la
  pila (`cancel` se anula para no desincronizar `open`).
- **Límites conocidos:** sin Popover API la capa queda `fixed` en su sitio y
  un ancestro con `transform` puede desplazarla; el seguimiento lee el ancla
  una vez por fotograma (sin escrituras en reposo).

## 3. NexInk

Tres responsabilidades separadas:

1. **UI** (`NexInk`): barra, estados `true | false | 'mixed'`
   (`aria-pressed`), «Más» (`aria-expanded`), comandos con valor (enlace).
2. **Interacción** (`NexInk`): aparece con una selección no colapsada,
   NexAnchoredLayer anclado al rango, debajo con puntero grueso (el menú nativo sale
   encima), hoja inferior en viewports estrechos, Alt+F10, atajos `Mod+…`,
   Escape, marcador de selección.
3. **Adaptador** (`NexInkAdapter`): `element · selection · state · enabled ·
   run · bookmark · restore · subscribe`. Nada de Markdown, Monaco ni NexBook
   en el contrato.

Adaptadores incluidos (en `@eclipsis/react/markdown`): `textarea` (ediciones
mínimas con `insertText` → una parada en el deshacer nativo) y el editor
visual de NexMarkdownField (`execCommand`/`insertHTML` escapado → también en
su deshacer; estado por nodos del rango, islas excluidas).

Fuera de alcance, sin botones decorativos: comentarios, menciones,
sugerencias, colaboración. Subrayado: no hay sintaxis Markdown estándar y
NexMarkdown no pinta HTML crudo; queda para cuando exista una extensión.

## 4. Perspectivas editoriales y fuente única

`NexMarkdownField` ofrece `visual | source | view` sobre el mismo valor
Markdown. **Estrategia A (Markdown canónico)**: el valor persistente sigue
siendo Markdown; la vista visual es una proyección temporal que se serializa
bloque a bloque y devuelve **byte a byte** los bloques no tocados (firma por
bloque) y las islas.

Se descartó la **estrategia B (árbol estructurado: ProseMirror/Tiptap/
Lexical)** por ahora: obliga a definir un esquema para cada extensión propia
(avisos, widgets, referencias a resultados) y a serializar de vuelta con
pérdida de forma (`__x__` → `**x**`, numeraciones, espacios) salvo con
trabajo considerable; la estrategia A ya pasa las pruebas de ida y vuelta
con tablas, código, fórmulas y avisos. B se reevaluará si se necesita
edición visual de tablas o colaboración en tiempo real.

**Política de deshacer:** dentro de cada perspectiva, el deshacer del motor
(cada comando de NexInk es una parada). Cambiar de perspectiva conserva el
valor, no la pila: cada editor nativo tiene la suya. No se promete un
historial compartido hasta tener un historial a nivel de modelo.

## 5. Pruebas

- `packages/components/tests/anchor.test.ts` — geometría (flip, shift, RTL,
  viewport visual desplazado, cursor de ancho 0, recorte).
- `packages/react/tests/anchored-layer-ink.test.tsx` — foco y Escape, clic fuera y
  ancla, capas anidadas, `<dialog>` modal, NexInk (estados mixtos, roving,
  «Más», comando con valor, contextual, atajos), comandos Markdown con
  toggle, ambos adaptadores, perspectivas sin pérdida + axe.
- Verificación en navegador (Chromium del panel, iframe 1240/390/320 px):
  colocación, flip/shift dentro de `boundary`, ocultación al salir el ancla
  de un contenedor desplazable, deslizamiento al cambiar de ancla,
  negrita/cursiva con `undo` nativo en ambas perspectivas, Alt+F10, axe sin
  violaciones con capas abiertas, sin scroll horizontal a 320 px.

## 6. Pendiente

- Integración en NexBook (otro repositorio): propuesta, no implementada.
- Edición visual de tablas y listas anidadas/tareas (hoy islas protegidas).
- Historial compartido entre perspectivas (requiere modelo transaccional).
- Medición de rendimiento en documentos largos con el panel visible (el
  panel de pruebas limita rAF a ~1 fps; no se registran cifras de fps).
