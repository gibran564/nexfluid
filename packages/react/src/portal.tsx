'use client';

/**
 * NexPortal: la web como contenido de primera clase dentro de una composición.
 *
 *   <NexPortal label="MDN" mode="embedded" url="https://example.com" />
 *   <NexPortal label="Navegador" mode="browser" defaultUrl="https://example.com" />
 *   <NexPortal label="Resultado" mode="sandbox" html={html} css={css} javascript={js} />
 *
 * Vive en el flujo del layout (una página, un panel, una tarjeta, una región
 * de NexFrame); no es una capa flotante ni necesita un ancla.
 *
 * Un solo motor —un `<iframe>`— y tres presentaciones:
 * - embedded: una página referenciada, sin controles de navegación; abrir
 *   aparte y (si `expandable`) ampliar a navegador.
 * - browser: la misma superficie con barra de dirección, recarga, apertura
 *   externa y un historial HONESTO: el de las direcciones abiertas desde la
 *   barra. Los enlaces seguidos dentro de una página de otro origen no son
 *   visibles para el host; no se fingen.
 * - sandbox: HTML, CSS y JavaScript propios en un documento aislado (`srcdoc`
 *   en un origen opaco, CSP sin red por defecto). Nunca corre en el contexto
 *   de la aplicación; la consola llega por un puente validado (origen del
 *   frame + token de sesión + forma del mensaje).
 *
 * Continuidad: pasar de embedded a browser (y volver) conserva el MISMO
 * elemento `<iframe>`: la página no se recarga ni pierde su estado. Por eso
 * no se usa NexMorph aquí: mover el iframe a otro sitio del DOM lo recargaría.
 *
 * Límites reales: un sitio puede prohibir mostrarse dentro de otras páginas
 * (X-Frame-Options, CSP frame-ancestors). El navegador no lo comunica al
 * host —el evento `load` llega igual—, así que NexPortal no afirma que esté
 * bloqueado: si tarda, lo dice y ofrece abrirlo aparte. No hay proxies.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type HTMLAttributeReferrerPolicy, type ReactNode } from 'react';
import {
  SANDBOX_PERMISSIONS, WEB_PAGE_PERMISSIONS, cx, frameSandbox, isPortalMessage, navHistoryGo, navHistoryPush, navHistoryStart,
  resolveWebAddress, sandboxDocument, type NavHistory, type NexWebPermissions, type WebAddress,
} from '@eclipsis/components';
import { NexIconButton } from './button.tsx';
import { NexIcon } from './icon.tsx';

export type NexPortalMode = 'embedded' | 'browser' | 'sandbox';

export type NexPortalStatus =
  | { phase: 'empty' }
  | { phase: 'loading'; url?: string }
  /** El frame terminó de cargar ALGO. Con otro origen no se puede saber si es la página o un aviso de bloqueo. */
  | { phase: 'loaded'; url?: string }
  /** Sigue cargando más de `slowAfter`. Puede ser lentitud o un sitio que no se deja incrustar. */
  | { phase: 'slow'; url?: string }
  | { phase: 'error'; reason: 'invalid' | 'unsafe-scheme' | 'offline'; input?: string };

export interface NexPortalConsoleEntry {
  level: 'log' | 'info' | 'warn' | 'error';
  text: string;
}

