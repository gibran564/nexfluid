/**
 * Superficie web: lo que no depende de React ni del DOM.
 *
 * NexPortal (@eclipsis/react) integra la web en el documento con un único
 * motor —un `<iframe>`— y tres presentaciones. Aquí viven sus reglas, para
 * probarlas con cadenas:
 *
 * - `resolveWebAddress`: lo que alguien escribe en la barra → una URL http(s)
 *   o un motivo de rechazo. Nunca `javascript:`, `data:`, `file:` ni `blob:`.
 * - `frameSandbox`: los tokens de `sandbox` con mínimo privilegio. Regla de
 *   seguridad: `allow-scripts` y `allow-same-origin` JUNTOS sólo para una
 *   página de OTRO origen (su origen es el suyo, no el nuestro). Con contenido
 *   del mismo origen que la aplicación, o código propio (`srcdoc`), esa pareja
 *   permitiría al contenido quitarse el sandbox y leer el DOM, las cookies y
 *   el almacenamiento del host; se omite `allow-same-origin` y el contenido
 *   queda en un origen opaco.
 * - `sandboxDocument`: HTML, CSS y JavaScript propios en un documento con CSP
 *   restrictiva y un puente de consola que habla con el host por
 *   `postMessage` con un token de sesión.
 * - `isPortalMessage`: validación de lo que llega por ese puente.
 * - `navHistory*`: el historial que SÍ podemos conocer: las direcciones
 *   abiertas desde nuestra propia barra. Los enlaces seguidos dentro de una
 *   página de otro origen no son visibles para el host (política del mismo
 *   origen).
 */

export type WebAddress =
  | { ok: true; url: string }
  | { ok: false; reason: 'empty' | 'invalid' | 'unsafe-scheme' };

const SAFE = new Set(['http:', 'https:']);

