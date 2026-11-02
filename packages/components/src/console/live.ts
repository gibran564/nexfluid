/**
 * NexLiveSession: el contrato de una sesión que sigue viva.
 *
 * NexFluidUI no ejecuta procesos: la aplicación (Nextudio, un servidor PTY…)
 * produce eventos y recibe entrada a través de un transporte. Aquí sólo hay
 * tipos, capacidades y un almacén que ordena y acota lo recibido.
 *
 * Tres clases de sesión, con capacidades distintas (no todas admiten lo mismo):
 * - `run`: una ejecución; stdin se entrega antes de empezar.
 * - `interactive`: un programa vivo que pide entrada línea a línea (lo que
 *   Nextudio ya tiene: Pyodide, webR…).
 * - `pty`: una terminal real (futura). Su salida es un flujo de bytes con
 *   secuencias ANSI/VT que SÓLO interpreta un emulador auténtico; aquí no se
 *   analiza ni se convierte en estructuras.
 */
import type { NexConsoleOutput, NexConsoleState } from './types.ts';

export type NexSessionKind = 'run' | 'interactive' | 'pty';
export type NexSessionConnection = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface NexSessionCapabilities {
  /** Escribir mientras corre. */
  input: boolean;
  /** Entrada anticipada (antes de que se pida). */
  earlyInput: boolean;
  interrupt: boolean;
  /** Cerrar la sesión (distinto de interrumpir lo que corre). */
  close: boolean;
  reconnect: boolean;
  /** Enviar cambios de tamaño (columnas × filas). */
  resize: boolean;
  /** La salida es una pantalla (cursor, regiones): requiere un emulador. */
  screen: boolean;
}

export const SESSION_CAPABILITIES: Readonly<Record<NexSessionKind, NexSessionCapabilities>> = {
  run: { input: false, earlyInput: true, interrupt: true, close: false, reconnect: false, resize: false, screen: false },
  interactive: { input: true, earlyInput: true, interrupt: true, close: true, reconnect: false, resize: false, screen: false },
  pty: { input: true, earlyInput: true, interrupt: true, close: true, reconnect: true, resize: true, screen: true },
};

type Unsequenced<T> = T extends NexConsoleOutput ? Omit<T, 'seq'> & { seq?: number } : never;

export type NexSessionEvent =
  /** Una salida completa (texto, tabla, JSON, imagen…): se AÑADE al historial. */
  | { type: 'output'; output: Unsequenced<NexConsoleOutput> }
  /** Un fragmento de texto: ACTUALIZA la región activa de su canal (o la abre). */
  | { type: 'chunk'; stream: 'stdout' | 'stderr'; text: string }
  /** Cierra la región activa: a partir de aquí es historial estable. */
  | { type: 'flush' }
  | { type: 'state'; state: NexConsoleState }
  | { type: 'connection'; connection: NexSessionConnection }
  /** Flujo crudo de una terminal (PTY). No se interpreta: lo consume un emulador. */
  | { type: 'bytes'; data: string }
  | { type: 'exit'; state: NexConsoleState; code?: number };

export interface NexSessionSnapshot {
  id: string;
  kind: NexSessionKind;
  capabilities: NexSessionCapabilities;
  connection: NexSessionConnection;
  state: NexConsoleState;
  /** Historial ordenado. Las salidas anteriores conservan su identidad entre instantáneas. */
  outputs: readonly NexConsoleOutput[];
  /** Salidas antiguas descartadas por el límite de memoria. */
  dropped: number;
  exitCode?: number;
  /** Versión del flujo de bytes (para un emulador que lee de `takeBytes`). */
  bytes: number;
}

/** Lo que la aplicación ofrece para hablar con el proceso. Sólo lo que su clase admite. */
export interface NexSessionTransport {
  /** Entrega lo escrito (una línea, varias pegadas, o datos crudos en un PTY). `false` si no se aceptó. */
  send: (data: string) => boolean;
  interrupt?: () => void;
  close?: () => void;
  reconnect?: () => void;
  resize?: (size: { columns: number; rows: number }) => void;
}

/**
 * Un emulador de terminal auténtico (p. ej. xterm.js), conectado por la
 * aplicación. NexConsole le presta una superficie; él pinta la pantalla.
 */
export interface NexTerminalEmulator {
  mount: (element: HTMLElement) => void;
  write: (data: string) => void;
  /** Lo que se teclea en la terminal (va al transporte). Devuelve cómo dejar de escuchar. */
  onData: (listener: (data: string) => void) => () => void;
  fit?: () => { columns: number; rows: number } | null;
  focus?: () => void;
  dispose: () => void;
}

