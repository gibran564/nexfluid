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
| Direcciones | `resolveWebAddress` (`@nexfluid/components/web.ts`) | Lo escrito → URL http(s) o motivo de rechazo (`empty`, `invalid`, `unsafe-scheme`). Rechaza `javascript:`, `data:`, `file:`, `blob:`, `mailto:`. Una ruta propia empieza por `./`, `../` o `/` (evita la ambigüedad con `react.dev/learn`). |
| Aislamiento | `frameSandbox`, `sandboxDocument` | Tokens de `sandbox` con mínimo privilegio y el documento de un sandbox con CSP. |
| Puente | `isPortalMessage` + comprobación de `event.source` | Mensajes del sandbox al host: sólo consola, con token de sesión y forma conocida. |
| Historial | `navHistoryStart/Push/Go` | Las direcciones abiertas desde nuestra barra. |
| Componente | `NexPortal` (`@nexfluid/react`) | Un `<iframe>` que no cambia de sitio en el árbol; presentación, estados y eventos alrededor. |

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

### 2.1 Sandbox para runtimes (0.5.0)

Algunos contenidos necesitan un hilo propio y WebAssembly; Pyodide (Python en el navegador) es el caso que lo motivó, en NexPod de Nextudio. El sandbox los admite **sin** `allow-same-origin`:

```tsx
const portal = useRef<NexPortalHandle>(null);
<NexPortal
  ref={portal}
  label="Runtime aislado"
  mode="sandbox"
  chrome={false}
  permissions={{ scripts: true, workers: true, wasm: true, network: true }}
  resources={{ scripts: [`${origin}/runtime/`], connect: [`${origin}/runtime/`] }}
  javascript={runtimeScript}            // usa nexPortal.send / nexPortal.onMessage
  onMessage={(data) => validate(data)}  // DATO no confiable
/>;
portal.current?.post({ type: 'run', … }); // espera a que el documento cargue
```

| Permiso | CSP | Por qué |
|---|---|---|
| `workers` | `worker-src data:` | Chromium no arranca un Worker de **módulo** desde un `blob:` creado en un origen opaco, y desde `data:` sí. El Worker nace en otro origen opaco y hereda esta política. No se abre `blob:` ni ninguna ruta del host |
| `wasm` | `'wasm-unsafe-eval'` | Compilar WebAssembly. No habilita `eval` ni `Function` de JavaScript |
| `resources.scripts` | prefijos en `script-src` | Lo que el Worker importa (`pyodide.mjs`). Son prefijos exactos, sin comodines |
| `resources.connect` | prefijos en `connect-src` | Lo que el contenido descarga (el Worker compilado, `.wasm`, ruedas) |

El servidor de esos recursos tiene que responder a CORS con `Origin: null`, porque el sandbox es opaco. Basta `Access-Control-Allow-Origin: null`, que sólo admite contextos opacos y no a otros sitios normales.

**Canal de datos.** Dentro del sandbox, `nexPortal.send(datos)` llega al host por `onMessage`, y `ref.post(datos)` llega dentro por `nexPortal.onMessage(fn)`. Las comprobaciones son las de la consola: el mensaje viene del frame de esta sesión y lleva su token, y del lado del sandbox `event.source === parent`. `nexPortal` es una propiedad congelada que el contenido no puede reemplazar. El contenido de `data` sigue siendo no confiable y lo valida quien lo recibe. `reload()` crea un documento nuevo, lo que termina sus Workers aunque estén en un bucle infinito.

**Lo que se mantiene.** El origen sigue siendo opaco. No hay acceso a cookies, `localStorage`, IndexedDB del sitio ni al DOM del host, y `allow-same-origin` nunca se concede a un sandbox aunque se pida. Las pruebas `web-runtime.test.ts` y `portal-runtime.test.tsx` lo comprueban. En Chromium real con Pyodide lo verifica `tests/e2e/nexpod.spec.ts` de Nextudio.

**Alternativa considerada.** `mode="embedded"` hacia un reproductor publicado en un **origen separado** (dominio propio) da además aislamiento de sitio y de proceso. Requiere infraestructura (dominio y despliegue) y queda como endurecimiento posterior. El contrato de NexPortal no cambia.

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
