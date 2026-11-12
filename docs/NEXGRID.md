# NexGrid: composición en cuadrícula

Estado: **0.5.0, sin publicar**. Lo consume NexPod (Nextudio) para componer código, ejecución, resultados y depuración.

```tsx
<NexGrid columns={12} gap="medium">
  <NexGridItem itemId="code" span={8} label="Código"><CodeSection /></NexGridItem>
  <NexGridItem itemId="run" span={4} label="Ejecución"><ExecutionResult /></NexGridItem>
  <NexGridItem itemId="debug" span={12} label="Depuración"><DebugTimeline /></NexGridItem>
</NexGrid>
```

## Contrato

| Prop | `NexGrid` | Notas |
|---|---|---|
| `columns` | 1–12 (12) | Se acota |
| `gap` | `none · compact · medium · comfortable` | Usa los tokens `--nx-space-*` |
| `space` | `expanded · compact · constrained` | Opcional. Sin él decide el ancho del **contenedor**: por debajo de 560 px es estrecho |
| `onReorder(from, to)` | | Activa el asa y el movimiento |
| `onResize(id, span)` | | Activa Mayús+←/→ |
| `selectedId` / `onSelect` | | Selección controlada o propia |
| `announceMove` / `announceResize` | | Texto de la región viva |

| Prop | `NexGridItem` | Notas |
|---|---|---|
| `itemId` | obligatorio | Identidad estable |
| `span` | 1..columnas | En espacio amplio |
| `rowSpan` | 1..6 | |
| `spanCompact` | 1..columnas | En espacio estrecho. Por defecto, todo el ancho |
| `label` | | Asa y anuncios |
| `movable` | | `false`: sin asa |

**Serializable.** `NexGridLayout` (`{ version: 1, columns, gap, items: [{ id, span, rowSpan?, spanCompact? }] }`) es JSON. `normalizeGridLayout(input)` acota y descarta lo inválido sin inventar nada, así que se puede guardar o recibir de una fuente no confiable, como una propuesta de IA.

## Edición y accesibilidad

- El asa (`button`) tiene un nombre accesible con el ancho actual y las teclas.
- ←/→ mueve en orden de lectura. ↑/↓ lleva a la fila vecina, al elemento más cercano en columna. Inicio y Fin van a los extremos. La aritmética está en `gridKeyboardMove`.
- Mayús+←/→ cambia una columna (`gridResizeStep`).
- El puntero hace un arrastre 2D con un indicador de inserción (`gridReorderSlot`), y Escape lo cancela.
- Cada cambio se anuncia en `role="status"`.
- FLIP en dos ejes, salvo con movimiento reducido (`prefers-reduced-motion` o `reducedMotion="reduce"`).

## Con NexFlow

NexFlow sigue siendo el motor editorial. Una cuadrícula es el contenido de **un** `NexEditorialBlock`. NexFlow ordena los bloques y NexGrid ordena los elementos de su cuadrícula. Las flechas en el asa de la cuadrícula no mueven el bloque, lo que comprueba `grid.test.tsx`. No hay dos editores compitiendo por el mismo estado.

## Anidado

Una cuadrícula dentro de otra funciona. A partir de `NEX_GRID_LIMITS.maxDepth` (2) la interior se apila en una columna (`data-nx-depth-capped`).

## Pruebas

`packages/components/tests/grid.test.ts` cubre el contrato, el teclado, el redimensionado y el destino 2D. `packages/react/tests/grid.test.tsx` cubre el render, el teclado, axe, el movimiento reducido, el anidado, SSR y la convivencia con NexFlow.
