import { useEffect, useState } from 'react';
import { NexPortal, type NexPortalMode } from '@eclipsis/react';
import type { ComponentDoc } from '../docs/component-page.tsx';
import { REFERENCE_URL, SandboxWorkbench } from '../examples/web-practice.tsx';

function Playground({ mode, url: typed, height, expandable }: { mode: NexPortalMode; url: string; height: number; expandable: boolean }) {
  // La dirección del control se aplica al dejar de escribir: cada tecla no es una navegación.
  const [url, setUrl] = useState(typed);
  useEffect(() => { const t = window.setTimeout(() => setUrl(typed), 700); return () => window.clearTimeout(t); }, [typed]);
  return (
    <div style={{ width: '100%', maxWidth: 860, textAlign: 'left' }}>
      {mode === 'sandbox'
        ? <SandboxWorkbench height={height} />
        // `key`: otra presentación inicial es otra instancia; dentro de una instancia, ampliar/reducir no recarga.
        : <NexPortal key={mode} label="Superficie web" defaultMode={mode} url={url} height={height} expandable={expandable} />}
    </div>
  );
}

const SANDBOX_CODE = `<NexPortal
  label="Resultado"
  mode="sandbox"
  html="<button onclick='this.textContent=&quot;Hola Nex&quot;'>Pulsar</button>"
  javascript="console.log('Sandbox iniciado')"
  onConsole={(entry) => console.log(entry.level, entry.text)}
/>`;