/** Normaliza una dirección escrita. `base` resuelve rutas relativas (recursos propios). */
export function resolveWebAddress(input: string, base?: string): WebAddress {
  const text = input.trim();
  if (!text) return { ok: false, reason: 'empty' };
  let candidate: string;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) candidate = text;
  // `javascript:…`, `data:…`, `mailto:…` (pero `ejemplo.org:8080` es un host con puerto).
  else if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(text)) return { ok: false, reason: 'unsafe-scheme' };
  else if (/^(\.{0,2}\/|\?|#)/.test(text)) { if (!base) return { ok: false, reason: 'invalid' }; candidate = text; }
  else if (/^localhost(:\d+)?(\/\S*)?$/i.test(text)) candidate = `http://${text}`;
  else if (/^[^\s/:]+\.[^\s/:]+(:\d+)?(\/\S*)?$/.test(text)) candidate = `https://${text}`;
  else return { ok: false, reason: 'invalid' };
  try {
    const url = new URL(candidate, base);
    if (!SAFE.has(url.protocol)) return { ok: false, reason: 'unsafe-scheme' };
    if (!url.hostname) return { ok: false, reason: 'invalid' };
    return { ok: true, url: url.href };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

export interface NexWebPermissions {
  /** Ejecutar JavaScript. */
  scripts?: boolean;
  /** Enviar formularios. */
  forms?: boolean;
  /** Abrir ventanas o pestañas (enlaces con target, window.open). Escapan del sandbox. */
  popups?: boolean;
  /** alert / confirm / prompt / print. */
  modals?: boolean;
  /** Descargas iniciadas por la página. */
  downloads?: boolean;
  /**
   * Sólo páginas de OTRO origen: conservar su propio origen (cookies propias,
   * almacenamiento). Se ignora con código propio y con el mismo origen que el host.
   */
  ownOrigin?: boolean;
  /** Sólo `sandbox`: peticiones de red (fetch, XHR, imágenes https). Por defecto, ninguna. */
  network?: boolean;
}

/** Página de otro sitio: lo necesario para que funcione, nada más. */
export const WEB_PAGE_PERMISSIONS: Readonly<NexWebPermissions> = { scripts: true, forms: true, popups: true, ownOrigin: true };
/** Código propio: sólo ejecutar. */
export const SANDBOX_PERMISSIONS: Readonly<NexWebPermissions> = { scripts: true };

/**
 * Tokens del atributo `sandbox`. `kind: 'page'` es una URL; `kind: 'code'`, un
 * `srcdoc`. `sameOriginAsHost`: la URL es del mismo origen que la aplicación.
 */
export function frameSandbox(permissions: NexWebPermissions, kind: 'page' | 'code', sameOriginAsHost = false): string {
  const tokens: string[] = [];
  if (permissions.scripts) tokens.push('allow-scripts');
  if (permissions.forms) tokens.push('allow-forms');
  if (permissions.popups) tokens.push('allow-popups', 'allow-popups-to-escape-sandbox');
  if (permissions.modals) tokens.push('allow-modals');
  if (permissions.downloads) tokens.push('allow-downloads');
  const ownOrigin = kind === 'page' && permissions.ownOrigin && !(sameOriginAsHost && permissions.scripts);
  if (ownOrigin) tokens.push('allow-same-origin');
  // Nunca: allow-top-navigation (sacar al usuario de la aplicación) ni allow-pointer-lock/presentation por defecto.
  return tokens.join(' ');
}

export interface SandboxSource {
  html?: string;
  css?: string;
  javascript?: string;
  /** Token de la sesión: el host sólo acepta mensajes que lo lleven. */
  token: string;
  network?: boolean;
  /** Idioma del documento. */
  lang?: string;
}

/** Mensaje del puente: sólo consola (por ahora). */
export interface PortalConsoleMessage {
  nexPortal: 1;
  token: string;
  type: 'console';
  level: 'log' | 'info' | 'warn' | 'error';
  text: string;
}

const LEVELS = new Set(['log', 'info', 'warn', 'error']);
export const PORTAL_MESSAGE_MAX = 4000;

/** ¿`data` es un mensaje del puente de ESTA sesión? (El origen del frame se comprueba aparte: `event.source`.) */
export function isPortalMessage(data: unknown, token: string): data is PortalConsoleMessage {
  if (!data || typeof data !== 'object') return false;
  const m = data as Record<string, unknown>;
  return m.nexPortal === 1 && typeof token === 'string' && token.length > 0 && m.token === token && m.type === 'console'
    && typeof m.level === 'string' && LEVELS.has(m.level) && typeof m.text === 'string' && m.text.length <= PORTAL_MESSAGE_MAX;
}

/** `</script` y `</style` no pueden cerrar antes de tiempo el bloque que los contiene. */
const guard = (text: string, tag: 'script' | 'style') => text.replace(new RegExp(`</(${tag})`, 'gi'), '<\\/$1');

/** El documento completo de un sandbox (para `srcdoc`). */
export function sandboxDocument({ html = '', css = '', javascript = '', token, network = false, lang = 'es' }: SandboxSource): string {
  const remote = network ? ' https:' : '';
  const csp = [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    `img-src data: blob:${remote}`,
    `media-src data: blob:${remote}`,
    'font-src data:',
    `connect-src ${network ? 'https:' : "'none'"}`,
    "form-action 'none'",
    "base-uri 'none'",
  ].join('; ');
  const bridge = `(() => {
  const token = ${JSON.stringify(token)};
  const max = ${PORTAL_MESSAGE_MAX};
  const show = (v) => { if (typeof v === 'string') return v; try { const s = JSON.stringify(v); return s === undefined ? String(v) : s; } catch { return String(v); } };
  const send = (level, parts) => { try { parent.postMessage({ nexPortal: 1, token, type: 'console', level, text: parts.map(show).join(' ').slice(0, max) }, '*'); } catch {} };
  for (const level of ['log', 'info', 'warn', 'error']) {
    const original = console[level].bind(console);
    console[level] = (...parts) => { send(level, parts); original(...parts); };
  }
  addEventListener('error', (e) => send('error', [e.message || 'Error']));
  addEventListener('unhandledrejection', (e) => send('error', ['Promesa rechazada: ' + show(e.reason && e.reason.message || e.reason)]));
})();`;
  return `<!doctype html>
<html lang="${lang.replace(/[^a-zA-Z-]/g, '')}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${guard(css, 'style')}</style>
<script>${bridge}</script>
</head>
<body>
${html}
<script>${guard(javascript, 'script')}</script>
</body>
</html>`;
}

// ---- Historial propio -------------------------------------------------------------

export interface NavHistory {
  entries: readonly string[];
  index: number;
}

export const navHistoryStart = (url?: string): NavHistory => ({ entries: url ? [url] : [], index: url ? 0 : -1 });

/** Abrir una dirección desde nuestra barra: descarta lo que había «adelante». */
export function navHistoryPush(h: NavHistory, url: string): NavHistory {
  if (h.entries[h.index] === url) return h;
  const entries = [...h.entries.slice(0, h.index + 1), url];
  return { entries, index: entries.length - 1 };
}

export function navHistoryGo(h: NavHistory, step: -1 | 1): NavHistory {
  const index = h.index + step;
  return index < 0 || index >= h.entries.length ? h : { entries: h.entries, index };
}
