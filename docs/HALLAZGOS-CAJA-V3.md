# Hallazgos al usar NexFluid en una caja (punto de venta)

Notas de la fase 0 de la "Caja V3": un prototipo de punto de venta en **Tauri 2** (Rust + webview)
con la interfaz en React 19 y NexFluid **0.9.0** desde npm. La caja se maneja casi solo con
teclado y lector de código de barras, así que los campos de texto y los selectores son lo más
usado de la librería.

- **Fecha:** 2026-11-23
- **Versión probada:** `@nexfluid/*` 0.9.0 (npm). Las referencias a líneas son del `main` de
  ese día (`6a80d5e`).
- **Navegadores:** WebKitGTK 2.50.4 (el motor de Tauri en Linux, Zorin OS 17), Brave y Edge
  (Chromium). Lo probado en NexDocs se repitió en los tres.

Las correcciones están en `jesjack/fix/nexinput-nexselect-webkit` y las propuestas en
`jesjack/feat/sugerencias-caja-v3`; ambas se proponen a
`main`. Lo marcado como **decisión de diseño** no se toca sin hablarlo antes.

## Resumen

| # | Tipo | Dónde | Qué pasa | Navegadores |
|---|---|---|---|---|
| 1 | Error (corregido) | `NexInput` | Un clic en la franja de arriba del campo deja el cursor al principio del texto | Los tres |
| 2 | Error (corregido) | `useLiquid` (NexSelect) | La gota solo se anima la primera vez que se abre la lista | Los tres |
| 3 | Decisión de diseño | `useLiquid` | La gota se estira mucho a lo alto y se adelgaza a lo ancho al viajar | Los tres |
| 4 | Decisión de diseño | `useLiquid` (attract) | La gota se comprime hacia la opción bajo el puntero pero no viaja a ella | Los tres |
| 5 | Error de NexDocs | `apps/docs` | Los `<select>` nativos se ven distintos en cada navegador | Diferente en WebKit y Chromium |
| 6 | Error (corregido) | `liquidCapsule` (core) | En listas verticales anchas, a mitad del viaje la gota muestra una hendidura | Los tres (es geometría) |
| 7 | Error (corregido) | NexSelect (CSS) | La lista se estira con un hueco vacío hasta el borde de la ventana | WebKit |
| 8 | Error (corregido) | `NexSurface` | El brillo bajo el puntero conserva las esquinas de la caja mientras la membrana se abomba | Los tres |
| 9 | Decisión de diseño | `NexSurface` | El área del puntero no sigue a la membrana abombada | Los tres |
| 10 | Error (corregido) + propuesta | Familia `capsule`, campos | NexButton no tiene la misma redondez que NexInput y NexSelect; la redondez no se puede elegir | Los tres |

## 1. NexInput: el cursor queda al principio al hacer clic cerca del borde superior

**Cómo reproducirlo:** escribir texto en un `NexInput`, quitarle el foco y hacer clic dentro
del campo, cerca del borde de arriba y a la derecha del texto. El cursor aparece **antes** del
texto en lugar de donde se hizo clic (o al final). Pasa en WebKitGTK, Brave y Edge, así que no
es de un motor: es de cómo está armado el campo.

**Causa:** en `packages/components/src/styles.css` (`.nx-input__control`) el `<input>` ocupa
toda la altura de la cápsula (`height: 100%`; mide 44 px en `comfortable`), pero su texto es
una sola línea centrada (`line-height: 1.2`, unos 18 px). Un clic en la parte del `<input>` que
queda por encima o por debajo de esa línea no cae sobre texto, y los navegadores lo resuelven
como "inicio del campo".

**Lo que se probó** (página de prueba con cuatro variantes, clic a 0–7 px del borde superior):

| Variante | Brave | WebKitGTK |
|---|---|---|
| A · Original 0.9.0 (`line-height: 1.2`) | ❌ cursor en 0 | ❌ cursor en 0 |
| B · `line-height` = alto del control − 4 px | ❌ | ❌ |
| C · `line-height` = alto completo del `<input>` | ✅ | ❌ |
| D · `<input>` del alto de su línea + la membrana enfoca con JS | ✅ | ✅ |

C muestra que **WebKit ignora `line-height` dentro del `<input>`**: no hay arreglo sólo con CSS.

**Corrección aplicada (variante D):** el `<input>` mide sólo su línea (`height: auto`) y un clic
en el resto de la membrana (`.nx-input`) lo enfoca con el cursor al final, o al principio si el
clic cae antes del texto (`focusFromMembrane` en `packages/react/src/fields.tsx`). Los botones y
enlaces dentro de `leading`/`trailing` conservan su clic. Prueba en `forms.test.tsx`.

