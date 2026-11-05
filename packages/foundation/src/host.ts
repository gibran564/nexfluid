/**
 * Contraste de un tema anfitrión a través del puente de compatibilidad.
 *
 * El adaptador `nextudio` (y cualquier otro puente `var(--x, respaldo)`) no
 * trae colores propios: lee los de la aplicación. Los temas nativos se prueban
 * en este repositorio, pero los del anfitrión sólo se pueden medir con sus
 * valores. Esta función resuelve cada rol con las variables del anfitrión y
 * aplica los mismos `CONTRAST_REQUIREMENTS` que a un tema nativo.
 *
 * Puro y sin conocimiento del anfitrión: recibe las variables ya leídas.
 */
import { CONTRAST_REQUIREMENTS, COLOR_ROLES, contrastRatio, type ColorRole } from './tokens.ts';

export interface HostContrastFailure {
  pair: readonly [ColorRole, ColorRole];
  ratio: number;
  min: number;
  why: string;
}

export interface HostContrastResult {
  /** Rol → color resuelto (variable del anfitrión o respaldo del puente). */
  resolved: Record<ColorRole, string>;
  /** Roles que no se pudieron medir (sin color hexadecimal tras resolver). */
  unmeasured: ColorRole[];
  failures: HostContrastFailure[];
}

const BRIDGE_VALUE = /^var\((--[\w-]+),\s*(.+)\)$/;

/** Resuelve `var(--x, respaldo)` con las variables del anfitrión. */
export function resolveBridge(bridge: Record<ColorRole, string>, hostVars: Readonly<Record<string, string>>): Record<ColorRole, string> {
  return Object.fromEntries(COLOR_ROLES.map((role) => {
    const value = bridge[role];
    const match = BRIDGE_VALUE.exec(value);
    return [role, match ? (hostVars[match[1]!]?.trim() || match[2]!.trim()) : value];
  })) as Record<ColorRole, string>;
}

/** Aplica `CONTRAST_REQUIREMENTS` a un tema anfitrión visto a través de un puente. */
export function hostContrast(bridge: Record<ColorRole, string>, hostVars: Readonly<Record<string, string>>): HostContrastResult {
  const resolved = resolveBridge(bridge, hostVars);
  const hex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
  const unmeasured = new Set<ColorRole>();
  const failures: HostContrastFailure[] = [];
  for (const [a, b, min, why] of CONTRAST_REQUIREMENTS) {
    if (!hex(resolved[a])) { unmeasured.add(a); continue; }
    if (!hex(resolved[b])) { unmeasured.add(b); continue; }
    const ratio = contrastRatio(resolved[a], resolved[b]);
    if (ratio < min) failures.push({ pair: [a, b], ratio, min, why });
  }
  return { resolved, unmeasured: [...unmeasured], failures };
}

/** Lee las propiedades `--x: valor;` de un bloque CSS cuyo selector empieza exactamente por `selector`. */
export function readCssVariables(css: string, selector: string): Record<string, string> {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const at = clean.indexOf(`${selector} {`);
  if (at < 0) throw new Error(`No se encontró el bloque ${selector}`);
  const body = clean.slice(clean.indexOf('{', at) + 1, clean.indexOf('}', at));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}
