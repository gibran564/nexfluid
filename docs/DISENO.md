# NexFluidUI · NexFluid Native — Living Editorial Interfaces

Documento de diseño público: la gramática visual, las decisiones y sus límites. La demostración viva está en NexDocs (`npm run dev`).

## 1. Principio

NexFluidUI no es un estilo extraído de una aplicación: es un lenguaje propio que las aplicaciones del ecosistema Nex adoptan. Su inspiración es la física de las lámparas de lava aplicada al **comportamiento** de la interfaz:

* los elementos no aparecen: **emergen** desde lo que los pidió;
* no se desplazan: **fluyen** (un borde tira, el otro sigue con viscosidad);
* no cambian de tamaño: **se transforman** (una tarjeta es la misma membrana que el panel que abre);
* no sólo reaccionan: responden con **tensión, inercia y recuperación**.

Con el movimiento apagado, la identidad se mantiene: la tipografía, las membranas y la composición son reconocibles inmóviles.

## 2. Tres direcciones y la síntesis

| Dirección | Idea | Se queda | Se descarta |
|---|---|---|---|
| A · Fluid Editorial | La tipografía manda; superficies estructurales; hilo líquido | Titulares pesados y condensados, cursivas serif, jerarquía editorial | Superficies rectas como norma; un hilo como único indicador |
| B · Living Matter | Materia expresiva: menisco, profundidad teñida, zonas cromáticas, gotas con cuello | Membranas superelípticas, menisco y profundidad (al 45 %), gota rellena | Intensidad diaria (fatiga), coste de pintura |
| C · Kinetic Minimalism | La identidad es la transformación | Color y movimiento sólo con propósito | Ausencia de bordes; inmóvil se vuelve genérica |
| **NexFluid Native** | Síntesis | — | — |

Las cuatro son conjuntos de tokens reales (`data-nx-direction`) aplicados a los mismos componentes: NexDocs las compara en «Identidad → Tres direcciones».

## 3. Gramática

### Membrana (la única primitiva de superficie)

`NexSurface`: contorno de esquinas **superelípticas** (curvatura continua) dibujado por el motor. Modo estático en CSS (`corner-shape`, con `border-radius` de respaldo) y modo vivo en SVG que se deforma. Toda tarjeta, panel, botón, región del marco, bloque de código y aviso es una membrana.

* **Papel** (`kind`): `surface` · `control` · `content`. La dirección asigna una familia a cada papel.
* **Familias geométricas** (`shape`): `fluid` (orgánica, 28 px), `membrane` (tensión controlada, 20 px), `capsule` (cápsula deformable), `morph` (preparada para transformarse), `editorial` (casi recta, sin deformación).
* **Materiales** (`material`): `base`, `raised`, `sunken`, `clear`, `accent`, `solid`, `ink`, `fluid`.

### Estados

`rest → attract → deform → activate → morph → settle`

* **attract**: el borde más cercano al puntero se abomba (campo de influencia gaussiano, normal hacia fuera); el borde gana tensión; aparece la zona cromática bajo el puntero.
* **deform**: la presión aplasta conservando el área.
* **activate**: la zona cromática inunda la membrana.
* **morph**: la membrana cambia de forma (tarjeta → panel) con el mismo número de puntos.
* **settle**: recuperación con la física de su familia.

Teclado equivalente: foco visible = attract; Intro/Espacio = activate. Movimiento reducido: los estados cambian de color, no de forma.

### Gota líquida

Indicador compartido por `NexTabs`, `NexNav` y `NexSegmented`: dos bordes con física distinta y un cuello tipo metaball mientras se estira (`liquidCapsule`). Se inclina hacia la opción bajo el puntero. Formas: `liquid` (rellena), `thread` (hilo), `editorial` (tinta) y `compact`.

### Espacio

`NexFrame`: un campo con zonas cromáticas sobre el que flotan membranas separadas por costuras (`--nx-gap`). Las regiones vacías no ocupan columna; las cerradas se retraen a un riel; `layout="focus"` retrae explorador e inspector y el lienzo crece; bajo 1080 px la navegación es un cajón y bajo 760 px el inspector es una hoja inferior (container queries: responde a su propio ancho). Variantes `floating`, `joined` y `flush`.

### Tipografía

Bricolage Grotesque (titulares: peso alto, tracking cerrado, tamaño óptico), Geist (interfaz y lectura), Geist Mono (código e índices), Instrument Serif (cursivas editoriales). Escala con póster y cita; el **índice editorial** (gota de materia + mono) marca secciones.

### Color

Se conserva la paleta vigente (seis temas). Lo nuevo es su papel: el acento marca interacción y estado; la **materia** (`--nx-fluid`) aparece en gotas, zonas y activaciones; la profundidad se tiñe (`--nx-depth`). Contraste WCAG verificado por prueba (23 pares por tema).

### Física por familia

| Familia | Preset | Componentes |
|---|---|---|
| surface | viscous | NexCard, NexPanel, NexFrame |
| control | elastic | NexButton, NexSegmented |
| indicator | magnetic + viscous | NexTabs, NexNav, NexSegmented |
| content | calm (emerge una vez) | paneles de pestaña, expansión |

## 4. Separación entre identidad y compatibilidad

* **NexFluid Native** (`tokens.css`): identidad principal.
* **Nextudio Compatibility** (`compat/nextudio.css`, opcional): reproduce la apariencia actual de Nextudio con los mismos componentes, para adopción gradual. Nunca define reglas fundacionales.

## 5. Decisiones

1. **Membrana como única primitiva**: evita duplicar CSS entre tarjetas, pestañas y widgets; la geometría es del motor, no de cada componente.
2. **Superelipse + SVG vivo sólo cuando hay interacción**: regiones grandes, código y tablas son estáticos (CSS), el coste se concentra donde aporta.
3. **El relleno CSS permanece bajo el SVG**: el texto siempre tiene un fondo real (herramientas de contraste, impresión).
4. **Gota compartida**: un único hook (`useLiquid`) para pestañas, navegación y selectores.
5. **Direcciones como tokens**: explorar A/B/C no requiere componentes distintos.
6. **Paleta conservada**: decisión de producto; la reinvención está en forma, materia, tipografía, composición y física.

## 6. Limitaciones

* Fluidez no medida aún en un equipo modesto (NexDocs → Accesibilidad y rendimiento incluye el medidor).
* `corner-shape` sólo en Chromium reciente; en otros navegadores el modo estático usa `border-radius` (el modo vivo SVG es igual en todos).
* La versión publicada de Bricolage Grotesque no trae eje de anchura: `--nx-display-stretch` sólo actúa con fuentes que lo tengan.
* La expansión tarjeta → panel atrapa el foco de forma básica y no bloquea el desplazamiento de la página.
* Probado en Chromium y jsdom; sin Safari ni Firefox.

## 7. Pendiente

Medición de fps en equipos modestos; pruebas visuales de regresión por tema/dirección; NexInput/NexSelect/NexDialog/NexMenu; metaballs para fusión de varias superficies; generación de tablas de API desde los tipos.