**Aparte (no es error de la librería):** un clic en la **etiqueta** enfoca el campo con el
cursor al principio. Es el comportamiento normal de `<label for>` en los tres navegadores; la
caja lo resuelve por su cuenta llevando el cursor al final al enfocar.

## 2. useLiquid: la gota de NexSelect solo se anima la primera vez

**Cómo reproducirlo:** abrir un `NexSelect`, pasar entre opciones con el teclado o el puntero
(la gota viaja), cerrarlo y volverlo a abrir. A partir de ahí ya no hay gota: solo el fondo fijo
de respaldo en la opción activa.

**Causa:** `packages/react/src/liquid.tsx`.

- `ready` es un `useRef` del componente (línea 53), pero el contenedor de la gota (`host`) es la
  lista del popup, que se **desmonta al cerrar** y se crea de nuevo al abrir.
- `update()` solo pone `data-nx-ready` cuando `ready.current` es `false` (líneas 108–110).
  Al reabrir, `ready` ya es `true`, así que la lista nueva nunca recibe el atributo.
- Sin `[data-nx-ready]`, el CSS deja la gota oculta (`[data-nx-ready] > .nx-liquid { visibility:
  visible; }`) y aplica el resaltado de respaldo
  (`.nx-select__list:not([data-nx-ready]) .nx-select__option[data-active]`).
- Lo mismo con el `ResizeObserver` (líneas 146–155): sus dependencias son `[settle, host]`,
  y `host` es el mismo objeto ref aunque cambie el elemento, así que sigue observando la lista
  vieja, ya desmontada.

**Afecta a:** seguro a `NexSelect`. `NexTabs`, `NexNav` y `NexSegmented` usan el mismo hook;
solo les pasaría si su contenedor se desmonta y se vuelve a montar.

**Corrección propuesta:** llevar el "ya está lista" **por elemento** y no por componente, por
ejemplo guardando el elemento que se marcó y comparándolo con `host.current` en `update()` y
`settle()`; si es otro, marcarlo y colocar la gota sin animar (`springs.jump`). Volver a
suscribir el `ResizeObserver` cuando cambie el elemento.

## 3. Decisión de diseño: la gota se deforma demasiado al viajar

En una lista vertical (NexSelect con búsqueda, el menú de componentes de NexDocs), mientras la
gota viaja se **estira mucho a lo alto y se adelgaza a lo ancho**, y por un momento queda
flotando entre opciones como una cápsula grande que no corresponde a ninguna fila.

Es intencional: `liquid.tsx:62` conserva el volumen adelgazando la gota **hasta un 28 %**
(`Math.max(0.72, …)`) y le forma un cuello (`--nx-pinch`). Al probarlo, la sensación fue
**antinatural** en listas, donde el ojo espera que el resaltado siga a la fila.

**Medición:** con un rastro del borde derecho de la gota a la altura de su centro (un punto
por cuadro), la deformación es **asimétrica**: crece despacio al salir y se recoge de golpe al
llegar; el rastro dibuja un trapecio en vez de una curva redondeada. La causa: la deformación
sale de la distancia entre los dos bordes, y cada borde tiene su resorte (`magnetic` delante,
`viscous` detrás). Al llegar, el de delante ya frenó y el de detrás lo alcanza de golpe.

**Propuesta (en `jesjack/feat/sugerencias-caja-v3`, opcional):** `NexProvider liquid="symmetric"`.
La deformación sigue un seno según el avance del centro entre origen y destino: igual al salir
que al llegar. Sin el atributo la gota no cambia. Respeta el nivel de movimiento: completa en
`fluid`, a un tercio en `subtle`, y `elastic` conserva la forma original (su carácter es el
rebote). Ajustes por CSS: `--nx-liquid-thin` (cuánto adelgaza; hoy fijo en 0.72, y en listas
anchas convendría más) y `--nx-liquid-stretch`.

## 4. Decisión de diseño: attract se lee como error

Al pasar el puntero sobre otra opción, la gota se **comprime hacia ella pero no viaja**: solo
se mueve al elegir. Es la función `lean` (attract) de `liquid.tsx:126`, intencional. En la
prueba se leyó como un fallo ("se comprime pero no se va a donde está el cursor").

**Para hablar:** que sea más sutil, o que en listas el resaltado siga al puntero como en un
menú nativo. Hoy `motion="subtle"` ya la desactiva (`liquid.tsx:127`); la caja usará `subtle`.

