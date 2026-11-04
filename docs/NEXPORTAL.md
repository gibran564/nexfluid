# NexPortal — la web como contenido de la composición

Estado: **laboratorio** (2026-11-02). Demos en NexDocs: `#/componentes/portal`
y la pestaña «Práctica web» del Composition Lab.

NexPortal integra la web en el documento. NexAnchoredLayer presenta
herramientas alrededor del contenido. NexInk convierte la selección editorial
en acciones. Son capacidades distintas: NexPortal no flota, no necesita ancla
ni depende de la Popover API.

## 1. Un motor, tres presentaciones

| Pieza | Dónde | Responsabilidad |
|---|---|---|
| Direcciones | `resolveWebAddress` (`@eclipsis/components/web.ts`) | Lo escrito → URL http(s) o motivo de rechazo (`empty`, `invalid`, `unsafe-scheme`). Rechaza `javascript:`, `data:`, `file:`, `blob:`, `mailto:`. Una ruta propia empieza por `./`, `../` o `/` (evita la ambigüedad con `react.dev/learn`). |
| Aislamiento | `frameSandbox`, `sandboxDocument` | Tokens de `sandbox` con mínimo privilegio y el documento de un sandbox con CSP. |
| Puente | `isPortalMessage` + comprobación de `event.source` | Mensajes del sandbox al host: sólo consola, con token de sesión y forma conocida. |
| Historial | `navHistoryStart/Push/Go` | Las direcciones abiertas desde nuestra barra. |
| Componente | `NexPortal` (`@eclipsis/react`) | Un `<iframe>` que no cambia de sitio en el árbol; presentación, estados y eventos alrededor. |

Separación pedida, en el contrato del componente:

1. Configuración de la superficie: `label`, `height`, `expandedHeight`, `expandable`, `showToolbar`, `actions`.
2. Contenido: `url`/`defaultUrl` o `html`/`css`/`javascript`.
3. Aislamiento: `permissions` (`NexWebPermissions`), `referrerPolicy`.
4. Presentación: `mode`/`defaultMode`/`onModeChange`.
5. Navegación: barra, `onNavigate`, historial propio.
6. Carga: `onStatusChange` → `empty | loading | loaded | slow | error`.
7. Eventos: `onConsole` (sandbox), `onNavigate`, `onStatusChange`.

## 2. Seguridad

- **Página de otro origen** (`WEB_PAGE_PERMISSIONS`): `allow-scripts allow-forms
  allow-popups allow-popups-to-escape-sandbox allow-same-origin`. La pareja
  scripts + same-origin es segura aquí porque el origen es el del sitio, no el
  nuestro. Nunca `allow-top-navigation`, modales ni descargas por defecto;
  `allow=""` (ninguna capacidad del navegador delegada).
- **Misma origen que la aplicación**: con scripts se omite `allow-same-origin`
  (si no, el contenido podría quitarse el sandbox y leer el host). Queda en un
  origen opaco.
- **Sandbox** (`SANDBOX_PERMISSIONS`): `srcdoc` con sólo `allow-scripts`, nunca
  `allow-same-origin` aunque se pida; CSP `default-src 'none'`, sin red
  (`connect-src 'none'`), sin formularios ni `<base>`. `network: true` abre
  `https:` explícitamente. `</script` y `</style` del código se neutralizan.
- **Puente**: se aceptan mensajes sólo si `event.source` es nuestro frame, el
  token es el de la sesión actual (cambia con el código) y la forma es la de
  un mensaje de consola de tamaño acotado.
- Verificado en Chromium: desde el sandbox, `parent.document`,
  `top.document`, escribir el título del host, `document.cookie` y
  `localStorage` lanzan `SecurityError`; `fetch` falla por la CSP; el origen
  es `null`; el DOM propio sí funciona; el host no cambia.

## 3. Lo que no se puede saber (y no se finge)

- **Bloqueo de incrustación** (`X-Frame-Options`, CSP `frame-ancestors`): el
  navegador muestra su aviso dentro del frame y dispara `load` igual que con
  una página válida. NexPortal no lo distingue y no lo afirma: «Carga
  terminada» significa que el frame cargó algo. Si una carga tarda más de
  `slowAfter`, avisa sin diagnosticar y ofrece abrir aparte o reintentar.
  Siempre hay «Abrir en otra pestaña». No hay proxies.
- **Historial**: atrás/adelante recorren lo abierto desde la barra. Los
  enlaces seguidos dentro de una página de otro origen no son visibles; la
  barra muestra la última dirección conocida y «Volver a cargar» la pide de
  nuevo.

## 4. Continuidad y movimiento

Ampliar una referencia a navegador (y volver) conserva el MISMO `<iframe>`:
sin recarga ni pérdida de estado; la barra aparece a su alrededor y el alto
cambia con una transición de tokens (sin ella con movimiento reducido). No se
usa NexMorph: su destino se monta en otro sitio del DOM y mover un iframe lo
recarga. Se prioriza la continuidad de estado sobre la ornamentación.

## 5. Futuro (no implementado)

- **Motor remoto opcional**: un proveedor que renderice en servidor y
  transmita la sesión (aislamiento, control de acceso, streaming). El
  contrato actual lo admite como otra fuente del mismo componente; no se
  simula.
- **`NEX.navigator()`** en Nextudio: una fachada sobre
  `<NexPortal mode="browser" | "embedded">`. No se toca el runtime NEX hasta
  que se apruebe esa fase.
- **NexBook / NexView**: NexPortal es una pieza de composición (referencia +
  código + resultados). Un adaptador del lado de la aplicación decidiría
  persistencia, permisos y exportación; NexFluidUI no depende de Nextudio y
  no se añade ningún tipo de bloque persistente desde aquí.
- `NexNavigator` (composición especializada del modo browser) sólo si aporta
  algo más que la barra; nunca un segundo motor.
- Pestañas.

## 6. Pruebas

- `packages/components/tests/web.test.ts`: direcciones, tokens de sandbox,
  documento y CSP, puente, historial.
- `packages/react/tests/portal.test.tsx`: región en el flujo sin popover,
  permisos por caso, rechazo de esquemas, estados y aviso lento sin afirmar
  bloqueo, barra e historial propio, error de lo escrito sin descargar la
  página, continuidad del iframe al ampliar, sandbox y puente, nombres
  públicos distintos, axe.
- Navegador (Chromium del panel): carga real de example.org y de un recurso
  propio, navegación, github.com (prohíbe incrustarse) sin falsos
  diagnósticos, ataque desde el sandbox, continuidad sin recargas, 390/320 px
  sin scroll horizontal, axe con iframes sin violaciones.