export const portalDoc: ComponentDoc = {
  path: 'componentes/portal',
  name: 'NexPortal',
  eyebrow: 'Componentes · Web',
  summary: 'La web como contenido de la composición: una página de referencia incrustada, un navegador integrado con barra de dirección o un sandbox que ejecuta HTML, CSS y JavaScript propios aislados de la aplicación. Vive en el flujo del layout —una página, un panel, una región de NexFrame— y comparte un único motor entre sus tres modos.',
  status: 'laboratorio',
  imports: [{ names: ['NexPortal'], from: '@eclipsis/react' }, { names: ['resolveWebAddress', 'frameSandbox', 'sandboxDocument'], from: '@eclipsis/components' }],
  origin: <>la referencia junto a una práctica de NexBook y la vista previa web de NexView</>,
  controls: [
    { kind: 'select', name: 'mode', label: 'Modo', options: ['embedded', 'browser', 'sandbox'], initial: 'embedded' },
    { kind: 'text', name: 'url', label: 'Dirección', initial: REFERENCE_URL },
    { kind: 'number', name: 'height', label: 'Alto', initial: 380, min: 220, max: 720, step: 20 },
    { kind: 'boolean', name: 'expandable', label: 'Ampliable', initial: true },
  ],
  render: (v) => <Playground mode={v.mode as NexPortalMode} url={String(v.url)} height={Number(v.height)} expandable={Boolean(v.expandable)} />,
  code: (v) => v.mode === 'sandbox' ? SANDBOX_CODE : `<NexPortal
  label="Referencia"
  mode="${v.mode}"
  url="${v.url}"
  height={${v.height}}${v.expandable ? '' : '\n  expandable={false}'}
/>`,
  showcases: [
    {
      title: 'Embedded: un sitio externo',
      lead: 'example.org permite mostrarse dentro de otras páginas. Si escribes en el control «Dirección» un sitio que lo prohíbe, el navegador lo bloqueará y NexPortal no intentará eludirlo: ofrece abrirlo aparte.',
      render: () => <div style={{ width: '100%', maxWidth: 860, textAlign: 'left' }}><NexPortal label="example.org" url="https://example.org" height={260} /></div>,
    },
    {
      title: 'Browser: navegación dentro de sus límites',
      lead: 'Atrás y adelante recorren las direcciones abiertas desde la barra. Los enlaces seguidos dentro de una página de otro origen no son visibles para la aplicación, así que no se fingen; «Volver a cargar» pide de nuevo la última dirección conocida.',
      render: () => <div style={{ width: '100%', maxWidth: 860, textAlign: 'left' }}><NexPortal label="Navegador integrado" mode="browser" defaultUrl={REFERENCE_URL} height={360} expandable={false} /></div>,
    },
    {
      title: 'Sandbox: HTML, CSS y JavaScript aislados',
      lead: 'Edita el código: el documento aislado se reconstruye y su consola llega por el puente validado. El script no puede tocar esta página: corre en un origen opaco, sin red.',
      render: () => <div style={{ width: '100%', maxWidth: 960, textAlign: 'left' }}><SandboxWorkbench height={260} /></div>,
    },
  ],
  api: [
    {
      component: 'NexPortal',
      rows: [
        { name: 'label', type: 'string', description: 'Nombre accesible de la región y título del iframe. Obligatorio.' },
        { name: 'mode · defaultMode · onModeChange', type: "'embedded' | 'browser' | 'sandbox'", default: "'embedded'", description: 'Presentación. embedded ↔ browser conserva el mismo iframe (sin recarga).' },
        { name: 'url · defaultUrl · onNavigate', type: 'string · (url) => void', description: 'Dirección http(s) cargada. Sin esquema se completa con https:// (ejemplo.org); una ruta de la propia aplicación empieza por ./, ../ o /. javascript:, data:, file: o blob: se rechazan.' },
        { name: 'html · css · javascript · onConsole', type: 'string · ({ level, text }) => void', description: 'Sandbox: el documento aislado y su consola.' },
        { name: 'permissions', type: 'NexWebPermissions', description: 'scripts, forms, popups, modals, downloads, ownOrigin, network. Por defecto: página → scripts, forms, popups y su propio origen; sandbox → sólo scripts, sin red.' },
        { name: 'height · expandedHeight · expandable', type: 'number | string · … · boolean', default: '420 · min(78vh, 760px) · true', description: 'Alto, alto al ampliar una referencia y si se ofrece ampliar.' },
        { name: 'showToolbar · actions', type: 'boolean · ReactNode', default: 'true', description: 'Barra del modo browser y acciones propias en ella.' },
        { name: 'slowAfter · onStatusChange', type: 'number · (status) => void', default: '12000', description: "Estados: empty, loading, loaded, slow, error ('invalid' | 'unsafe-scheme' | 'offline')." },
        { name: 'referrerPolicy', type: 'ReferrerPolicy', default: "'strict-origin-when-cross-origin'", description: 'Qué se cuenta del host a la página.' },
      ],
    },
  ],
  keyboard: [
    ['Intro en la barra', 'Abre la dirección escrita'],
    ['Escape en la barra', 'Descarta lo escrito y vuelve a la dirección cargada'],
    ['Tab', 'Recorre la barra y entra en la página incrustada'],
  ],
  a11y: [
    'Es una región con nombre; el iframe lleva el mismo nombre como título.',
    'Los estados se anuncian en un role="status" y la región marca aria-busy mientras carga.',
    'Una dirección rechazada se marca con aria-invalid y se explica.',
    'Aislamiento: el sandbox corre en un origen opaco (sin allow-same-origin) con CSP sin red, formularios ni base; no puede leer el DOM, las cookies ni el almacenamiento de la aplicación. Una URL del mismo origen que la aplicación tampoco recibe allow-same-origin si tiene scripts.',
    'Nunca se concede allow-top-navigation: una página no puede sacar a nadie de la aplicación.',
    'Límite: un sitio que prohíbe incrustarse (X-Frame-Options, CSP frame-ancestors) no lo comunica a la aplicación; NexPortal no lo afirma, avisa si tarda y ofrece abrirlo aparte. No usa proxies.',
    'Límite: ampliar no usa NexMorph: mover el iframe en el DOM lo recargaría. Se prioriza la continuidad de la página.',
  ],
  requires: [<>Un sitio debe permitir la incrustación. Para contenido propio, sirve el HTML desde tu aplicación (como <code>{REFERENCE_URL}</code> en esta documentación) o usa el modo sandbox.</>],
};