## 5. NexDocs: los `<select>` nativos se ven distintos en cada navegador

Los selectores de la cabecera (dirección y tema, `apps/docs/src/app.tsx:87` y `:93`) y los del
panel de propiedades (`apps/docs/src/docs/kit.tsx:43`, estilos en `docs.css:28–30` y `:75`) son
`<select>` **nativos** sin `appearance: none`, así que cada motor los dibuja a su manera:

- **WebKitGTK:** usa el estilo de GTK (gris, esquinas cuadradas, triángulo oscuro).
- **Brave/Edge:** la cápsula de la documentación, pero la lista desplegada es la del sistema, y
  al enfocar aparece el anillo de foco rectangular de Chromium alrededor de la cápsula.

No afecta a la librería, pero es lo primero que se ve de NexFluid. **Propuesta:** usar
`NexSelect` en NexDocs (la propia librería ya lo tiene), o como mínimo `appearance: none` con
una flecha propia y un foco coherente con el resto.

## 6. liquidCapsule: hendidura a mitad del viaje en listas verticales anchas

**Cómo reproducirlo:** un `NexSelect` de unos 260 px de ancho (p. ej. el selector de tema),
`motion="fluid"`, forma original de la gota. Al pasar de la primera opción a una de abajo, a
mitad del viaje la gota se ve como un círculo con una **hendidura** en cada lado, a la altura de
su centro.

**Causa:** `packages/core/src/membrane.ts`, `liquidCapsule`. El cuello mide
`neck = pinch · (h/2) · min(1, len / (2.5·h))`, pero sólo hay espacio para él en el **tramo
recto** de cada lado, `len/2 − r`, con `r = min(h/2, len/2)`. En una lista vertical ancha la gota
es tan ancha como larga: calculado con los valores por defecto (`thin` 0.72, `--nx-pinch` 0.6,
opciones de 38 px), el peor punto es **182 px de largo por 184 de ancho**: `r = 91`, tramo recto
**0**, cuello de **21.8 px**. Sin tramo recto, las dos curvas del cuello bajan casi en vertical y
se ve una hendidura en lugar de una cintura. En pestañas horizontales no pasa: la gota es baja y
larga y siempre tiene tramo recto.

**Corrección (en `jesjack/fix/nexinput-nexselect-webkit`):** el cuello se limita a la mitad del
tramo recto, `neck = min(neck, 0.5 · (len/2 − r))`: desaparece cuando la cápsula no tiene lados
rectos y no cambia cuando sí los tiene (pestañas, navegación, viajes cortos). Prueba en
`packages/core/tests/membrane.test.ts`.

## 7. NexSelect: la lista se estira hasta el borde de la ventana en WebKit

**Cómo reproducirlo:** abrir cualquier `NexSelect` en WebKitGTK (Tauri en Linux). La lista
tiene sus opciones arriba y un hueco vacío hasta el borde inferior de la ventana.

**Causa:** en la capa superior (Popover API, `position: fixed` y el `max-height` que pone
`useAnchoredLayer`), WebKit estira un contenedor `display: grid` hasta su alto máximo.
Medido: 600 px con un contenido de 126. Con `display: block` o `flex` mide 126.

**Corrección (en `jesjack/fix/nexinput-nexselect-webkit`):** `.nx-select__popup` pasa a
columna flex; la lista (`flex: 0 1 auto; min-height: 0`) sigue respetando el máximo y se
desplaza. De paso, la lista sube de 300 a 320 px: con 300, ocho opciones de una línea
(8 × 38 = 304 px) mostraban una barra de desplazamiento por 4 px.

## 8. NexSurface: el brillo no sigue a la membrana

**Cómo reproducirlo:** pasar el puntero cerca del borde de un `NexButton` con `motion="fluid"`.
La membrana (SVG) se abomba hacia el puntero, pero el brillo rosado bajo él
(`.nx-surface__zone`) es un `<span>` con las esquinas fijas de la caja: se ven dos formas, el
borde abombado y el brillo rectangular dentro.

**Corrección (en `jesjack/fix/nexinput-nexselect-webkit`):** con la membrana dibujada, la zona se
recorta con un `<clipPath>` que lleva la misma forma y se actualiza en el mismo cuadro que el
borde, y se extiende 24 px (`--nx-zone-bleed`) fuera del elemento para cubrir el abombamiento.
El degradado usa un radio explícito (`--nx-zone-ray`, la esquina más lejana de la caja
original), así que el brillo mide lo mismo que antes. Se conservan las transiciones de CSS
(opacidad, inundación al activar).