export interface NexPortalProps {
  /** Nombre accesible de la superficie y título del iframe. Obligatorio. */
  label: string;
  mode?: NexPortalMode;
  defaultMode?: NexPortalMode;
  onModeChange?: (mode: NexPortalMode) => void;
  /** embedded/browser: dirección cargada (controlada). */
  url?: string;
  defaultUrl?: string;
  /** Al abrir una dirección desde la barra (o atrás/adelante). */
  onNavigate?: (url: string) => void;
  /** sandbox: el código propio. */
  html?: string;
  css?: string;
  javascript?: string;
  /** sandbox: consola del documento aislado. */
  onConsole?: (entry: NexPortalConsoleEntry) => void;
  /** Capacidades concedidas. Por defecto, las mínimas de cada modo. */
  permissions?: NexWebPermissions;
  /** Alto de la superficie (número en px o longitud CSS). */
  height?: number | string;
  /** Alto al ampliar una referencia a navegador. */
  expandedHeight?: number | string;
  /** embedded: ofrece ampliar a navegador (y volver). Por defecto, sí. */
  expandable?: boolean;
  /** browser: mostrar la barra. Por defecto, sí. */
  showToolbar?: boolean;
  /** Cuándo avisar de que una página tarda (ms). */
  slowAfter?: number;
  referrerPolicy?: HTMLAttributeReferrerPolicy;
  onStatusChange?: (status: NexPortalStatus) => void;
  /** Contenido propio en la barra (a la derecha), p. ej. un selector de dispositivo. */
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const length = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);
const hostOf = (url?: string) => { try { return url ? new URL(url).host : ''; } catch { return ''; } };
const token = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
const ERRORS: Record<'invalid' | 'unsafe-scheme' | 'offline', string> = {
  invalid: 'No es una dirección web. Prueba con algo como ejemplo.org.',
  'unsafe-scheme': 'Sólo se abren direcciones http y https.',
  offline: 'Sin conexión. La página se cargará cuando vuelva la red.',
};

