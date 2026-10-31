/**
 * Serialización JSON del libro. Lo que entra se valida: un archivo ajeno no
 * puede colar celdas fuera de la rejilla, ids repetidos ni tamaños imposibles.
 */
import { DEFAULT_SHEET_LIMITS, type SheetLimits } from './limits.ts';
import type { Workbook } from './types.ts';
import { validateWorkbook } from './workbook.ts';

export class WorkbookRejected extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`Libro no válido: ${problems.join('; ')}`);
    this.problems = problems;
    this.name = 'WorkbookRejected';
  }
}

export function serializeWorkbook(workbook: Workbook): string {
  return JSON.stringify(workbook);
}

export function parseWorkbook(json: string, limits: SheetLimits = DEFAULT_SHEET_LIMITS): Workbook {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new WorkbookRejected(['no es JSON']);
  }
  if (!data || typeof data !== 'object' || !Array.isArray((data as Workbook).sheets)) throw new WorkbookRejected(['falta la lista de hojas']);
  const workbook = data as Workbook;
  const problems = validateWorkbook(workbook, limits);
  if (problems.length) throw new WorkbookRejected(problems);
  return workbook;
}