export interface NexSessionStoreOptions {
  id: string;
  kind: NexSessionKind;
  /** Máximo de salidas en memoria (se descartan las más antiguas). Por defecto 5 000. */
  maxOutputs?: number;
  /** Máximo de caracteres de una región de texto activa antes de cerrarla. Por defecto 64 000. */
  maxRegionChars?: number;
  /** Máximo de bytes de terminal retenidos para un emulador que se monta tarde. Por defecto 1 MB. */
  maxBytes?: number;
}

export interface NexSessionStore {
  getSnapshot: () => NexSessionSnapshot;
  subscribe: (listener: () => void) => () => void;
  /** Aplica un evento (o varios, en una sola notificación). */
  apply: (events: NexSessionEvent | readonly NexSessionEvent[]) => void;
  /** Bytes de terminal desde una posición (para un emulador). */
  takeBytes: (from?: number) => { data: string; next: number };
  reset: () => void;
}

/**
 * Almacén de una sesión: ordena por llegada (`seq` propio si el evento no lo
 * trae), acota la memoria y distingue AÑADIR (una salida nueva, el historial
 * crece) de ACTUALIZAR (la región de texto activa recibe otro fragmento: se
 * sustituye sólo ese último elemento). Lo anterior conserva su identidad, así
 * que una vista puede memoizar todo menos la región activa.
 */
export function createSessionStore({ id, kind, maxOutputs = 5000, maxRegionChars = 64_000, maxBytes = 1_000_000 }: NexSessionStoreOptions): NexSessionStore {
  const initial = (): NexSessionSnapshot => ({ id, kind, capabilities: SESSION_CAPABILITIES[kind], connection: 'connecting', state: 'idle', outputs: [], dropped: 0, bytes: 0 });
  let snap = initial();
  let seq = 0;
  let bytes = '';
  let bytesBase = 0;
  const listeners = new Set<() => void>();

  const closeActive = (outputs: NexConsoleOutput[]) => {
    const last = outputs.at(-1);
    if (last && (last.stream === 'stdout' || last.stream === 'stderr') && last.open) outputs[outputs.length - 1] = { ...last, open: undefined };
  };

  const step = (s: NexSessionSnapshot, event: NexSessionEvent): NexSessionSnapshot => {
    switch (event.type) {
      case 'output': {
        const outputs = [...s.outputs];
        closeActive(outputs);
        const o = { ...event.output, seq: event.output.seq ?? seq } as NexConsoleOutput;
        seq = Math.max(seq, o.seq) + 1;
        outputs.push(o);
        return trim({ ...s, outputs });
      }
      case 'chunk': {
        if (!event.text) return s;
        const outputs = [...s.outputs];
        const last = outputs.at(-1);
        if (last && last.stream === event.stream && last.open && last.text.length + event.text.length <= maxRegionChars) {
          outputs[outputs.length - 1] = { ...last, text: last.text + event.text };
          return { ...s, outputs };
        }
        closeActive(outputs);
        outputs.push({ seq: seq++, stream: event.stream, text: event.text, open: true });
        return trim({ ...s, outputs });
      }
      case 'flush': {
        const outputs = [...s.outputs];
        closeActive(outputs);
        return { ...s, outputs };
      }
      case 'state': return { ...s, state: event.state };
      case 'connection': return { ...s, connection: event.connection };
      case 'bytes': {
        bytes += event.data;
        if (bytes.length > maxBytes) { bytesBase += bytes.length - maxBytes; bytes = bytes.slice(-maxBytes); }
        return { ...s, bytes: bytesBase + bytes.length };
      }
      case 'exit': {
        const outputs = [...s.outputs];
        closeActive(outputs);
        return { ...s, outputs, state: event.state, exitCode: event.code };
      }
    }
  };

  const trim = (s: NexSessionSnapshot): NexSessionSnapshot => {
    const extra = s.outputs.length - maxOutputs;
    return extra > 0 ? { ...s, outputs: s.outputs.slice(extra), dropped: s.dropped + extra } : s;
  };

  return {
    getSnapshot: () => snap,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    apply: (events) => {
      const list = Array.isArray(events) ? events : [events as NexSessionEvent];
      const next = list.reduce(step, snap);
      if (next === snap) return;
      snap = next;
      listeners.forEach((l) => l());
    },
    takeBytes: (from = bytesBase) => ({ data: bytes.slice(Math.max(0, from - bytesBase)), next: bytesBase + bytes.length }),
    reset: () => { snap = initial(); seq = 0; bytes = ''; bytesBase = 0; listeners.forEach((l) => l()); },
  };
}