export function NexPortal({
  label, mode: controlledMode, defaultMode = 'embedded', onModeChange, url: controlledUrl, defaultUrl, onNavigate,
  html, css, javascript, onConsole, permissions, height = 420, expandedHeight = 'min(78vh, 760px)', expandable = true,
  showToolbar = true, slowAfter = 12000, referrerPolicy = 'strict-origin-when-cross-origin', onStatusChange, actions, className, style,
}: NexPortalProps) {
  const [innerMode, setInnerMode] = useState(defaultMode);
  const mode = controlledMode ?? innerMode;
  const setMode = (next: NexPortalMode) => { if (controlledMode === undefined) setInnerMode(next); onModeChange?.(next); };
  // Se amplió desde una referencia: «Reducir» la devuelve.
  const [expandedFrom, setExpandedFrom] = useState(false);

  const base = typeof location === 'undefined' ? undefined : location.href;
  const resolve = useCallback((input: string | undefined): WebAddress => resolveWebAddress(input ?? '', base), [base]);
  const [history, setHistory] = useState<NavHistory>(() => {
    const first = resolve(controlledUrl ?? defaultUrl);
    return navHistoryStart(first.ok ? first.url : undefined);
  });
  // Una `url` recibida que no se puede abrir: la superficie lo muestra en vez de la página.
  const [rejected, setRejected] = useState<{ reason: 'invalid' | 'unsafe-scheme'; input: string } | null>(() => {
    const raw = controlledUrl ?? defaultUrl;
    const r = raw ? resolve(raw) : null;
    return r && !r.ok && r.reason !== 'empty' ? { reason: r.reason, input: raw! } : null;
  });
  // Lo escrito en la barra que no se puede abrir: sólo se marca el campo; la página cargada sigue.
  const [typedError, setTypedError] = useState<'invalid' | 'unsafe-scheme' | null>(null);
  // Lo controlado manda: si cambia `url`, entra en el historial.
  useEffect(() => {
    if (controlledUrl === undefined) return;
    const r = resolve(controlledUrl);
    if (r.ok) { setRejected(null); setHistory((h) => navHistoryPush(h, r.url)); }
    else if (r.reason !== 'empty') setRejected({ reason: r.reason, input: controlledUrl });
  }, [controlledUrl, resolve]);
  const current = history.entries[history.index];
  const [address, setAddress] = useState(current ?? controlledUrl ?? defaultUrl ?? '');
  useEffect(() => { setAddress(current ?? ''); }, [current]);

  // ---- Fuente del frame -----------------------------------------------------------
  const sandboxed = mode === 'sandbox';
  const session = useMemo(() => token(), [html, css, javascript, sandboxed]); // eslint-disable-line react-hooks/exhaustive-deps
  const srcDoc = useMemo(
    () => (sandboxed ? sandboxDocument({ html, css, javascript, token: session, network: permissions?.network }) : undefined),
    [sandboxed, html, css, javascript, session, permissions?.network],
  );
  const sameOrigin = !sandboxed && current !== undefined && typeof location !== 'undefined' && hostOf(current) === location.host && new URL(current).protocol === location.protocol;
  const sandbox = sandboxed
    ? frameSandbox(permissions ?? SANDBOX_PERMISSIONS, 'code')
    : frameSandbox(permissions ?? WEB_PAGE_PERMISSIONS, 'page', sameOrigin);

  // ---- Estado de carga --------------------------------------------------------------
  const frame = useRef<HTMLIFrameElement>(null);
  const [status, setStatusState] = useState<NexPortalStatus>({ phase: 'empty' });
  const report = useRef(onStatusChange);
  report.current = onStatusChange;
  const setStatus = useCallback((s: NexPortalStatus) => { setStatusState(s); report.current?.(s); }, []);
  const slowTimer = useRef(0);
  const loadKey = sandboxed ? `doc:${session}` : `url:${current ?? ''}`;
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    window.clearTimeout(slowTimer.current);
    if (!sandboxed && rejected) { setStatus({ phase: 'error', reason: rejected.reason, input: rejected.input }); return; }
    if (!sandboxed && !current) { setStatus({ phase: 'empty' }); return; }
    if (!sandboxed && typeof navigator !== 'undefined' && navigator.onLine === false) { setStatus({ phase: 'error', reason: 'offline', input: current }); return; }
    setStatus({ phase: 'loading', url: current });
    if (!sandboxed) slowTimer.current = window.setTimeout(() => setStatus({ phase: 'slow', url: current }), slowAfter);
    return () => window.clearTimeout(slowTimer.current);
  }, [loadKey, reloads, rejected, slowAfter]); // eslint-disable-line react-hooks/exhaustive-deps

  const onLoad = () => {
    window.clearTimeout(slowTimer.current);
    if (sandboxed || current) setStatus({ phase: 'loaded', url: current });
  };

  // ---- Puente del sandbox -------------------------------------------------------------
  const consoleRef = useRef(onConsole);
  consoleRef.current = onConsole;
  useEffect(() => {
    if (!sandboxed) return;
    const listen = (event: MessageEvent) => {
      // Tres comprobaciones: viene de NUESTRO frame, con el token de ESTA sesión y con una forma conocida.
      if (event.source !== frame.current?.contentWindow) return;
      if (!isPortalMessage(event.data, session)) return;
      consoleRef.current?.({ level: event.data.level, text: event.data.text });
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, [sandboxed, session]);

  // ---- Navegación -------------------------------------------------------------------
  const notify = useRef(onNavigate);
  notify.current = onNavigate;
  const open = (input: string) => {
    const r = resolve(input);
    if (!r.ok) {
      if (r.reason !== 'empty') setTypedError(r.reason);
      return;
    }
    setTypedError(null);
    setRejected(null);
    if (r.url === current) { reload(); return; }
    setHistory((h) => navHistoryPush(h, r.url));
    notify.current?.(r.url);
  };
  const go = (step: -1 | 1) => {
    const next = navHistoryGo(history, step);
    if (next === history) return;
    setTypedError(null);
    setRejected(null);
    setHistory(next);
    notify.current?.(next.entries[next.index]!);
  };
  const reload = () => {
    const el = frame.current;
    if (!el) return;
    // Vuelve a pedir la ÚLTIMA dirección que conocemos (la de dentro no es visible con otro origen).
    if (sandboxed) el.srcdoc = srcDoc ?? '';
    else if (current) el.src = current;
    setReloads((n) => n + 1);
  };

  const id = useId();
  const statusId = `${id}-status`;
  const host = hostOf(current);
  const showBar = mode === 'browser' && showToolbar;
  const stageHeight = mode === 'browser' && expandedFrom ? expandedHeight : height;
  const external = current && !sandboxed ? (
    <a className="nx-portal__external" href={current} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${host || 'la página'} en otra pestaña`} title="Abrir en otra pestaña">
      <NexIcon name="external" />
    </a>
  ) : null;

  const message = (() => {
    if (status.phase === 'error') return ERRORS[status.reason];
    if (status.phase === 'slow') return `${host || 'La página'} tarda en responder. Algunos sitios no permiten mostrarse dentro de otras páginas; si no aparece, ábrelo en otra pestaña.`;
    if (status.phase === 'empty') return sandboxed ? 'Sin contenido.' : mode === 'browser' ? 'Escribe una dirección para empezar.' : 'Sin dirección.';
    return null;
  })();
  const announce = typedError ? ERRORS[typedError] : status.phase === 'loading' ? `Cargando ${sandboxed ? 'el resultado' : host || 'la página'}…` : status.phase === 'loaded' ? 'Carga terminada.' : message ?? '';

  return (
    <section
      className={cx('nx-portal', className)}
      aria-label={label}
      aria-busy={status.phase === 'loading' || status.phase === 'slow' ? true : undefined}
      data-mode={mode}
      data-phase={status.phase}
      data-expanded={mode === 'browser' && expandedFrom ? '' : undefined}
      style={{ ...style, '--nx-portal-height': length(stageHeight) } as CSSProperties}
    >
      {showBar && (
        <form
          className="nx-portal__bar"
          aria-label={`Navegación de ${label}`}
          onSubmit={(e) => { e.preventDefault(); open(address); }}
        >
          <div className="nx-portal__nav">
            <NexIconButton type="button" density="compact" label="Dirección anterior" icon={<NexIcon name="arrow-left" />} disabled={history.index <= 0} onClick={() => go(-1)} />
            <NexIconButton type="button" density="compact" label="Dirección siguiente" icon={<NexIcon name="arrow-right" />} disabled={history.index >= history.entries.length - 1} onClick={() => go(1)} />
            <NexIconButton type="button" density="compact" label="Volver a cargar" icon={<NexIcon name="reload" />} disabled={!current} onClick={reload} />
          </div>
          <label className="nx-portal__address">
            <span className="nx-visually-hidden">Dirección</span>
            <NexIcon name="globe" />
            <input
              type="text"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="go"
              value={address}
              placeholder="ejemplo.org"
              aria-invalid={typedError ? true : undefined}
              aria-describedby={statusId}
              onChange={(e) => { setAddress(e.target.value); setTypedError(null); }}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => { if (e.key === 'Escape') { setAddress(current ?? ''); setTypedError(null); } }}
            />
          </label>
          <div className="nx-portal__nav">
            {actions}
            {external}
            {expandable && expandedFrom && (
              <NexIconButton type="button" density="compact" label="Reducir a referencia" icon={<NexIcon name="shrink" />} onClick={() => { setExpandedFrom(false); setMode('embedded'); }} />
            )}
          </div>
        </form>
      )}
      <div className="nx-portal__stage">
        {status.phase === 'loading' && <span className="nx-portal__progress" aria-hidden="true" />}
        {/* El iframe ocupa SIEMPRE este sitio del árbol: cambiar de presentación no lo recarga. */}
        <iframe
          ref={frame}
          className="nx-portal__frame"
          title={label}
          sandbox={sandbox}
          src={!sandboxed && !rejected ? current : undefined}
          srcDoc={srcDoc}
          allow=""
          referrerPolicy={referrerPolicy}
          hidden={!sandboxed && (!current || Boolean(rejected))}
          onLoad={onLoad}
        />
        {message && (
          <div className="nx-portal__notice" data-tone={status.phase === 'error' ? 'danger' : status.phase === 'slow' ? 'warning' : 'neutral'}>
            <p>{message}</p>
            {status.phase === 'slow' && (
              <div className="nx-portal__notice-actions">
                {external && <a className="nx-portal__link" href={current} target="_blank" rel="noopener noreferrer">Abrir en otra pestaña</a>}
                <button type="button" className="nx-portal__link" onClick={reload}>Reintentar</button>
              </div>
            )}
          </div>
        )}
        {mode === 'embedded' && (current || rejected) && (
          <div className="nx-portal__chrome">
            {host && <span className="nx-portal__host" title={current}>{host}</span>}
            {external}
            {expandable && (
              <NexIconButton type="button" density="compact" label="Ampliar a navegador" icon={<NexIcon name="expand" />} onClick={() => { setExpandedFrom(true); setMode('browser'); }} />
            )}
          </div>
        )}
        {mode === 'sandbox' && (
          <div className="nx-portal__chrome">
            <span className="nx-portal__host">Aislado</span>
            <NexIconButton type="button" density="compact" label="Ejecutar de nuevo" icon={<NexIcon name="reload" />} onClick={reload} />
          </div>
        )}
      </div>
      <p id={statusId} className="nx-visually-hidden" role="status">{announce}</p>
    </section>
  );
}
