import { useId, type ReactNode } from 'react';
import { Fragment } from 'react';
import { NexBadge, NexCodeBlock, NexPreviewBoundary } from '@nexfluid/react';

// ------------------------------------------------------------------ controles

export type Control =
  | { kind: 'select'; name: string; label: string; options: readonly string[]; initial: string }
  | { kind: 'boolean'; name: string; label: string; initial: boolean }
  | { kind: 'text'; name: string; label: string; initial: string }
  | { kind: 'number'; name: string; label: string; initial: number; min: number; max: number; step: number };

export type Values = Record<string, string | boolean | number>;

export function initialValues(controls: readonly Control[]): Values {
  return Object.fromEntries(controls.map((c) => [c.name, c.initial]));
}

/** Panel de propiedades de una demostración. Controles nativos: no simula componentes que aún no existen. */
export function ControlPanel({ controls, values, onChange, onReset }: { controls: readonly Control[]; values: Values; onChange: (name: string, value: string | boolean | number) => void; onReset: () => void }) {
  const id = useId();
  return (
    <form className="doc-controls" onSubmit={(e) => e.preventDefault()} aria-label="Propiedades">
      <p className="nx-index">Propiedades</p>
      {controls.map((c) => {
        const fid = `${id}-${c.name}`;
        if (c.kind === 'boolean') {
          return (
            <label key={c.name} className="doc-field doc-field--check" htmlFor={fid}>
              <input id={fid} type="checkbox" checked={Boolean(values[c.name])} onChange={(e) => onChange(c.name, e.target.checked)} />
              <span>{c.label}</span>
              <code>{c.name}</code>
            </label>
          );
        }
        return (
          <div key={c.name} className="doc-field">
            <label htmlFor={fid}>
              <span>{c.label}</span>
              <code>{c.name}</code>
            </label>
            {c.kind === 'select' ? (
              <select id={fid} value={String(values[c.name])} onChange={(e) => onChange(c.name, e.target.value)}>
                {c.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : c.kind === 'number' ? (
              <div className="doc-range">
                <input id={fid} type="range" min={c.min} max={c.max} step={c.step} value={Number(values[c.name])} onChange={(e) => onChange(c.name, Number(e.target.value))} />
                <output htmlFor={fid}>{values[c.name]}</output>
              </div>
            ) : (
              <input id={fid} type="text" value={String(values[c.name])} onChange={(e) => onChange(c.name, e.target.value)} />
            )}
          </div>
        );
      })}
      <button type="button" className="doc-link-button" onClick={onReset}>Restablecer</button>
    </form>
  );
}

// ------------------------------------------------------------ código generado

type Prop = string | number | boolean | undefined | { code: string };

/** Genera JSX legible a partir de props; omite los valores por defecto que se le indiquen. */
export function jsx(name: string, props: Record<string, Prop>, children?: string | readonly string[], defaults: Record<string, Prop> = {}): string {
  const attrs = Object.entries(props)
    .filter(([k, v]) => v !== undefined && v !== '' && !(k in defaults && defaults[k] === v))
    .map(([k, v]) => {
      if (v === true) return k;
      if (typeof v === 'string') return `${k}="${v}"`;
      if (typeof v === 'object') return `${k}={${v!.code}}`;
      return `${k}={${v}}`;
    });
  const open = attrs.length === 0 ? `<${name}` : attrs.join(' ').length + name.length > 64 ? `<${name}\n  ${attrs.join('\n  ')}\n` : `<${name} ${attrs.join(' ')}`;
  const kids = typeof children === 'string' ? [children] : children ?? [];
  if (kids.length === 0) return `${open}${open.endsWith('\n') ? '' : ' '}/>`;
  const inline = kids.length === 1 && !kids[0]!.includes('\n') && kids[0]!.length < 40 && !open.endsWith('\n');
  if (inline) return `${open}>${kids[0]}</${name}>`;
  return `${open}>\n${kids.map((k) => k.replace(/^/gm, '  ')).join('\n')}\n</${name}>`;
}

export function importLine(names: readonly string[], from: string): string {
  return `import { ${names.join(', ')} } from '${from}';`;
}

// --------------------------------------------------------------- piezas de página

/**
 * Un identificador largo (NexMarkdownWidget) se parte por sus palabras y no
 * por cualquier letra: <wbr> antes de cada mayúscula interior.
 */
function breakableTitle(title: string): ReactNode {
  if (!/^[A-Za-z]{11,}$/.test(title)) return title;
  const parts = title.split(/(?=[A-Z])/);
  return parts.map((p, i) => <Fragment key={i}>{i > 0 && <wbr />}{p}</Fragment>);
}

export function PageHeader({ eyebrow, title, lead, meta }: { eyebrow: string; title: string; lead: ReactNode; meta?: ReactNode }) {
  const long = title.split(/\s+/).some((w) => w.length > 11);
  return (
    <header className="doc-page-header">
      <p className="nx-index">{eyebrow}</p>
      <h1 className="nx-type-display" data-long={long || undefined}>{breakableTitle(title)}</h1>
      <p className="doc-lead">{lead}</p>
      {meta && <div className="doc-meta">{meta}</div>}
    </header>
  );
}

export function Section({ title, id, children, lead, index }: { title: string; id?: string; lead?: ReactNode; index?: string; children: ReactNode }) {
  return (
    <section className="doc-section" aria-labelledby={id}>
      <div className="doc-section-head">
        {index && <p className="nx-index" aria-hidden="true"><b>{index}</b></p>}
        <h2 className="nx-type-title" id={id}>{title}</h2>
        {lead && <p className="doc-section-lead">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

export function Stage({ children, label, padded = true }: { children: ReactNode; label?: string; padded?: boolean }) {
  return (
    <NexPreviewBoundary className="doc-stage-boundary">
      <div className="doc-stage" data-padded={padded || undefined} role={label ? 'group' : undefined} aria-label={label}>
        {children}
      </div>
    </NexPreviewBoundary>
  );
}

export interface PropRow {
  name: string;
  type: string;
  default?: string;
  description: ReactNode;
}

export function PropsTable({ component, rows }: { component: string; rows: readonly PropRow[] }) {
  return (
    <div className="doc-table-wrap" role="region" aria-label={`Propiedades de ${component}`} tabIndex={0}>
      <table className="doc-table">
        <caption><code>{component}</code></caption>
        <thead>
          <tr><th scope="col">Propiedad</th><th scope="col">Tipo</th><th scope="col">Por defecto</th><th scope="col">Descripción</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <th scope="row"><code>{r.name}</code></th>
              <td><code className="doc-type">{r.type}</code></td>
              <td>{r.default ? <code>{r.default}</code> : <span className="doc-muted">—</span>}</td>
              <td>{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function KeyboardTable({ rows }: { rows: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div className="doc-table-wrap">
      <table className="doc-table">
        <thead><tr><th scope="col">Tecla</th><th scope="col">Acción</th></tr></thead>
        <tbody>
          {rows.map(([k, a]) => (
            <tr key={k}><td>{k.split(' + ').map((p, i) => <span key={p}>{i > 0 && ' + '}<kbd>{p}</kbd></span>)}</td><td>{a}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Ejemplo vivo + su código fuente real (el archivo que se importa, leído con `?raw`). */
export function LiveExample({ title, description, source, children, level = 3 }: { title: string; description?: ReactNode; source: string; children: ReactNode; level?: 2 | 3 }) {
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <article className="doc-example">
      <header className="doc-example-head">
        <Heading className="nx-type-heading">{title}</Heading>
        {description && <p className="doc-muted">{description}</p>}
      </header>
      <Stage>{children}</Stage>
      <NexCodeBlock code={source.trim()} language="tsx" title={`${title} · código`} maxHeight={420} showLineNumbers />
    </article>
  );
}

export function Status({ value }: { value: 'piloto' | 'propuesto' | 'laboratorio' | 'existente' }) {
  const map = {
    piloto: { tone: 'success', text: 'Implementado · piloto' },
    laboratorio: { tone: 'accent', text: 'Laboratorio' },
    propuesto: { tone: 'neutral', text: 'Propuesto' },
    existente: { tone: 'warning', text: 'Existe en Nextudio' },
  } as const;
  const s = map[value];
  return <NexBadge tone={s.tone} dot>{s.text}</NexBadge>;
}