## 9. Decisión de diseño: el área del puntero no sigue a la membrana

El borde se abomba hacia el puntero, pero el área que responde a él sigue siendo la caja: al
salir por la parte abombada, el puntero deja de estar "sobre" el botón aunque visualmente siga
dentro. Mantener el área fija es una decisión razonable (un blanco estable), así que va como
propuesta opcional.

**Propuesta (en `jesjack/feat/sugerencias-caja-v3`):** `NexProvider hitArea="membrane"` (y
`hitArea` en `NexSurface` para anularlo). El relleno del SVG recibe el puntero, así que la parte
abombada también cuenta. Comprobado en WebKitGTK que un punto del abombamiento fuera de la caja
llega al botón. Sin coste por cuadro y sin persecución: el abombamiento tiene tamaño fijo
(`--nx-pull`), sólo añade un margen de unos píxeles al salir. Las esquinas de la caja que quedan
fuera de la forma redondeada siguen respondiendo: recortarlas exige `clip-path` sobre el
elemento, que repinta cada cuadro, y no compensa por unos píxeles.

## 10. Redondez: NexButton contra NexInput y NexSelect

**Cómo reproducirlo:** un `NexButton` junto a un `NexInput` o un `NexSelect`. Los dos piden el
mismo radio (la mitad del alto: una cápsula), pero el botón tiene los extremos casi cuadrados y
los campos en semicírculo.

**Causa:** la familia `capsule` (la de los controles, `packages/foundation/src/tokens.ts`)
declara `cornerShape: 'round'` pero `smoothing: 1`. El CSS del botón (antes de dibujarse la
membrana) es redondo; la membrana en SVG usa una superelipse de exponente `2 + 3 · smoothing` =
**5**. Los campos son CSS (`border-radius`), con arco de círculo. Además, los campos tenían el
radio fijo (`calc(alto / 2)`) en vez de leer `--nx-control-radius`: cambiar el token sólo
cambiaba los botones.

**Corrección (en `jesjack/fix/nexinput-nexselect-webkit`):** `capsule` pasa a `smoothing: 0`
(semicírculo, como su `cornerShape`), y `NexInput`, el disparador de `NexSelect` y su buscador
leen `--nx-control-radius` y `--nx-control-corner`. Por defecto se ven igual que antes.

**Para hablar (más amplio):** la misma discrepancia entre `cornerShape` y `smoothing` está en las
otras familias. `membrane` declara `superellipse(1.8)` (exponente 2^1.8 ≈ 3.5) con
`smoothing: 0.85` (exponente 4.55); `fluid` declara `squircle` (exponente 4) con `smoothing: 1`
(exponente 5). La superficie cambia de forma al pasar de CSS a SVG. No se tocó.

**Propuesta (en `jesjack/feat/sugerencias-caja-v3`):** `NexProvider radius="none|sm|md|lg|pill"`
y `corner="round|squircle"`, al estilo de `rounded-*` de Bootstrap. Fijan los tokens de los
controles en el subárbol, así que todos cambian juntos, en CSS y en la membrana. Va en el
proveedor y no en cada componente porque el diseño dice que "la geometría es del motor, no de
cada componente". `NexSegmented` y las pestañas no se pasaron al token: dentro llevan la gota,
que siempre es una cápsula, y con otra redondez el contenedor no coincidiría con ella.

## Añadido para la caja: NexCombobox

El campo de producto necesita texto libre con sugerencias, y `NexSelect` no sirve porque mueve
el foco a su buscador. `NexCombobox` (en `jesjack/feat/sugerencias-caja-v3`) es el patrón WAI-ARIA
combobox con `aria-autocomplete="list"`: el foco se queda en el `<input>`, la sugerencia activa la
marca la misma gota de NexSelect, elegir no reabre la lista, y las teclas que no usa (Intro con la
lista cerrada) llegan a la aplicación. Reutiliza la membrana de `NexInput` y la lista de NexSelect.

## Lo que funcionó bien

Para que quede el contexto: medido en la PC de la caja (4 núcleos, Intel HD 630), en modo
desarrollo sin optimizar, con `motion="subtle"`:

- **Tecla → pantalla:** mediana 19 ms, p95 27 ms (incluye hasta un cuadro de espera).
- **Consulta a Rust (autocompletado):** mediana 2 ms.
- **Lector de código de barras:** 16 ms por tecla, fácil de distinguir del tecleo humano.

Los temas, la tipografía, `NexInput`, `NexSelect` y `NexBadge` se integraron sin problemas en
Tauri/WebKitGTK.
